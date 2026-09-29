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

const jan2024 = new Date(2024, 0, 1).getTime();
const april2025 = new Date(2025, 3, 3).getTime();
const july2026 = new Date(2026, 6, 4).getTime();

// Photos at home every few days during 2024
const everyday = photos(40, jan2024, madrid, 9 * DAY);

describe('findHome', () => {
	it('picks the city photographed in the most months', () => {
		const home = findHome([...everyday, ...photos(300, april2025, tokyo)]);
		expect(home?.city).toBe('Madrid');
	});

	it('has no home when all photos come from one short trip', () => {
		expect(findHome(photos(200, april2025, tokyo))).toBeNull();
	});
});

describe('detectTrips', () => {
	const library = [
		...everyday,
		...photos(20, april2025, tokyo),
		...photos(15, april2025 + 2 * DAY, kyoto),
		...photos(12, july2026, oviedo)
	].sort((a, b) => a.takenAt - b.takenAt);
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

	it('does not turn daily photos at home into a trip', () => {
		expect(trips.every((t) => !t.cities.includes('Madrid'))).toBe(true);
	});

	it('still finds a trip when the library has no home', () => {
		const onlyJapan = photos(20, april2025, tokyo);
		expect(detectTrips(onlyJapan, findHome(onlyJapan), countryName)).toHaveLength(1);
	});

	it('keeps a renamed title when an older photo joins the trip', () => {
		const japan = trips[1];
		const edits = [{ id: japan.id, anchorId: japan.photoIds[0], title: 'Primavera en Japón' }];
		const earlier = photos(1, april2025 - 3600 * 1000, tokyo);
		const again = detectTrips(
			[...earlier, ...library].sort((a, b) => a.takenAt - b.takenAt),
			home,
			countryName,
			edits
		);
		const renamed = again.find((t) => t.cities.includes('Kioto'));
		expect(renamed?.id).not.toBe(japan.id);
		expect(renamed?.title).toBe('Primavera en Japón');
	});

	it('ignores a cover that is no longer in the trip', () => {
		const japan = trips[1];
		const edits = [{ id: japan.id, coverId: 'not-in-this-trip' }];
		const again = detectTrips(library, home, countryName, edits);
		expect(again[1].photoIds).toContain(again[1].coverId);
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
