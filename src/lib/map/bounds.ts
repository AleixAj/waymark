/**
 * Box around some points. When they sit on both sides of the ±180° line
 * (Fiji and Samoa), the small box across the Pacific is used instead of
 * one that covers the whole world.
 */
export function pointsBounds(
	points: { lat: number; lng: number }[]
): [number, number, number, number] {
	let [w, s, e, n] = [180, 90, -180, -90];
	let [wShifted, eShifted] = [360, -360];
	for (const p of points) {
		w = Math.min(w, p.lng);
		e = Math.max(e, p.lng);
		s = Math.min(s, p.lat);
		n = Math.max(n, p.lat);
		// Same longitudes, counted from 0 to 360
		const shifted = p.lng < 0 ? p.lng + 360 : p.lng;
		wShifted = Math.min(wShifted, shifted);
		eShifted = Math.max(eShifted, shifted);
	}
	return eShifted - wShifted < e - w ? [wShifted, s, eShifted, n] : [w, s, e, n];
}
