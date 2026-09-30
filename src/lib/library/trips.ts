import { distanceKm, pathLengthKm } from '$lib/geo/distance';
import type { TripEdit } from '$lib/photos/db';
import type { LocatedPoint } from '$lib/photos/types';
import { i18n } from '$lib/i18n/i18n.svelte';
import t from '$lib/i18n/messages/trip';
import { daysBetween, formatMonthLong, monthKey } from './format';

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
// Photos closer than this to home are not part of a trip
const HOME_RADIUS_KM = 60;
// A place is home only if you took photos there in several different months
const MIN_HOME_MONTHS = 3;

/**
 * Home is the city where you took photos in the most different months (a two-week
 * trip with 1,000 photos doesn't make a home). Without such a place there is no home.
 */
export function findHome(points: LocatedPoint[]): Home | null {
	// City and country together: Santiago de Chile is not Santiago de Compostela
	const byPlace = groupBy(
		points.filter((p) => p.city || p.country),
		(p) => `${p.city ?? ''}|${p.country ?? ''}`
	);
	let best: LocatedPoint[] = [];
	let bestMonths = 0;
	for (const group of byPlace.values()) {
		const months = new Set(group.map((p) => monthKey(p.takenAt))).size;
		if (months > bestMonths || (months === bestMonths && group.length > best.length)) {
			best = group;
			bestMonths = months;
		}
	}
	if (bestMonths < MIN_HOME_MONTHS) return null;
	return { city: best[0].city, country: best[0].country, ...median(best) };
}

/**
 * Splits photos into trips: runs of photos taken away from home without long
 * pauses. Coming back home, or a pause of a few days, ends the trip.
 */
export function detectTrips(
	points: LocatedPoint[],
	home: Home | null,
	countryName: (iso3: string) => string,
	edits: TripEdit[] = []
): Trip[] {
	const sorted = isSorted(points) ? points : [...points].sort((a, b) => a.takenAt - b.takenAt);
	const runs: LocatedPoint[][] = [];
	let run: LocatedPoint[] = [];
	const close = () => {
		if (run.length) runs.push(run);
		run = [];
	};
	for (const point of sorted) {
		if (home && distanceKm(point.lat, point.lng, home.lat, home.lng) <= HOME_RADIUS_KM) {
			close();
			continue;
		}
		const last = run[run.length - 1];
		if (last && point.takenAt - last.takenAt > MAX_GAP_MS) close();
		run.push(point);
	}
	close();

	const trips: Trip[] = [];
	for (const photos of runs) {
		if (photos.length < MIN_PHOTOS) continue;
		const stops = buildStops(photos);
		const first = photos[0].takenAt;
		const last = photos[photos.length - 1].takenAt;
		trips.push({
			id: `trip-${first}`,
			title: tripTitle(photos, home, countryName),
			start: first,
			end: last,
			days: daysBetween(first, last),
			photoIds: photos.map((p) => p.id),
			countries: ranked(photos, (p) => p.country),
			cities: ranked(photos, (p) => p.city),
			stops,
			km: Math.round(pathLengthKm(stops)),
			coverId: photos[Math.floor(photos.length / 3)].id
		});
	}
	applyEdits(trips, edits);
	// Newest trip first, like in the design
	return trips.reverse();
}

/**
 * Titles and covers chosen by the user. A trip's id changes when an older photo
 * is added to it, so an edit also matches the trip that contains its anchor photo.
 */
function applyEdits(trips: Trip[], edits: TripEdit[]) {
	if (edits.length === 0) return;
	const byId = new Map(edits.map((e) => [e.id, e]));
	const byAnchor = new Map(edits.filter((e) => e.anchorId).map((e) => [e.anchorId!, e]));
	for (const trip of trips) {
		let edit = byId.get(trip.id);
		if (!edit) {
			for (const id of trip.photoIds) {
				edit = byAnchor.get(id);
				if (edit) break;
			}
		}
		if (!edit) continue;
		if (edit.title) trip.title = edit.title;
		// A cover from another trip (after photos moved) is ignored
		if (edit.coverId && trip.photoIds.includes(edit.coverId)) trip.coverId = edit.coverId;
	}
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
			city: group[0].city ?? t('noName'),
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
 * Trip names in the current language: "Japón 2025" abroad, "Oviedo, julio 2026"
 * at home, "Italia y Francia" when the trip covers several countries.
 */
function tripTitle(
	photos: LocatedPoint[],
	home: Home | null,
	countryName: (iso3: string) => string
) {
	const year = new Date(photos[0].takenAt).getFullYear();
	const countries = ranked(photos, (p) => p.country);
	const cities = ranked(photos, (p) => p.city);

	if (countries.length === 1 && countries[0] === home?.country) {
		const place = cities[0] ?? countryName(countries[0]);
		// "Julio 2026" -> "julio 2026": months are lower case inside a name, except in English
		const month = formatMonthLong(photos[0].takenAt);
		return t('atHome', { place, date: i18n.locale === 'en' ? month : month.toLowerCase() });
	}
	if (countries.length >= 2) {
		return t('twoCountries', { a: countryName(countries[0]), b: countryName(countries[1]) });
	}
	const place = countries[0] ? countryName(countries[0]) : (cities[0] ?? t('trip'));
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

/** Middle position: unlike the average, a few far away photos don't move it */
function median(points: { lat: number; lng: number }[]) {
	const middle = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
	return { lat: middle(points.map((p) => p.lat)), lng: middle(points.map((p) => p.lng)) };
}

function isSorted(points: { takenAt: number }[]) {
	for (let i = 1; i < points.length; i++)
		if (points[i].takenAt < points[i - 1].takenAt) return false;
	return true;
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
