import { describe, expect, it } from 'vitest';
import { CityIndex, type CityRow } from './cities';

const rows: CityRow[] = [
	['Kioto', 35.0211, 135.7538, 'JP', 1_459_640],
	['Mukō', 34.9486, 135.6983, 'JP', 54_000],
	['Reikiavik', 64.1355, -21.8954, 'IS', 118_918],
	['Kópavogur', 64.1123, -21.913, 'IS', 40_040],
	['Taveuni', -16.8, 179.95, 'FJ', 20_000],
	['Tokio', 35.6895, 139.6917, 'JP', 8_336_599],
	['Shinjuku', 35.6912, 139.7085, 'JP', 349_385, 1],
	['Yokohama', 35.4437, 139.638, 'JP', 3_574_443],
	['Madrid', 40.4165, -3.7026, 'ES', 3_255_944],
	['Getafe', 40.3057, -3.733, 'ES', 187_525],
	['Polar Station', 80.0, 15.63, 'SJ', 20_000],
	['Alcalá de Henares', 40.4818, -3.3643, 'ES', 196_888],
	['Tijuana', 32.5027, -117.0037, 'MX', 1_376_457],
	['San Ysidro', 32.5553, -117.0442, 'US', 28_000]
];
const index = new CityIndex(rows);
const at = (lat: number, lng: number) => {
	const match = index.locate(lat, lng);
	return match && [match.city.name, match.area];
};

describe('CityIndex', () => {
	it('names the closest city', () => {
		expect(at(34.9949, 135.785)).toEqual(['Kioto', null]);
	});

	it('keeps a neighbourhood inside its big city', () => {
		expect(at(35.692, 139.705)).toEqual(['Tokio', 'Shinjuku']);
		expect(at(64.11, -21.91)).toEqual(['Reikiavik', 'Kópavogur']);
		expect(at(40.3, -3.73)).toEqual(['Madrid', 'Getafe']);
	});

	it('keeps the name of a town far from the big city', () => {
		expect(at(40.48, -3.37)).toEqual(['Alcalá de Henares', null]);
	});

	it('never makes a big city part of another one', () => {
		expect(at(35.44, 139.64)).toEqual(['Yokohama', null]);
	});

	it('only uses cities of the country when it is known', () => {
		expect(index.locate(32.556, -117.045, 'MX')?.city.name).toBe('Tijuana');
	});

	it('does not group places across a border', () => {
		expect(at(32.556, -117.045)).toEqual(['San Ysidro', null]);
	});

	it('finds cities close to the poles, where longitude degrees are short', () => {
		expect(at(80.0, 13.9)).toEqual(['Polar Station', null]);
	});

	it('returns null far from every city', () => {
		expect(index.locate(0, -30)).toBeNull();
	});

	it('works next to the date line', () => {
		expect(at(-16.8, -179.95)).toEqual(['Taveuni', null]);
	});
});
