import { loadCities } from './data';

export interface FoundPlace {
	name: string;
	/** Region and country, to tell apart places with the same name */
	detail: string;
	lat: number;
	lng: number;
	/** ISO 3166 alpha-2 code, e.g. "AD" */
	country?: string;
}

// OpenStreetMap search: free, no key. Its rules ask for at most one search per
// second, so the input waits for a pause in typing before searching.
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

interface NominatimResult {
	name: string;
	display_name: string;
	lat: string;
	lon: string;
	address?: { country_code?: string };
}

/**
 * Places that match a text: ski resorts, beaches, streets... from OpenStreetMap.
 * Without internet it looks in the cities that come with the app.
 */
export async function searchPlaces(text: string, signal?: AbortSignal): Promise<FoundPlace[]> {
	const query = text.trim();
	if (query.length < 2) return [];
	try {
		const params = new URLSearchParams({
			q: query,
			format: 'jsonv2',
			limit: '6',
			'accept-language': 'es',
			addressdetails: '1'
		});
		const response = await fetch(`${NOMINATIM}?${params}`, { signal });
		if (!response.ok) throw new Error(String(response.status));
		const results = (await response.json()) as NominatimResult[];
		return results.map((r) => {
			const parts = r.display_name.split(', ');
			return {
				name: r.name || parts[0],
				// "Canillo, Andorra" instead of the full address
				detail: [parts[parts.length - 3], parts[parts.length - 1]].filter(Boolean).join(', '),
				lat: Number(r.lat),
				lng: Number(r.lon),
				country: r.address?.country_code?.toUpperCase()
			};
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		return searchCities(query);
	}
}

/** Offline search in the bundled cities, biggest first */
async function searchCities(query: string): Promise<FoundPlace[]> {
	const wanted = normalize(query);
	const rows = await loadCities();
	return rows
		.filter((row) => normalize(row[0]).startsWith(wanted))
		.sort((a, b) => b[4] - a[4])
		.slice(0, 6)
		.map((row) => ({ name: row[0], detail: row[3], lat: row[1], lng: row[2], country: row[3] }));
}

/** "Alcalá" and "alcala" are the same search */
function normalize(text: string) {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}
