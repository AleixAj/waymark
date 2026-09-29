import { distanceKm } from '$lib/geo/distance';
import type { LocatedPoint } from '$lib/photos/types';
import { centroid, groupBy } from './trips';

/** A neighbourhood of a city, drawn as a soft circle around its photos */
export interface Area {
	name: string;
	lat: number;
	lng: number;
	radiusKm: number;
	photoIds: string[];
}

const MIN_RADIUS_KM = 0.3;
const MAX_RADIUS_KM = 5;

/**
 * Splits the photos of a city by neighbourhood. Photos in the city itself form
 * the area with the city's name. The circle covers most photos of the area:
 * a single photo far away doesn't make it huge.
 */
export function cityAreas(photos: LocatedPoint[], city: string): Area[] {
	const areas: Area[] = [];
	for (const [name, group] of groupBy(photos, (p) => p.area ?? city)) {
		const center = centroid(group);
		const km = group
			.map((p) => distanceKm(center.lat, center.lng, p.lat, p.lng))
			.sort((a, b) => a - b);
		const most = km[Math.floor((km.length - 1) * 0.9)];
		areas.push({
			name,
			...center,
			radiusKm: Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, most * 1.15)),
			photoIds: group.map((p) => p.id)
		});
	}
	return areas.sort((a, b) => b.photoIds.length - a.photoIds.length);
}

/** Polygon of a circle on the map (a few km, so a flat approximation is enough) */
export function circle(lat: number, lng: number, radiusKm: number, steps = 64) {
	const ring: [number, number][] = [];
	const kmPerLat = 111.32;
	const kmPerLng = kmPerLat * Math.max(0.01, Math.cos((lat * Math.PI) / 180));
	for (let i = 0; i <= steps; i++) {
		const angle = (i / steps) * Math.PI * 2;
		ring.push([
			lng + (Math.cos(angle) * radiusKm) / kmPerLng,
			lat + (Math.sin(angle) * radiusKm) / kmPerLat
		]);
	}
	return ring;
}
