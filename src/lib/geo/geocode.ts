import { loadCities } from './data';
import { distanceKm } from './distance';

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
	/** "place", "boundary", "landuse"... */
	category: string;
	address?: Record<string, string | undefined>;
}

// OpenStreetMap often has a town twice: as a point ("place") and as its border
// ("boundary"), sometimes with a translated name. Close results of different kinds
// are the same place; close results of the same kind (ski resort sectors) are not.
const SAME_PLACE_KM = 3;
const SAME_SPOT_KM = 0.5;
const MAX_RESULTS = 6;

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
			// More than we show: repeated ones are removed below
			limit: '12',
			'accept-language': 'es',
			addressdetails: '1'
		});
		const response = await fetch(`${NOMINATIM}?${params}`, { signal });
		if (!response.ok) throw new Error(String(response.status));
		const results = (await response.json()) as NominatimResult[];
		const kept: { raw: NominatimResult; place: FoundPlace }[] = [];
		for (const raw of results) {
			const place = toPlace(raw);
			const repeated = kept.some((k) => {
				// Same text in the list ("Lisboa, Portugal" as city and as district)
				if (sameText(k.place, place)) return true;
				const km = distanceKm(k.place.lat, k.place.lng, place.lat, place.lng);
				return km < SAME_SPOT_KM || (km < SAME_PLACE_KM && k.raw.category !== raw.category);
			});
			if (!repeated) kept.push({ raw, place });
		}
		return kept.slice(0, MAX_RESULTS).map((k) => k.place);
	} catch (error) {
		if (signal?.aborted) throw error;
		return searchCities(query);
	}
}

function sameText(a: FoundPlace, b: FoundPlace) {
	return (
		a.name.toLowerCase() === b.name.toLowerCase() &&
		a.detail.toLowerCase() === b.detail.toLowerCase()
	);
}

function toPlace(r: NominatimResult): FoundPlace {
	const name = r.name || r.display_name.split(', ')[0];
	const a = r.address ?? {};
	// "Encamp, Andorra": town and country, without repeating the name
	const town = a.city ?? a.town ?? a.village ?? a.municipality;
	const region = a.state ?? a.province ?? a.county;
	const detail = [...new Set([town, region, a.country])]
		.filter((part): part is string => !!part && part !== name)
		.join(', ');
	return {
		name,
		detail,
		lat: Number(r.lat),
		lng: Number(r.lon),
		country: a.country_code?.toUpperCase()
	};
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
