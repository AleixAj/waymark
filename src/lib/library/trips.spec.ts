import { describe, expect, it } from 'vitest';
import type { LocatedPoint } from '$lib/photos/types';
import { buildStops, detectTrips, findHome } from './trips';

const DAY = 24 * 3600 * 1000;
const names: Record<string, string> = { ESP: 'España', JPN: 'Japón', ISL: 'Islandia' };
const countryName = (iso3: string) => names[iso3] ?? iso3;

function photos(
	count: number,
	start: number,
	place: { lat: number; lng: number; city: string; country: string },
	stepMs = 3600 * 1000
): LocatedPoint[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `${place.city}-${start}-${i}`,
		takenAt: start + i * stepMs,
		favorite: false,
		...place
	}));
}

const madrid = { lat: 40.42, lng: -3.7, city: 'Madrid', country: 'ESP' };
const tokyo = { lat: 35.68, lng: 139.69, city: 'Tokio', country: 'JPN' };
const kyoto = { lat: 35.01, lng: 135.77, city: 'Kioto', country: 'JPN' };
const oviedo = { lat: 43.36, lng: -5.85, city: 'Oviedo', country: 'ESP' };

describe('findHome', () => {
	it('picks the city with most photos', () => {
		const home = findHome([...photos(30, 0, madrid), ...photos(10, 100 * DAY, tokyo)]);
		expect(home?.city).toBe('Madrid');
	});
});

describe('detectTrips', () => {
	const april2025 = new Date(2025, 3, 3).getTime();
	const july2026 = new Date(2026, 6, 4).getTime();
	const library = [
		...photos(40, 0, madrid, DAY / 2),
		...photos(20, april2025, tokyo),
		...photos(15, april2025 + 2 * DAY, kyoto),
		...photos(12, july2026, oviedo)
	];
	const home = findHome(library);
	const trips = detectTrips(library, home, countryName);

	it('finds one trip per burst of photos away from home', () => {
		expect(trips).toHaveLength(2);
	});

	it('names trips abroad by country and year, and trips at home by city and month', () => {
		expect(trips.map((t) => t.title)).toEqual(['Oviedo, julio 2026', 'Japón 2025']);
	});

	it('builds the route stops in order', () => {
		const japan = trips[1];
		expect(japan.stops.map((s) => s.city)).toEqual(['Tokio', 'Kioto']);
		expect(japan.stops[1].km).toBeGreaterThan(300);
	});

	it('uses the title the user wrote', () => {
		const edited = detectTrips(library, home, countryName, [
			{ id: trips[1].id, title: 'Primavera en Japón' }
		]);
		expect(edited[1].title).toBe('Primavera en Japón');
	});
});

describe('buildStops', () => {
	it('starts a new stop each time the city changes', () => {
		const stops = buildStops([
			...photos(2, 0, tokyo),
			...photos(2, DAY, kyoto),
			...photos(1, 2 * DAY, tokyo)
		]);
		expect(stops.map((s) => s.index)).toEqual([1, 2, 3]);
		expect(stops[0].km).toBe(0);
	});
});
