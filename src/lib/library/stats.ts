import { distanceKm, pathLengthKm } from '$lib/geo/distance';
import type { LocatedPoint } from '$lib/photos/types';
import { dayKey } from './format';
import { buildStops, groupBy, type Home, type Trip } from './trips';

export interface CountrySummary {
	iso3: string;
	count: number;
	first: number;
	last: number;
}

export interface CityCount {
	city: string;
	country: string | null;
	count: number;
	/** Where the city's photos are, for dots on a map */
	lat: number;
	lng: number;
}

/** Photos per country, most photographed first */
export function countrySummaries(points: LocatedPoint[]): CountrySummary[] {
	const groups = groupBy(
		points.filter((p) => p.country),
		(p) => p.country!
	);
	return [...groups.entries()]
		.map(([iso3, photos]) => ({
			iso3,
			count: photos.length,
			first: photos[0].takenAt,
			last: photos[photos.length - 1].takenAt
		}))
		.sort((a, b) => b.count - a.count);
}

/** Photos per city, most photographed first */
export function cityCounts(points: LocatedPoint[]): CityCount[] {
	const groups = groupBy(
		points.filter((p) => p.city),
		(p) => `${p.city}|${p.country ?? ''}`
	);
	return [...groups.values()]
		.map((photos) => ({
			city: photos[0].city!,
			country: photos[0].country,
			count: photos.length,
			lat: photos[0].lat,
			lng: photos[0].lng
		}))
		.sort((a, b) => b.count - a.count);
}

/** Everything the country panel shows */
export function countryDetail(points: LocatedPoint[], iso3: string, trips: Trip[]) {
	const photos = points.filter((p) => p.country === iso3);
	if (photos.length === 0) return null;
	return {
		photos,
		count: photos.length,
		first: photos[0].takenAt,
		last: photos[photos.length - 1].takenAt,
		cities: cityCounts(photos),
		days: new Set(photos.map((p) => dayKey(p.takenAt))).size,
		// Distance between the cities visited, not between every single photo
		km: Math.round(pathLengthKm(buildStops(photos))),
		visits: trips.filter((t) => t.countries.includes(iso3)).length
	};
}

export interface Extremes {
	north: LocatedPoint;
	south: LocatedPoint;
	east: LocatedPoint;
	west: LocatedPoint;
}

export function extremes(points: LocatedPoint[]): Extremes | null {
	if (points.length === 0) return null;
	let north = points[0];
	let south = points[0];
	let east = points[0];
	let west = points[0];
	for (const p of points) {
		if (p.lat > north.lat) north = p;
		if (p.lat < south.lat) south = p;
		if (p.lng > east.lng) east = p;
		if (p.lng < west.lng) west = p;
	}
	return { north, south, east, west };
}

export function photosPerYear(points: { takenAt: number }[]) {
	const counts = new Map<number, number>();
	for (const p of points) {
		const year = new Date(p.takenAt).getFullYear();
		counts.set(year, (counts.get(year) ?? 0) + 1);
	}
	if (counts.size === 0) return [];
	const years = [...counts.keys()];
	const result = [];
	// Fill the gaps so years without photos show an empty bar
	for (let y = Math.min(...years); y <= Math.max(...years); y++) {
		result.push({ year: y, count: counts.get(y) ?? 0 });
	}
	return result;
}

/** The photo taken furthest from home */
export function farthestFromHome(points: LocatedPoint[], home: Home | null) {
	if (!home) return null;
	let best: { point: LocatedPoint; km: number } | null = null;
	for (const p of points) {
		const km = distanceKm(home.lat, home.lng, p.lat, p.lng);
		if (!best || km > best.km) best = { point: p, km };
	}
	return best;
}
