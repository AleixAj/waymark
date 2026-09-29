import { distanceKm } from './distance';

/** [name, lat, lng, iso2, population], as saved by scripts/build-geo.mjs */
export type CityRow = [string, number, number, string, number];

export interface City {
	name: string;
	lat: number;
	lng: number;
	iso2: string;
}

// Photos further than this from any city keep only the country
const MAX_DISTANCE_KM = 40;

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

	nearest(lat: number, lng: number): City | null {
		let best: CityRow | null = null;
		let bestScore = Infinity;
		for (let dLat = -1; dLat <= 1; dLat++) {
			for (let dLng = -1; dLng <= 1; dLng++) {
				const cell = this.cells.get(cellKey(lat + dLat, lng + dLng));
				for (const row of cell ?? []) {
					const km = distanceKm(lat, lng, row[1], row[2]);
					if (km > MAX_DISTANCE_KM) continue;
					// Big cities win over tiny neighbours a bit further away
					const score = km / Math.log10(row[4] + 10);
					if (score < bestScore) {
						best = row;
						bestScore = score;
					}
				}
			}
		}
		return best ? { name: best[0], lat: best[1], lng: best[2], iso2: best[3] } : null;
	}
}

function cellKey(lat: number, lng: number) {
	// Wrap longitude so cells near the date line still match
	const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
	return `${Math.floor(lat)},${Math.floor(wrapped)}`;
}
