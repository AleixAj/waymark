import type { SkySpecification } from 'maplibre-gl';

// Free vector tiles, no API key needed. The colors will be tuned to match the design.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

export const PHOTO_SOURCE = 'photos';
export const ACCENT = '#f5a524';

export const INITIAL_VIEW = { center: [0, 25] as [number, number], zoom: 1.6 };

// Soft glow around the planet
export const SKY: SkySpecification = {
	'sky-color': '#070b14',
	'horizon-color': '#1b2a4a',
	'fog-color': '#070b14',
	'sky-horizon-blend': 0.6,
	'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0]
};
