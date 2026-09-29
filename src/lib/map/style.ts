import type {
	ExpressionSpecification,
	LayerSpecification,
	SkySpecification,
	StyleSpecification
} from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { MapStyle } from '$lib/state/settings.svelte';
import { mix, type MapColors } from './colors';
import { graticule } from './graticule';

// Raster basemaps for street level, the same ones the design mockups use
const TOPO_TILES =
	'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_TILES =
	'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION = 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors';

export const COUNTRY_SOURCE = 'countries';

export interface StyleOptions {
	colors: MapColors;
	countries: FeatureCollection;
	mapStyle: MapStyle;
	borders: boolean;
	dark: boolean;
}

/** Land color by biome; `amount` tints it with the accent (0 = plain land) */
function landColor(c: MapColors, amount: number): ExpressionSpecification {
	return [
		'match',
		['get', 'biome'],
		'trop',
		mix(c.trop, c.acc, amount),
		'arid',
		mix(c.arid, c.acc, amount),
		'boreal',
		mix(c.boreal, c.acc, amount),
		'polar',
		mix(c.polar, c.acc, amount),
		mix(c.land, c.acc, amount)
	];
}

/**
 * Country fill: visited countries get an amber tint. When a country is focused
 * (country view) it stays bright and the rest of the world fades out.
 */
export function countryPaint(c: MapColors, visited: string[], focus: string | null) {
	const isVisited: ExpressionSpecification = ['in', ['get', 'iso3'], ['literal', visited]];
	if (!focus) {
		return {
			color: ['case', isVisited, landColor(c, 0.58), landColor(c, 0)] as ExpressionSpecification,
			opacity: 1 as number | ExpressionSpecification
		};
	}
	const isFocus: ExpressionSpecification = ['==', ['get', 'iso3'], focus];
	return {
		color: [
			'case',
			isFocus,
			landColor(c, 0.14),
			isVisited,
			landColor(c, 0.3),
			landColor(c, 0)
		] as ExpressionSpecification,
		opacity: ['case', isFocus, 1, 0.42] as ExpressionSpecification
	};
}

/** How strong the street-level raster is at each zoom, per map style */
function rasterOpacity(mapStyle: MapStyle): number | ExpressionSpecification {
	if (mapStyle !== 'sobrio') return 1;
	return ['interpolate', ['linear'], ['zoom'], 5, 0, 7, 1];
}

/** The flat colored countries fade out when the street map takes over */
function vectorOpacity(mapStyle: MapStyle): number | ExpressionSpecification {
	if (mapStyle !== 'sobrio') return 0;
	return ['interpolate', ['linear'], ['zoom'], 5.5, 1, 7.5, 0];
}

export function sky(c: MapColors): SkySpecification {
	return {
		'sky-color': c.bg,
		'horizon-color': c.halo,
		'fog-color': c.bg,
		'sky-horizon-blend': 0.7,
		'horizon-fog-blend': 0.6,
		'fog-ground-blend': 0.8,
		// The halo is drawn by GlobeShade.svelte, closer to the design than MapLibre's atmosphere
		'atmosphere-blend': 0
	};
}

export function buildStyle({ colors: c, countries, mapStyle, borders, dark }: StyleOptions) {
	const paint = countryPaint(c, [], null);
	const rasterPaint = dark
		? { 'raster-brightness-max': 0.55, 'raster-contrast': 0.12, 'raster-saturation': 0.15 }
		: {};

	const layers: LayerSpecification[] = [
		{ id: 'ocean', type: 'background', paint: { 'background-color': c.ocean } },
		{
			id: 'graticule',
			type: 'line',
			source: 'graticule',
			maxzoom: 6,
			paint: { 'line-color': c.graticule, 'line-width': 0.6 }
		},
		{
			id: 'country-fill',
			type: 'fill',
			source: COUNTRY_SOURCE,
			paint: {
				'fill-color': paint.color,
				'fill-opacity': vectorOpacity(mapStyle),
				'fill-antialias': true
			}
		},
		{
			id: 'street-map',
			type: 'raster',
			source: mapStyle === 'satelite' ? 'satellite' : 'topo',
			// Don't download street tiles while they are invisible
			minzoom: mapStyle === 'sobrio' ? 4.8 : 0,
			paint: {
				'raster-opacity': rasterOpacity(mapStyle),
				'raster-fade-duration': 150,
				...rasterPaint
			}
		},
		{
			id: 'country-border',
			type: 'line',
			source: COUNTRY_SOURCE,
			layout: { visibility: borders ? 'visible' : 'none', 'line-join': 'round' },
			paint: {
				'line-color': c.border,
				'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 6, 1.2],
				'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 1, 8, 0]
			}
		},
		{
			id: 'country-focus',
			type: 'line',
			source: COUNTRY_SOURCE,
			filter: ['==', ['get', 'iso3'], ''],
			paint: { 'line-color': c.acc, 'line-width': 1.4, 'line-opacity': 0.9 }
		}
	];

	const style: StyleSpecification = {
		version: 8,
		projection: { type: 'globe' },
		sky: sky(c),
		sources: {
			[COUNTRY_SOURCE]: { type: 'geojson', data: countries, tolerance: 0.3 },
			graticule: { type: 'geojson', data: graticule() },
			topo: {
				type: 'raster',
				tiles: [TOPO_TILES],
				tileSize: 256,
				maxzoom: 19,
				attribution: ESRI_ATTRIBUTION
			},
			satellite: {
				type: 'raster',
				tiles: [SATELLITE_TILES],
				tileSize: 256,
				maxzoom: 19,
				attribution: ESRI_ATTRIBUTION
			}
		},
		layers
	};
	return style;
}
