import type { CityRow } from './cities';
import type { CountryTopology } from './countries';

// Geo files live in /static/geo and are cached by the browser after the first load.
let countries: Promise<CountryTopology> | undefined;
let countriesLight: Promise<CountryTopology> | undefined;
let countriesForMap: Promise<CountryTopology> | undefined;
let cities: Promise<CityRow[]> | undefined;

export function loadCountries() {
	countries ??= fetchJson('/geo/countries-50m.json');
	return countries;
}

export function loadCountriesLight() {
	countriesLight ??= fetchJson('/geo/countries-110m.json');
	return countriesLight;
}

/** Same shapes cut at the ±180° line: what a flat web map like MapLibre needs */
export function loadMapCountries() {
	countriesForMap ??= fetchJson('/geo/countries-map.json');
	return countriesForMap;
}

export function loadCities() {
	cities ??= fetchJson('/geo/cities.json');
	return cities;
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Could not load ${url}`);
	return response.json();
}
