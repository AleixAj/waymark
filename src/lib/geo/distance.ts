const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points, in km */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
	const toRad = Math.PI / 180;
	const dLat = (bLat - aLat) * toRad;
	const dLng = (bLng - aLng) * toRad;
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Total length of a path that visits the points in order */
export function pathLengthKm(points: { lat: number; lng: number }[]) {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1];
		const b = points[i];
		total += distanceKm(a.lat, a.lng, b.lat, b.lng);
	}
	return total;
}

export const EQUATOR_KM = 40075;
