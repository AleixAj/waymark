import { loadCities, loadCountries } from '$lib/geo/data';
import { PlaceFinder } from './places';

// Same place lookup as the import worker, for locations set by hand in the UI
let finder: Promise<PlaceFinder> | undefined;

export function getPlaceFinder() {
	finder ??= Promise.all([loadCountries(), loadCities()]).then(
		([countries, cities]) => new PlaceFinder(countries, cities)
	);
	return finder;
}

/** Country and city for a position picked on the map */
export async function placeAt(lat: number, lng: number) {
	const place = (await getPlaceFinder()).find(lat, lng);
	return { lat, lng, ...place };
}
