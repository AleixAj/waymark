import { describe, expect, it } from 'vitest';
import { cameraName, toCoordinate, toOffset, toPosition, toTime } from './exif';

const now = Date.UTC(2026, 8, 29);

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

describe('toPosition', () => {
	it('treats 0,0 as "no GPS" (phones write it without signal)', () => {
		expect(toPosition(0, 0)).toEqual({ lat: null, lng: null });
		expect(toPosition(0, 12.5)).toEqual({ lat: 0, lng: 12.5 });
	});
});

describe('toTime', () => {
	it('reads real dates', () => {
		const date = new Date(2025, 3, 12, 17, 42);
		expect(toTime(date, null, now)).toBe(date.getTime());
	});

	it('ignores anything that is not a valid date', () => {
		expect(toTime(new Date('nope'), null, now)).toBeNull();
		expect(toTime('2024:01:01', null, now)).toBeNull();
	});

	it('ignores dates from a camera with a wrong clock', () => {
		expect(toTime(new Date(1000), null, now)).toBeNull();
		expect(toTime(new Date(2099, 0, 1), null, now)).toBeNull();
	});

	it('uses the time zone written by the camera', () => {
		// 17:42 in Tokyo (+09:00) is 08:42 UTC
		const wallClock = new Date(2025, 3, 12, 17, 42);
		expect(toTime(wallClock, '+09:00', now)).toBe(Date.UTC(2025, 3, 12, 8, 42));
	});
});

describe('toOffset', () => {
	it('accepts only well formed offsets', () => {
		expect(toOffset(' -05:00 ')).toBe('-05:00');
		expect(toOffset('9')).toBeNull();
	});
});

describe('cameraName', () => {
	it('joins brand and model without repeating the brand', () => {
		expect(cameraName('FUJIFILM', 'X-T5')).toBe('Fujifilm X-T5');
		expect(cameraName('Apple', 'iPhone 15 Pro')).toBe('Apple iPhone 15 Pro');
		expect(cameraName('Canon', 'Canon EOS R6')).toBe('Canon EOS R6');
		expect(cameraName(undefined, undefined)).toBeNull();
	});
});
