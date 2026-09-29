import { describe, expect, it } from 'vitest';
import { CityIndex, type CityRow } from './cities';

const rows: CityRow[] = [
	['Kioto', 35.0211, 135.7538, 'JP', 1_459_640],
	['Mukō', 34.9486, 135.6983, 'JP', 54_000],
	['Reikiavik', 64.1355, -21.8954, 'IS', 118_918],
	['Taveuni', -16.8, 179.95, 'FJ', 20_000],
	['Tokio', 35.6895, 139.6917, 'JP', 8_336_599],
	['Yotsuya', 35.6833, 139.7333, 'JP', 60_000],
	['Madrid', 40.4165, -3.7026, 'ES', 3_255_944],
	['Alcalá de Henares', 40.4818, -3.3643, 'ES', 196_888]
];
const index = new CityIndex(rows);

describe('CityIndex', () => {
	it('prefers the big city when two are close', () => {
		expect(index.nearest(34.9949, 135.785)?.name).toBe('Kioto');
	});

	it('uses the big city for its districts', () => {
		expect(index.nearest(35.685, 139.73)?.name).toBe('Tokio');
	});

	it('keeps the name of a town far from the big city', () => {
		expect(index.nearest(40.48, -3.37)?.name).toBe('Alcalá de Henares');
	});

	it('returns null far from every city', () => {
		expect(index.nearest(0, -30)).toBeNull();
	});

	it('works next to the date line', () => {
		expect(index.nearest(-16.8, -179.95)?.name).toBe('Taveuni');
	});
});
