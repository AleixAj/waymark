import { describe, expect, it } from 'vitest';
import { toCoordinate, toTime } from './exif';

describe('toCoordinate', () => {
	it('keeps valid values, including 0', () => {
		expect(toCoordinate(0, 90)).toBe(0);
		expect(toCoordinate(-33.86, 90)).toBe(-33.86);
	});

	it('rejects missing or out of range values', () => {
		expect(toCoordinate(undefined, 90)).toBeNull();
		expect(toCoordinate(NaN, 90)).toBeNull();
		expect(toCoordinate(120, 90)).toBeNull();
	});
});

describe('toTime', () => {
	it('reads dates and ignores anything else', () => {
		expect(toTime(new Date(1000))).toBe(1000);
		expect(toTime(new Date('nope'))).toBeNull();
		expect(toTime('2024:01:01')).toBeNull();
	});
});
