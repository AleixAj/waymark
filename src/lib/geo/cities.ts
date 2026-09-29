import { distanceKm } from './distance';

/** [name, lat, lng, iso2, population, district (1 or 0)], as saved by scripts/build-geo.mjs */
export type CityRow = [string, number, number, string, number, number?];

export interface City {
	name: string;
	lat: number;
	lng: number;
	iso2: string;
}

export interface CityMatch {
	city: City;
	/** Neighbourhood or town inside the city's area, e.g. "Shinjuku" in Tokio */
	area: string | null;
}

// Photos further than this from any city keep only the country
const MAX_DISTANCE_KM = 40;
// A place belongs to a bigger city only if that city has this many times its people
const MIN_RATIO = 2.5;
const DISTRICT_MIN_RATIO = 1.5;
// Only real cities group others, and big cities are never someone's neighbourhood
// (Yokohama is not a part of Tokio, Sintra is not a part of a nearby town)
const MIN_PARENT_PEOPLE = 100_000;
const MAX_AREA_PEOPLE = 1_000_000;

/**
 * Finds the closest city fast by splitting the world in 1° cells
 * and only looking at the cells around the point.
 */
export class CityIndex {
	private cells = new Map<string, CityRow[]>();

	constructor(rows: CityRow[]) {
		for (const row of rows) {
			const key = cellKey(row[1], row[2]);
			const cell = this.cells.get(key);
			if (cell) cell.push(row);
			else this.cells.set(key, [row]);
		}
	}

	/**
	 * City and neighbourhood of a photo. The closest place is the neighbourhood;
	 * when it lies inside the area of a much bigger city, that city groups it:
	 * Kópavogur -> Reikiavik, Getafe -> Madrid, Shinjuku -> Tokio.
	 * A town far enough from the big city keeps its own name (Alcalá de Henares).
	 */
	locate(lat: number, lng: number): CityMatch | null {
		let near: CityRow | null = null;
		let nearKm = MAX_DISTANCE_KM;
		this.around(lat, lng, (row) => {
			const km = distanceKm(lat, lng, row[1], row[2]);
			if (km <= nearKm) {
				near = row;
				nearKm = km;
			}
		});
		if (!near) return null;
		const place: CityRow = near;
		const parent = this.parentOf(place);
		if (!parent) return { city: toCity(place), area: null };
		return { city: toCity(parent), area: place[0] };
	}

	/** The biggest city whose area reaches this place, or null */
	private parentOf(place: CityRow): CityRow | null {
		const district = !!place[5];
		if (!district && place[4] >= MAX_AREA_PEOPLE) return null;
		const ratio = district ? DISTRICT_MIN_RATIO : MIN_RATIO;
		let parent: CityRow | null = null;
		this.around(place[1], place[2], (row) => {
			if (row === place || row[5] || row[3] !== place[3]) return;
			if (row[4] < MIN_PARENT_PEOPLE || row[4] < place[4] * ratio) return;
			if (parent && row[4] <= parent[4]) return;
			if (distanceKm(place[1], place[2], row[1], row[2]) <= reachKm(row[4])) parent = row;
		});
		return parent;
	}

	/** Calls `visit` for every city in the cells around a point */
	private around(lat: number, lng: number, visit: (row: CityRow) => void) {
		// Near the poles one degree of longitude is only a few km: look at more cells
		const lngCells = Math.min(
			180,
			Math.ceil(MAX_DISTANCE_KM / (111 * Math.max(0.01, Math.cos((lat * Math.PI) / 180))))
		);
		for (let dLat = -1; dLat <= 1; dLat++) {
			for (let dLng = -lngCells; dLng <= lngCells; dLng++) {
				for (const row of this.cells.get(cellKey(lat + dLat, lng + dLng)) ?? []) visit(row);
			}
		}
	}
}

/**
 * How far the urban area of a city goes, growing with its size:
 * about 7 km for 100k people, 14 km for 1 million, 33 km for 8 million.
 */
export function reachKm(population: number) {
	return Math.min(MAX_DISTANCE_KM, 4 + 10 * Math.sqrt(population / 1e6));
}

function toCity(row: CityRow): City {
	return { name: row[0], lat: row[1], lng: row[2], iso2: row[3] };
}

function cellKey(lat: number, lng: number) {
	// Wrap longitude so cells near the date line still match
	const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
	return `${Math.floor(lat)},${Math.floor(wrapped)}`;
}
