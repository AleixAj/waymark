import { describe, expect, it } from 'vitest';
import { pointsBounds } from './bounds';

describe('pointsBounds', () => {
	it('wraps the points in a box', () => {
		expect(
			pointsBounds([
				{ lat: 40, lng: -4 },
				{ lat: 43, lng: 2 }
			])
		).toEqual([-4, 40, 2, 43]);
	});

	it('crosses the ±180° line instead of covering the whole world', () => {
		// Fiji (178°) and Samoa (-172°): 10° apart across the Pacific
		const [w, , e] = pointsBounds([
			{ lat: -18, lng: 178 },
			{ lat: -14, lng: -172 }
		]);
		expect(e - w).toBe(10);
	});
});
