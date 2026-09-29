// Star field behind the globe. It is painted once into a small image that the
// browser repeats as a CSS background: it costs nothing while the globe moves.
const TILE = 768;
const STARS = 260;

let url: string | null = null;

/** Always the same sky: a tiny pseudo-random generator with a fixed seed */
function random(seed: number) {
	return () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
}

/** Data URL of the star tile, made the first time it is needed */
export function starfieldUrl() {
	if (url) return url;
	const canvas = document.createElement('canvas');
	canvas.width = TILE;
	canvas.height = TILE;
	const ctx = canvas.getContext('2d');
	if (!ctx) return '';
	const rnd = random(20260929);
	for (let i = 0; i < STARS; i++) {
		const x = rnd() * TILE;
		const y = rnd() * TILE;
		// Most stars are tiny and faint, a few are bigger and brighter
		const bright = rnd() ** 3;
		const radius = 0.35 + bright * 1.1;
		const alpha = 0.25 + bright * 0.65;
		// Some stars are slightly blue or warm, like real ones
		const tint = rnd();
		const color = tint < 0.15 ? '200, 215, 255' : tint > 0.9 ? '255, 230, 200' : '255, 255, 255';
		ctx.fillStyle = `rgba(${color}, ${alpha})`;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
	}
	url = canvas.toDataURL('image/png');
	return url;
}
