import { describe, expect, it } from 'vitest';
import { circle, cityAreas } from './areas';
import type { LocatedPoint } from '$lib/photos/types';

const photo = (id: string, lat: number, lng: number, area: string | null): LocatedPoint => ({
	id,
	lat,
	lng,
	area,
	takenAt: 0,
	country: 'ISL',
	city: 'Reikiavik',
	favorite: false
});

describe('cityAreas', () => {
	it('groups photos by neighbourhood, the city itself included', () => {
		const areas = cityAreas(
			[
				photo('a', 64.146, -21.94, null),
				photo('b', 64.147, -21.941, null),
				photo('c', 64.148, -21.942, null),
				photo('d', 64.112, -21.913, 'Kópavogur')
			],
			'Reikiavik'
		);
		expect(areas.map((a) => [a.name, a.photoIds.length])).toEqual([
			['Reikiavik', 3],
			['Kópavogur', 1]
		]);
		// A single photo still gets a visible circle
		expect(areas[1].radiusKm).toBe(0.3);
	});
});

describe('circle', () => {
	it('closes the ring and keeps the radius', () => {
		const ring = circle(40, -3, 1);
		expect(ring[0]).toEqual(ring[ring.length - 1]);
		expect(ring[16][1] - 40).toBeCloseTo(1 / 111.32, 5);
	});
});
