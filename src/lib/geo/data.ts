import type { CityRow } from './cities';
import type { CountryInfo, CountryTopology } from './countries';

// Geo files live in /static/geo and are cached by the browser after the first load.
// Each file is downloaded once; a failed download (offline) is retried next time.
const cache = new Map<string, Promise<unknown>>();

function load<T>(url: string): Promise<T> {
	let request = cache.get(url) as Promise<T> | undefined;
	if (!request) {
		request = fetchJson<T>(url).catch((error) => {
			cache.delete(url);
			throw error;
		});
		cache.set(url, request);
	}
	return request;
}

/** Detailed shapes (1:50m) for finding the country of a photo */
export function loadCountries() {
	return load<CountryTopology>('/geo/countries-50m.json');
}

/** Name, codes, continent and camera box of every country (small file) */
export function loadCountryInfo() {
	return load<CountryInfo[]>('/geo/countries-info.json');
}

/** Light shapes (1:110m) for the flat map in Statistics */
export function loadCountriesLight() {
	return load<CountryTopology>('/geo/countries-110m.json');
}

/** Detailed shapes cut at the ±180° line: what a flat web map like MapLibre needs */
export function loadMapCountries() {
	return load<CountryTopology>('/geo/countries-map.json');
}

export function loadCities() {
	return load<CityRow[]>('/geo/cities.json');
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Could not load ${url}`);
	return response.json();
}
