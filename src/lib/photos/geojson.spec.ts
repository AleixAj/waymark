import { describe, expect, it } from 'vitest';
import { toFeatureCollection } from './geojson';

describe('toFeatureCollection', () => {
	it('uses [lng, lat] order as GeoJSON expects', () => {
		const result = toFeatureCollection([{ id: 'a', lat: 40.4, lng: -3.7, takenAt: 0 }]);
		expect(result.features[0].geometry.coordinates).toEqual([-3.7, 40.4]);
	});

	it('skips photos without location', () => {
		const result = toFeatureCollection([
			{ id: 'a', lat: null, lng: null, takenAt: 0 },
			{ id: 'b', lat: 0, lng: 0, takenAt: 0 }
		]);
		expect(result.features.map((f) => f.properties.id)).toEqual(['b']);
	});
});
