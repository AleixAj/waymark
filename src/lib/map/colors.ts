// MapLibre can't read CSS variables or oklch(), so we turn the design tokens
// into rgba() strings by painting them on a 1x1 canvas and reading the pixel back.

type RGBA = [number, number, number, number];

let ctx: CanvasRenderingContext2D | null = null;

function toRgba(cssColor: string): RGBA {
	ctx ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
	if (!ctx) return [0, 0, 0, 1];
	ctx.clearRect(0, 0, 1, 1);
	// An invalid color leaves fillStyle unchanged: detect it instead of painting the previous one
	const sentinel = '#010203';
	ctx.fillStyle = sentinel;
	ctx.fillStyle = cssColor;
	if (ctx.fillStyle === sentinel && cssColor.trim().toLowerCase() !== sentinel) return [0, 0, 0, 0];
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
	return [r, g, b, a / 255];
}

function toCss([r, g, b, a]: RGBA) {
	return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`;
}

/** Mixes two colors like CSS color-mix(): amount is how much of `b` to use */
export function mix(a: string, b: string, amount: number) {
	const ca = toRgba(a);
	const cb = toRgba(b);
	const out = ca.map((v, i) => (i < 3 ? Math.round(v + (cb[i] - v) * amount) : 1)) as RGBA;
	return toCss(out);
}

export interface MapColors {
	bg: string;
	ocean: string;
	land: string;
	trop: string;
	arid: string;
	boreal: string;
	polar: string;
	border: string;
	graticule: string;
	acc: string;
	halo: string;
}

/** Reads the current theme's map colors from the CSS variables */
export function readMapColors(): MapColors {
	const style = getComputedStyle(document.documentElement);
	const get = (name: string) => toCss(toRgba(style.getPropertyValue(name).trim()));
	return {
		bg: get('--bg'),
		ocean: get('--ocean'),
		land: get('--land'),
		trop: get('--land-trop'),
		arid: get('--land-arid'),
		boreal: get('--land-boreal'),
		polar: get('--land-polar'),
		border: get('--border-geo'),
		graticule: get('--graticule'),
		acc: get('--acc'),
		halo: get('--halo')
	};
}
