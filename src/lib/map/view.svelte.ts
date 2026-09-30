import { LngLatBounds } from 'maplibre-gl';
import type { LngLatBoundsLike, LngLatLike, MapLibreMap, PaddingOptions } from 'maplibre-gl';
import { settings } from '$lib/state/settings.svelte';
import { ui } from '$lib/state/ui.svelte';
import { countries } from '$lib/state/countries.svelte';
import type { Stop } from '$lib/library/trips';
import type { Area } from '$lib/library/areas';
import type { LocatedPoint } from '$lib/photos/types';
import { zoomForOutline } from './globe';
import { pointsBounds } from './bounds';

const WORLD_CENTER: [number, number] = [-24, 36];
const WELCOME_CENTER: [number, number] = [-20, 18];
const FLIGHT_MS = 1200;
// Space left around the photos when the camera frames them
const MARGIN = 24;

/** Zoom that makes the globe outline a share of the window height, like in the design */
export function zoomForGlobe(heightShare: number, lat: number) {
	// On narrow screens the width limits it too (the globe may bleed a little, like the design)
	const outline = Math.max(
		150,
		Math.min(window.innerHeight * heightShare, window.innerWidth * 0.6)
	);
	return zoomForOutline(outline, lat, window.innerHeight);
}

/**
 * What the map should show right now. Pages change it (focus a country, draw
 * a trip route...) and the map component reacts. Camera moves go through here
 * so "reduce motion" is respected everywhere.
 */
class MapView {
	map = $state.raw<MapLibreMap | null>(null);
	/** Country highlighted in the country view */
	focus = $state<string | null>(null);
	/** Trip route drawn on the map */
	route = $state.raw<Stop[] | null>(null);
	activeStop = $state<number | null>(null);
	/** Neighbourhoods drawn in the city view, and the one selected */
	areas = $state.raw<Area[] | null>(null);
	activeArea = $state<string | null>(null);
	/** Space covered by floating panels, so the camera centers in what's visible */
	padding = $state<PaddingOptions>({ top: 90, bottom: 110, left: 350, right: 90 });
	zoom = $state(2);
	/** Photos drawn as markers; null means "everything visible in the timeline" */
	points = $state.raw<LocatedPoint[] | null>(null);
	/** City names under the clusters */
	labels = $state(false);
	/** Goes up every time a new map style is ready (custom layers must be added again) */
	styleVersion = $state(0);
	/** Camera kept while the map is rebuilt (quality setting) */
	savedCamera: { center: [number, number]; zoom: number } | null = null;

	private get duration() {
		return settings.reducedMotion ? 0 : FLIGHT_MS;
	}

	/**
	 * Padding really used by the camera: on phones the panels are bottom sheets.
	 * The same object is kept while the numbers don't change, so pages that
	 * re-frame the map when it changes don't move the camera for nothing
	 * (e.g. when the zone panel opens over a panel of the same width).
	 */
	private lastPadding: PaddingOptions = { top: -1, bottom: -1, left: -1, right: -1 };
	private paddingNow = $derived.by(() => {
		let next: PaddingOptions;
		if (ui.viewportWidth < 768) {
			next = { top: 80, bottom: ui.sheetHeight + 16, left: 16, right: 16 };
		} else if (ui.zone) {
			// The zone panel covers the right side of the map
			next = { ...this.padding, right: Math.max(this.padding.right ?? 0, 470) };
		} else {
			next = this.padding;
		}
		const keys = ['top', 'bottom', 'left', 'right'] as const;
		if (keys.every((k) => next[k] === this.lastPadding[k])) return this.lastPadding;
		this.lastPadding = next;
		return next;
	});

	get cameraPadding(): PaddingOptions {
		return this.paddingNow;
	}

	flyTo(center: [number, number], zoom: number) {
		this.map?.flyTo({
			center,
			zoom,
			duration: this.duration,
			padding: this.cameraPadding,
			essential: true
		});
	}

	fitBounds(bounds: LngLatBoundsLike, maxZoom = 12) {
		if (!this.map) return;
		// MapLibre adds the fitBounds padding to the map's own padding,
		// so the panels go in the map padding and here only a small margin.
		// setPadding jumps the camera, so it's only called when the padding really changes.
		const padding = this.cameraPadding;
		const current = this.map.getPadding();
		const same = (['top', 'bottom', 'left', 'right'] as const).every(
			(k) => current[k] === padding[k]
		);
		if (!same) this.map.setPadding(padding);
		const camera = this.map.cameraForBounds(bounds, { padding: MARGIN, maxZoom });
		if (!camera?.center || camera.zoom === undefined) return;
		this.map.flyTo({
			center: camera.center,
			zoom: this.checkedZoom(camera.center, camera.zoom, LngLatBounds.convert(bounds)),
			duration: this.duration,
			essential: true
		});
	}

	/**
	 * On the globe MapLibre's fitting zoom can be too close (a trip from Zürich to
	 * Rome ended under the timeline). The camera is tried for a moment, without
	 * drawing, and zoomed out until the bounds really fit between the panels.
	 */
	private checkedZoom(center: LngLatLike, zoom: number, bounds: LngLatBounds) {
		const map = this.map!;
		const saved = { center: map.getCenter(), zoom: map.getZoom() };
		const { top = 0, bottom = 0, left = 0, right = 0 } = map.getPadding();
		const width = map.getCanvas().clientWidth - left - right - 2 * MARGIN;
		const height = map.getCanvas().clientHeight - top - bottom - 2 * MARGIN;
		const corners = [
			bounds.getSouthWest(),
			bounds.getNorthEast(),
			bounds.getNorthWest(),
			bounds.getSouthEast()
		];
		for (let attempt = 0; attempt < 3 && width > 0 && height > 0; attempt++) {
			map.jumpTo({ center, zoom });
			const pixels = corners.map((c) => map.project(c));
			const xs = pixels.map((p) => p.x);
			const ys = pixels.map((p) => p.y);
			const ratio = Math.max(
				(Math.max(...xs) - Math.min(...xs)) / width,
				(Math.max(...ys) - Math.min(...ys)) / height
			);
			if (ratio <= 1.02) break;
			zoom -= Math.log2(ratio);
		}
		map.jumpTo(saved);
		return zoom;
	}

	fitPoints(points: { lat: number; lng: number }[], maxZoom = 12) {
		if (points.length === 0) return;
		this.fitBounds(pointsBounds(points), maxZoom);
	}

	fitCountry(iso3: string) {
		const info = countries.info(iso3);
		if (!info) return;
		const [w, s, e, n] = info.bbox;
		// Low enough to see the neighbours, dimmed, like the design.
		// A country crossing the ±180° line has west > east: continue past 180 instead.
		this.fitBounds([w, s, w > e ? e + 360 : e, n], 5);
	}

	world() {
		// Phones show the globe smaller, above the bottom sheet
		const zoom = zoomForGlobe(ui.viewportWidth < 768 ? 0.3 : 0.433, WORLD_CENTER[1]);
		this.map?.flyTo({
			center: WORLD_CENTER,
			zoom,
			duration: this.duration,
			padding: this.cameraPadding
		});
	}

	/** Big spinning globe behind the welcome screen */
	welcome() {
		this.map?.jumpTo({
			center: WELCOME_CENTER,
			zoom: zoomForGlobe(0.478, WELCOME_CENTER[1]),
			padding: { top: 40, bottom: 0, left: 0, right: 0 }
		});
	}

	zoomBy(delta: number) {
		this.map?.easeTo({ zoom: (this.map.getZoom() ?? 0) + delta, duration: this.duration / 4 });
	}
}

export const mapView = new MapView();
