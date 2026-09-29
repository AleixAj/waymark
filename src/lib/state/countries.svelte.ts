import { loadCountries, loadMapCountries } from '$lib/geo/data';
import { toCountryFeatures, type CountryFeature, type CountryProps } from '$lib/geo/countries';

/** Country shapes and names, loaded once from /static/geo */
class Countries {
	/** Spherical shapes for d3 (bounds, names...) */
	features = $state.raw<CountryFeature[]>([]);
	/** Shapes cut at the date line, drawn by MapLibre */
	mapFeatures = $state.raw<CountryFeature[]>([]);
	byIso3 = $derived(new Map(this.features.map((f) => [f.properties.iso3, f])));

	async load() {
		if (this.features.length) return;
		const [spherical, flat] = await Promise.all([loadCountries(), loadMapCountries()]);
		this.features = toCountryFeatures(spherical);
		this.mapFeatures = toCountryFeatures(flat);
	}

	info(iso3: string | null | undefined): CountryProps | undefined {
		return iso3 ? this.byIso3.get(iso3)?.properties : undefined;
	}

	name = (iso3: string | null | undefined) => this.info(iso3)?.name ?? iso3 ?? '';
}

export const countries = new Countries();

/** 🇯🇵 style flag from the 2-letter code, used in the country panel */
export function flagEmoji(iso2: string | undefined) {
	if (!iso2 || iso2.length !== 2) return '';
	return String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
