import { loadCountryInfo, loadMapCountries } from '$lib/geo/data';
import { i18n } from '$lib/i18n/i18n.svelte';
import { toCountryFeatures, type CountryFeature, type CountryInfo } from '$lib/geo/countries';

/**
 * Countries, loaded once from /static/geo: a small list with names and camera boxes
 * for the whole app, and the detailed shapes drawn on the globe.
 */
class Countries {
	/** Every country (241), with its name, codes and camera box */
	list = $state.raw<CountryInfo[]>([]);
	/** Detailed shapes cut at the date line, drawn by MapLibre */
	mapFeatures = $state.raw<CountryFeature[]>([]);
	byIso3 = $derived(new Map(this.list.map((c) => [c.iso3, c])));

	private loading: Promise<void> | undefined;

	/** Safe to call many times: the files are requested only once */
	load() {
		this.loading ??= Promise.all([loadCountryInfo(), loadMapCountries()])
			.then(([list, forMap]) => {
				this.list = list;
				this.mapFeatures = toCountryFeatures(forMap);
			})
			.catch((error) => {
				this.loading = undefined;
				throw error;
			});
		return this.loading;
	}

	info(iso3: string | null | undefined): CountryInfo | undefined {
		return iso3 ? this.byIso3.get(iso3) : undefined;
	}

	/** The country name in the user's language (the data files have it in Spanish) */
	name = (iso3: string | null | undefined) => {
		const info = this.info(iso3);
		if (!info) return iso3 ?? '';
		if (i18n.locale === 'es') return info.name;
		try {
			const name = regionNames(i18n.tag)?.of(info.iso2);
			// Unknown codes come back as the code itself
			return name && name !== info.iso2 ? name : info.name;
		} catch {
			return info.name;
		}
	};
}

const displayNames = new Map<string, Intl.DisplayNames | null>();
function regionNames(tag: string) {
	if (!displayNames.has(tag)) {
		try {
			displayNames.set(tag, new Intl.DisplayNames([tag], { type: 'region' }));
		} catch {
			displayNames.set(tag, null);
		}
	}
	return displayNames.get(tag);
}

export const countries = new Countries();
