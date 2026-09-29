import { loadCities, loadCountries } from '$lib/geo/data';
import { NO_PLACE, PlaceFinder, type Place } from './places';

// Country and city lookups run on the main thread with a single copy of the geo
// data (the workers only read the files). The lookup itself takes microseconds.
let finder: Promise<PlaceFinder> | undefined;

function getPlaceFinder() {
	finder ??= Promise.all([loadCountries(), loadCities()])
		.then(([countries, cities]) => new PlaceFinder(countries, cities))
		.catch((error) => {
			// Try again next time instead of keeping the failure forever
			finder = undefined;
			throw error;
		});
	return finder;
}

/** Country and city for a position. Without the geo data (offline) they stay empty. */
export async function findPlace(
	lat: number | null,
	lng: number | null,
	iso2?: string
): Promise<Place> {
	if (lat === null || lng === null) return NO_PLACE;
	try {
		return (await getPlaceFinder()).find(lat, lng, iso2);
	} catch {
		return NO_PLACE;
	}
}

/** Country, city and area for a position picked on the map */
export async function placeAt(lat: number, lng: number, iso2?: string) {
	return { lat, lng, ...(await findPlace(lat, lng, iso2)) };
}
