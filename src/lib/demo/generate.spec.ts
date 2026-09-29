import { describe, expect, it } from 'vitest';
import type { LocatedPoint } from '$lib/photos/types';
import { detectTrips, findHome } from '$lib/library/trips';
import { generateDemo } from './generate';

const { photos, titles } = generateDemo();
const located = photos.filter((p) => p.lat !== null && p.lng !== null) as LocatedPoint[];
const home = findHome(located);
const trips = detectTrips(located, home, (iso3) => iso3, titles);

describe('sample library', () => {
	it('lives in Madrid', () => {
		expect(home?.city).toBe('Madrid');
	});

	it('detects the Iceland road trip with its 12 stops', () => {
		const iceland = trips.find((t) => t.title === 'Islandia en furgoneta');
		expect(iceland?.stops).toHaveLength(12);
		expect(iceland?.days).toBe(15);
	});

	it('keeps each trip separate', () => {
		const titlesFound = trips.map((t) => t.title);
		expect(titlesFound).toContain('JPN 2025');
		expect(titlesFound).toContain('Lisboa y Sintra');
		expect(trips.length).toBeGreaterThanOrEqual(14);
	});

	it('has photos without GPS for the "Sin ubicación" screen', () => {
		expect(photos.length - located.length).toBeGreaterThan(20);
	});
});
