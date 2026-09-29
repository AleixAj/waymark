import type { LngLatBoundsLike, MapLibreMap, PaddingOptions } from 'maplibre-gl';
import { geoBounds } from 'd3-geo';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { settings } from '$lib/state/settings.svelte';
import { ui } from '$lib/state/ui.svelte';
import { countries } from '$lib/state/countries.svelte';
import type { Stop } from '$lib/library/trips';
import type { LocatedPoint } from '$lib/photos/types';
import { zoomForOutline } from './globe';

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

	private get duration() {
		return settings.reducedMotion ? 0 : FLIGHT_MS;
	}

	/** Padding really used by the camera: on phones the panels are bottom sheets */
	get cameraPadding(): PaddingOptions {
		if (typeof window !== 'undefined' && window.innerWidth < 768) {
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
		// so the panels go in the map padding and here only a small margin
		this.map.setPadding(this.cameraPadding);
		this.map.fitBounds(bounds, { padding: 24, maxZoom, duration: this.duration });
	}

	fitPoints(points: { lat: number; lng: number }[], maxZoom = 12) {
		if (points.length === 0) return;
		let [w, s, e, n] = [180, 90, -180, -90];
		for (const p of points) {
			w = Math.min(w, p.lng);
			e = Math.max(e, p.lng);
			s = Math.min(s, p.lat);
			n = Math.max(n, p.lat);
		}
		this.fitBounds([w, s, e, n], maxZoom);
	}

	fitCountry(iso3: string) {
		const feature = countries.byIso3.get(iso3);
		if (!feature) return;
		const [[w, s], [e, n]] = geoBounds(mainland(feature));
		// Low enough to see the neighbours, dimmed, like the design
		this.fitBounds([w, s, e, n], 5);
	}

	world() {
		// Phones show the globe smaller, above the bottom sheet
		const zoom = zoomForGlobe(window.innerWidth < 768 ? 0.3 : 0.433, WORLD_CENTER[1]);
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

/**
 * Biggest polygon of a country. Framing the USA without Alaska or France
 * without its overseas islands gives a much better camera.
 */
function mainland(feature: Feature<Polygon | MultiPolygon>): Feature<Polygon> {
	const { geometry } = feature;
	if (geometry.type === 'Polygon') return feature as Feature<Polygon>;
	let best = geometry.coordinates[0];
	let bestSize = 0;
	for (const polygon of geometry.coordinates) {
		const ring = polygon[0];
		const size = ring.length;
		if (size > bestSize) {
			best = polygon;
			bestSize = size;
		}
	}
	return { ...feature, geometry: { type: 'Polygon', coordinates: best } };
}

export const mapView = new MapView();
