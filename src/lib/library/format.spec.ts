import { describe, expect, it } from 'vitest';
import { daysBetween, formatCoords, formatExposure, formatNumber, formatRange } from './format';

describe('formatNumber', () => {
	it('uses a dot for thousands, also with 4 digits', () => {
		expect(formatNumber(4912)).toBe('4.912');
		expect(formatNumber(61480)).toBe('61.480');
		expect(formatNumber(521)).toBe('521');
	});
});

describe('formatRange', () => {
	const d = (y: number, m: number, day: number) => new Date(y, m, day).getTime();

	it('shortens ranges inside one month', () => {
		expect(formatRange(d(2024, 7, 12), d(2024, 7, 26))).toBe('12–26 ago 2024');
	});

	it('shows both months inside one year', () => {
		expect(formatRange(d(2025, 2, 28), d(2025, 3, 3))).toBe('28 mar – 3 abr 2025');
	});

	it('counts days including both ends', () => {
		expect(daysBetween(d(2024, 7, 12), d(2024, 7, 26))).toBe(15);
	});
});

describe('camera values', () => {
	it('formats shutter speed', () => {
		expect(formatExposure(0.002)).toBe('1/500');
	});

	it('formats coordinates with hemisphere letters', () => {
		expect(formatCoords(34.9949, 135.78504)).toBe('34.99490° N, 135.78504° E');
		expect(formatCoords(19.43, -99.13, 2)).toBe('19.43° N, 99.13° O');
	});
});
