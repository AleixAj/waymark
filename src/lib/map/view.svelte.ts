import type { LngLatBoundsLike, MapLibreMap, PaddingOptions } from 'maplibre-gl';
import { settings } from '$lib/state/settings.svelte';
import { ui } from '$lib/state/ui.svelte';
import { countries } from '$lib/state/countries.svelte';
import type { Stop } from '$lib/library/trips';
import type { LocatedPoint } from '$lib/photos/types';
import { zoomForOutline } from './globe';
import { pointsBounds } from './bounds';

const WORLD_CENTER: [number, number] = [-24, 36];
const WELCOME_CENTER: [number, number] = [-20, 18];
const FLIGHT_MS = 1200;

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

	/** Padding really used by the camera: on phones the panels are bottom sheets */
	get cameraPadding(): PaddingOptions {
		if (ui.viewportWidth < 768) {
			return { top: 80, bottom: ui.sheetHeight + 16, left: 16, right: 16 };
		}
		return this.padding;
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
		this.map.fitBounds(bounds, { padding: 24, maxZoom, duration: this.duration });
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
