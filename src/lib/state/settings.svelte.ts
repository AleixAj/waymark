export type Theme = 'dark' | 'light' | 'system';
export type MapStyle = 'sobrio' | 'relieve' | 'satelite';
export type Quality = 'alta' | 'equilibrada' | 'ahorro';
export type Units = 'km' | 'mi';
export type { Palette } from '$lib/map/palette';
import type { Palette } from '$lib/map/palette';

interface SavedSettings {
	theme: Theme;
	units: Units;
	mapStyle: MapStyle;
	borders: boolean;
	reducedMotion: boolean;
	quality: Quality;
	palette: Palette;
}

const KEY = 'waymark:settings';

function systemPrefersReducedMotion() {
	return (
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

const DEFAULTS: SavedSettings = {
	theme: 'dark',
	units: 'km',
	mapStyle: 'sobrio',
	borders: true,
	reducedMotion: systemPrefersReducedMotion(),
	quality: 'equilibrada',
	palette: 'natural'
};

const ALLOWED = {
	theme: ['dark', 'light', 'system'],
	units: ['km', 'mi'],
	mapStyle: ['sobrio', 'relieve', 'satelite'],
	quality: ['alta', 'equilibrada', 'ahorro'],
	palette: ['natural', 'gris', 'noche', 'atlas']
};

// localStorage can throw in private windows, and old or edited values can be wrong:
// every field is checked and falls back to its default
function read(): SavedSettings {
	let saved: Record<string, unknown> = {};
	try {
		saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
	} catch {
		saved = {};
	}
	const pick = <K extends keyof typeof ALLOWED>(key: K) =>
		(ALLOWED[key].includes(saved[key] as string) ? saved[key] : DEFAULTS[key]) as SavedSettings[K];
	const flag = (key: 'borders' | 'reducedMotion') =>
		typeof saved[key] === 'boolean' ? (saved[key] as boolean) : DEFAULTS[key];
	return {
		theme: pick('theme'),
		units: pick('units'),
		mapStyle: pick('mapStyle'),
		quality: pick('quality'),
		palette: pick('palette'),
		borders: flag('borders'),
		reducedMotion: flag('reducedMotion')
	};
}

/** User preferences. Every change is saved at once, like the design says. */
class Settings {
	theme = $state<Theme>(DEFAULTS.theme);
	units = $state<Units>(DEFAULTS.units);
	mapStyle = $state<MapStyle>(DEFAULTS.mapStyle);
	borders = $state(DEFAULTS.borders);
	reducedMotion = $state(DEFAULTS.reducedMotion);
	quality = $state<Quality>(DEFAULTS.quality);
	/** Color style of the globe */
	palette = $state<Palette>(DEFAULTS.palette);

	/** "system" resolved to the real theme */
	systemDark = $state(true);
	resolvedTheme = $derived<'dark' | 'light'>(
		this.theme === 'system' ? (this.systemDark ? 'dark' : 'light') : this.theme
	);

	private started = false;

	init() {
		// The layout calls this once; hot reloads in development must not add listeners again
		if (this.started) return;
		this.started = true;
		Object.assign(this, read());
		const media = matchMedia('(prefers-color-scheme: dark)');
		this.systemDark = media.matches;
		media.addEventListener('change', (e) => (this.systemDark = e.matches));

		$effect.root(() => {
			$effect(() => {
				document.documentElement.dataset.theme = this.resolvedTheme;
				document.documentElement.dataset.motion = this.reducedMotion ? 'reduced' : 'full';
			});
			$effect(() => {
				const data: SavedSettings = {
					theme: this.theme,
					units: this.units,
					mapStyle: this.mapStyle,
					borders: this.borders,
					reducedMotion: this.reducedMotion,
					quality: this.quality,
					palette: this.palette
				};
				try {
					localStorage.setItem(KEY, JSON.stringify(data));
				} catch {
					// Not saved, but the app keeps working
				}
			});
		});
	}

	toggleTheme() {
		this.theme = this.resolvedTheme === 'dark' ? 'light' : 'dark';
	}

	/** Distances in the chosen unit */
	distance(km: number) {
		return this.units === 'km' ? km : km * 0.621371;
	}
}

export const settings = new Settings();
