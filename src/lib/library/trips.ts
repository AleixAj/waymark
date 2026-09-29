import { distanceKm, pathLengthKm } from '$lib/geo/distance';
import type { TripEdit } from '$lib/photos/db';
import type { LocatedPoint } from '$lib/photos/types';
import { daysBetween } from './format';

export interface Stop {
	/** 1-based position in the trip */
	index: number;
	city: string;
	lat: number;
	lng: number;
	start: number;
	photoIds: string[];
	/** Distance from the previous stop */
	km: number;
}

export interface Trip {
	id: string;
	title: string;
	start: number;
	end: number;
	days: number;
	photoIds: string[];
	countries: string[];
	cities: string[];
	stops: Stop[];
	km: number;
	coverId: string;
}

export interface Home {
	city: string | null;
	country: string | null;
	lat: number;
	lng: number;
}

// Two photos more than this apart in time belong to different trips
const MAX_GAP_MS = 2.5 * 24 * 3600 * 1000;
const MIN_PHOTOS = 8;
// Photos closer than this to home are not a trip
const HOME_RADIUS_KM = 60;

const MONTH_NAMES = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre'
];

/** Home is the city where most of your photos were taken */
export function findHome(points: LocatedPoint[]): Home | null {
	if (points.length === 0) return null;
	const byCity = groupBy(points, (p) => p.city ?? p.country ?? '?');
	let best: LocatedPoint[] = [];
	for (const group of byCity.values()) if (group.length > best.length) best = group;
	return { city: best[0].city, country: best[0].country, ...centroid(best) };
}

/**
 * Splits photos (sorted by time) into trips: runs of photos without long
 * pauses, far enough from home and with enough photos.
 */
export function detectTrips(
	points: LocatedPoint[],
	home: Home | null,
	countryName: (iso3: string) => string,
	edits: TripEdit[] = []
): Trip[] {
	const runs: LocatedPoint[][] = [];
	let run: LocatedPoint[] = [];
	for (const point of points) {
		const last = run[run.length - 1];
		if (last && point.takenAt - last.takenAt > MAX_GAP_MS) {
			runs.push(run);
			run = [];
		}
		run.push(point);
	}
	if (run.length) runs.push(run);

	const editById = new Map(edits.map((e) => [e.id, e]));
	const trips: Trip[] = [];
	for (const photos of runs) {
		if (photos.length < MIN_PHOTOS) continue;
		const away =
			!home || photos.some((p) => distanceKm(p.lat, p.lng, home.lat, home.lng) > HOME_RADIUS_KM);
		if (!away) continue;

		const id = `trip-${photos[0].takenAt}`;
		const edit = editById.get(id);
		const stops = buildStops(photos);
		const first = photos[0].takenAt;
		const last = photos[photos.length - 1].takenAt;
		trips.push({
			id,
			title: edit?.title ?? tripTitle(photos, home, countryName),
			start: first,
			end: last,
			days: daysBetween(first, last),
			photoIds: photos.map((p) => p.id),
			countries: ranked(photos, (p) => p.country),
			cities: ranked(photos, (p) => p.city),
			stops,
			km: Math.round(pathLengthKm(stops)),
			coverId: edit?.coverId ?? photos[Math.floor(photos.length / 3)].id
		});
	}
	// Newest trip first, like in the design
	return trips.reverse();
}

/** Consecutive photos in the same city form one stop of the route */
export function buildStops(photos: LocatedPoint[]): Stop[] {
	const stops: Stop[] = [];
	let group: LocatedPoint[] = [];

	const close = () => {
		if (!group.length) return;
		const prev = stops[stops.length - 1];
		const center = centroid(group);
		stops.push({
			index: stops.length + 1,
			city: group[0].city ?? 'Sin nombre',
			...center,
			start: group[0].takenAt,
			photoIds: group.map((p) => p.id),
			km: prev ? Math.round(distanceKm(prev.lat, prev.lng, center.lat, center.lng)) : 0
		});
		group = [];
	};

	for (const photo of photos) {
		if (group.length && group[0].city !== photo.city) close();
		group.push(photo);
	}
	close();
	return stops;
}

/**
 * Trip names: "Japón 2025" abroad, "Oviedo, julio 2026" at home,
 * "Italia y Francia" when the trip covers several countries.
 */
function tripTitle(
	photos: LocatedPoint[],
	home: Home | null,
	countryName: (iso3: string) => string
) {
	const date = new Date(photos[0].takenAt);
	const year = date.getFullYear();
	const countries = ranked(photos, (p) => p.country);
	const cities = ranked(photos, (p) => p.city);

	if (countries.length === 1 && countries[0] === home?.country) {
		const place = cities[0] ?? countryName(countries[0]);
		return `${place}, ${MONTH_NAMES[date.getMonth()]} ${year}`;
	}
	if (countries.length >= 2) {
		return `${countryName(countries[0])} y ${countryName(countries[1])}`;
	}
	const place = countries[0] ? countryName(countries[0]) : (cities[0] ?? 'Viaje');
	return `${place} ${year}`;
}

/** Distinct values ordered by how many photos have them */
export function ranked<T>(items: T[], key: (item: T) => string | null) {
	const counts = new Map<string, number>();
	for (const item of items) {
		const k = key(item);
		if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

export function centroid(points: { lat: number; lng: number }[]) {
	let lat = 0;
	let lng = 0;
	for (const p of points) {
		lat += p.lat;
		lng += p.lng;
	}
	return { lat: lat / points.length, lng: lng / points.length };
}

export function groupBy<T>(items: T[], key: (item: T) => string) {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const k = key(item);
		const group = groups.get(k);
		if (group) group.push(item);
		else groups.set(k, [item]);
	}
	return groups;
}
