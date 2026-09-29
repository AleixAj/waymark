import { gray, mix, type MapColors } from './colors';

/** Color styles of the globe; "natural" is the one of the design */
export type Palette = 'natural' | 'gris' | 'noche' | 'atlas';

export const PALETTES: { id: Palette; label: string; hint: string }[] = [
	{ id: 'natural', label: 'Natural', hint: 'Relieve suave y tus países en ámbar' },
	{ id: 'gris', label: 'Gris', hint: 'El mundo en grises y tus países a color' },
	{ id: 'noche', label: 'Noche', hint: 'Tierra oscura y tus países iluminados' },
	{ id: 'atlas', label: 'Atlas', hint: 'Papel antiguo y tus países en terracota' }
];

export interface PaletteColors {
	ocean: string;
	/** Fill of a visited country, made from the land color of its biome */
	visited: (land: string) => string;
	/** Fill of the other countries */
	other: (land: string) => string;
	/** Outline of the visited countries */
	outline: string;
}

// Old atlas colors: parchment, faded sea and terracotta
const PAPER = '#e8dbbd';
const OLD_SEA = '#a7bfb8';
const TERRACOTTA = '#c2603a';

/** The colors of a palette, made from the theme colors so both themes work */
export function paletteColors(c: MapColors, palette: Palette): PaletteColors {
	switch (palette) {
		case 'gris':
			return {
				// A hint of blue keeps the sea apart from the land
				ocean: mix(gray(c.ocean), c.ocean, 0.15),
				// Visited countries keep their real colors, a bit brighter
				visited: (land) => mix(land, c.acc, 0.12),
				other: (land) => gray(mix(land, c.ocean, 0.2)),
				outline: c.acc
			};
		case 'noche':
			return {
				ocean: mix(c.ocean, c.bg, 0.65),
				visited: () => c.acc,
				other: (land) => mix(land, c.bg, 0.72),
				outline: mix(c.acc, '#ffffff', 0.35)
			};
		case 'atlas':
			return {
				ocean: mix(c.ocean, OLD_SEA, 0.8),
				visited: (land) => mix(land, TERRACOTTA, 0.8),
				other: (land) => mix(land, PAPER, 0.75),
				outline: mix(TERRACOTTA, '#000000', 0.25)
			};
		default:
			return {
				ocean: c.ocean,
				visited: (land) => mix(c.acc, land, 0.2),
				other: (land) => mix(land, c.ocean, 0.3),
				outline: c.acc
			};
	}
}
