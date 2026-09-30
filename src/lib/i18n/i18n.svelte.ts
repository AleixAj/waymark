import { formatDecimal, formatNumber } from '$lib/library/format';

// The app speaks Spanish, English and Catalan. Texts live in small dictionaries
// next to each part of the app (see ./messages), always with the three languages.

export type Locale = 'es' | 'en' | 'ca';

export const LOCALES: { id: Locale; name: string; short: string }[] = [
	{ id: 'es', name: 'Español', short: 'ES' },
	{ id: 'en', name: 'English', short: 'EN' },
	{ id: 'ca', name: 'Català', short: 'CA' }
];

const KEY = 'waymark:lang';

/** The saved choice, or the browser's language the first time (English when unknown) */
function initial(): Locale {
	// Tests and scripts run outside a browser: Spanish, the source language
	if (typeof window === 'undefined') return 'es';
	try {
		const saved = localStorage.getItem(KEY);
		if (saved === 'es' || saved === 'en' || saved === 'ca') return saved;
	} catch {
		// Blocked storage
	}
	const browser = navigator.language.toLowerCase();
	if (browser.startsWith('ca')) return 'ca';
	if (browser.startsWith('es') || browser.startsWith('gl') || browser.startsWith('eu')) return 'es';
	return 'en';
}

class I18n {
	locale = $state<Locale>(initial());

	/** BCP 47 tag for Intl and for the page: "es-ES", "en-GB", "ca-ES" */
	get tag() {
		return this.locale === 'en' ? 'en-GB' : `${this.locale}-ES`;
	}

	set(locale: Locale) {
		this.locale = locale;
		try {
			localStorage.setItem(KEY, locale);
		} catch {
			// Blocked storage: the choice lasts until the page is closed
		}
	}
}

export const i18n = new I18n();

type Vars = Record<string, string | number>;

/**
 * Makes the `t` function of one dictionary. Spanish is the source: the other
 * languages must have the same keys (checked by TypeScript with `satisfies`).
 *
 * - `{name}` is replaced by `vars.name`
 * - "{n} foto|{n} fotos": the first form is used when `vars.n` is 1
 *
 * It reads the current language on every call, so texts in the markup change
 * as soon as the language changes.
 */
export function translator<T extends Record<string, string>>(dict: {
	es: T;
	en: Record<keyof T, string>;
	ca: Record<keyof T, string>;
}) {
	return (key: keyof T, vars?: Vars) => {
		let text: string = dict[i18n.locale][key] ?? dict.es[key];
		if (text.includes('|')) {
			const [one, other] = text.split('|');
			text = vars?.n === 1 ? one : other;
		}
		if (vars) {
			text = text.replace(/\{(\w+)\}/g, (match, name: string) =>
				name in vars ? format(vars[name]) : match
			);
		}
		return text;
	};
}

// Numbers in texts use the separators of the language ("4.912" / "4,912")
function format(value: string | number) {
	if (typeof value === 'string') return value;
	return Number.isInteger(value) ? formatNumber(value) : formatDecimal(value);
}
