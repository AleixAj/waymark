import { CityIndex, type CityRow } from '$lib/geo/cities';
import { CountryIndex, toCountryFeatures, type CountryTopology } from '$lib/geo/countries';

export interface Place {
	country: string | null;
	city: string | null;
}

/** Looks up country and city for a position, fully offline */
export class PlaceFinder {
	private countries: CountryIndex;
	private cities: CityIndex;
	private iso2to3 = new Map<string, string>();

	constructor(topology: CountryTopology, cityRows: CityRow[]) {
		const features = toCountryFeatures(topology);
		for (const f of features) this.iso2to3.set(f.properties.iso2, f.properties.iso3);
		this.countries = new CountryIndex(features);
		this.cities = new CityIndex(cityRows);
	}

	find(lat: number | null, lng: number | null): Place {
		if (lat === null || lng === null) return { country: null, city: null };
		const city = this.cities.nearest(lat, lng);
		const country = this.countries.find(lat, lng)?.iso3 ?? null;
		// Photos taken from a boat or right on the coast fall outside the country
		// shapes, so we use the country of the nearest city instead
		const fallback = city ? (this.iso2to3.get(city.iso2) ?? null) : null;
		return { country: country ?? fallback, city: city?.name ?? null };
	}
}
