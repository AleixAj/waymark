import { translator } from '$lib/i18n/i18n.svelte';

// The sample library names four of its trips by hand (the rest get automatic
// titles). They are saved in Spanish and shown in the chosen language.
const t = translator({
	es: {
		asturias: 'Asturias, julio 2026',
		lisbon: 'Lisboa y Sintra',
		iceland: 'Islandia en furgoneta',
		newYork: 'Nueva York'
	},
	en: {
		asturias: 'Asturias, July 2026',
		lisbon: 'Lisbon and Sintra',
		iceland: 'Iceland by camper van',
		newYork: 'New York'
	},
	ca: {
		asturias: 'Astúries, juliol 2026',
		lisbon: 'Lisboa i Sintra',
		iceland: 'Islàndia en furgoneta',
		newYork: 'Nova York'
	}
});

const KEYS = {
	'Asturias, julio 2026': 'asturias',
	'Lisboa y Sintra': 'lisbon',
	'Islandia en furgoneta': 'iceland',
	'Nueva York': 'newYork'
} as const;

/** A trip title in the current language when it is one of the sample library's */
export function localTitle(title: string) {
	const key = KEYS[title as keyof typeof KEYS];
	return key ? t(key) : title;
}
