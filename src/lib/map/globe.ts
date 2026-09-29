// Size of MapLibre's globe on screen. Used to draw the halo exactly on its edge
// and to pick the zoom that gives the globe size of the design.

const TILE = 512;
// MapLibre's default 36.87° field of view puts the camera 1.5 × the canvas height away
const CAMERA_FACTOR = 1.5;

/** Radius of the sphere in pixels (checked in the browser against map.project) */
export function sphereRadius(zoom: number, lat: number) {
	return (TILE * 2 ** zoom) / (2 * Math.PI * Math.cos((lat * Math.PI) / 180));
}

/**
 * Radius of the globe's outline on screen. The camera sees the edge of the sphere at
 * angle θ with sin θ = R / (camera + R); on the screen that is camera · tan θ.
 */
export function outlineRadius(sphere: number, canvasHeight: number) {
	const camera = CAMERA_FACTOR * canvasHeight;
	return (camera * sphere) / Math.sqrt(camera * camera + 2 * camera * sphere);
}

/** The opposite: which zoom gives an outline of `outline` pixels */
export function zoomForOutline(outline: number, lat: number, canvasHeight: number) {
	const camera = CAMERA_FACTOR * canvasHeight;
	// Solving outlineRadius() for the sphere radius
	const sphere =
		(outline * outline + outline * Math.sqrt(outline * outline + camera * camera)) / camera;
	return Math.log2((sphere * 2 * Math.PI * Math.cos((lat * Math.PI) / 180)) / TILE);
}
