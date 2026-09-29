import { describe, expect, it } from 'vitest';
import { CityIndex, type CityRow } from './cities';

const rows: CityRow[] = [
	['Kioto', 35.0211, 135.7538, 'JP', 1_459_640],
	['Mukō', 34.9486, 135.6983, 'JP', 54_000],
	['Reikiavik', 64.1355, -21.8954, 'IS', 118_918],
	['Taveuni', -16.8, 179.95, 'FJ', 20_000]
];
const index = new CityIndex(rows);

describe('CityIndex', () => {
	it('prefers the big city when two are close', () => {
		expect(index.nearest(34.9949, 135.785)?.name).toBe('Kioto');
	});

	it('returns null far from every city', () => {
		expect(index.nearest(0, -30)).toBeNull();
	});

	it('works next to the date line', () => {
		expect(index.nearest(-16.8, -179.95)?.name).toBe('Taveuni');
	});
});
