import { describe, expect, it } from 'vitest';
import type { PhotoPoint } from '$lib/photos/types';
import { estimateLocations } from './estimate';

const HOUR = 3600 * 1000;
const point = (
	id: string,
	hour: number,
	place?: [number, number],
	estimated = false,
	album: string | null = null
): PhotoPoint => ({
	id,
	takenAt: hour * HOUR,
	lat: place?.[0] ?? null,
	lng: place?.[1] ?? null,
	country: place ? 'PRT' : null,
	city: place ? 'Lisboa' : null,
	favorite: false,
	estimated,
	album
});

describe('estimateLocations', () => {
	it('takes the place of the closest photo with GPS in time', () => {
		const estimates = estimateLocations([
			point('gps-1', 10, [38.7, -9.1]),
			point('gps-2', 14, [38.8, -9.4]),
			point('a', 11),
			point('b', 13.5)
		]);
		expect(estimates.map((e) => [e.id, e.source.id])).toEqual([
			['a', 'gps-1'],
			['b', 'gps-2']
		]);
	});

	it('leaves photos far in time from any GPS', () => {
		expect(estimateLocations([point('gps', 10, [38.7, -9.1]), point('far', 13)])).toEqual([]);
	});

	it('uses the photos of the same album when they are further in time', () => {
		const estimates = estimateLocations([
			point('lisboa', 10, [38.7, -9.1], false, 'Lisboa 2022'),
			point('madrid', 40, [40.4, -3.7], false, 'Madrid'),
			point('a', 30, undefined, false, 'Lisboa 2022'),
			point('b', 30)
		]);
		expect(estimates.map((e) => [e.id, e.source.id])).toEqual([['a', 'lisboa']]);
	});

	it('never guesses from another guess', () => {
		const estimates = estimateLocations([point('guess', 10, [38.7, -9.1], true), point('a', 10.5)]);
		expect(estimates).toEqual([]);
	});
});
