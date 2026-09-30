import { gray, mix, type MapColors } from './colors';
import t from '$lib/i18n/messages/map';

/** Color styles of the globe; "natural" is the one of the design */
export type Palette = 'natural' | 'gris' | 'noche' | 'atlas';

/** The color styles, with their names in the current language */
export function palettes(): { id: Palette; label: string; hint: string }[] {
	return [
		{ id: 'natural', label: t('natural'), hint: t('naturalHint') },
		{ id: 'gris', label: t('gris'), hint: t('grisHint') },
		{ id: 'noche', label: t('noche'), hint: t('nocheHint') },
		{ id: 'atlas', label: t('atlas'), hint: t('atlasHint') }
	];
}

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
