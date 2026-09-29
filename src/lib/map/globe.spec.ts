import { describe, expect, it } from 'vitest';
import { outlineRadius, sphereRadius, zoomForOutline } from './globe';

describe('globe size', () => {
	it('grows with 1/cos(latitude), like MapLibre does', () => {
		expect(sphereRadius(2, 60) / sphereRadius(2, 0)).toBeCloseTo(2, 5);
	});

	it('shows the outline a bit smaller than the sphere because of perspective', () => {
		const sphere = sphereRadius(2, 36);
		expect(outlineRadius(sphere, 900)).toBeLessThan(sphere);
	});

	it('finds the zoom back from the outline size', () => {
		const zoom = 2.3;
		const outline = outlineRadius(sphereRadius(zoom, 36), 900);
		expect(zoomForOutline(outline, 36, 900)).toBeCloseTo(zoom, 6);
	});
});
