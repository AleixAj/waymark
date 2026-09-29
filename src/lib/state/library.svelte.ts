import {
	clearLibrary,
	loadPhotoPoints,
	loadTripEdits,
	saveTripEdit,
	setFavorite,
	setLocation,
	type TripEdit
} from '$lib/photos/db';
import { importPhotos, type ImportError, type ImportProgress } from '$lib/photos/importer';
import { isLocated, type PhotoPoint } from '$lib/photos/types';
import { cityCounts, countrySummaries } from '$lib/library/stats';
import { inRange, type TimeRange } from '$lib/library/timeline';
import { detectTrips, findHome } from '$lib/library/trips';
import { loadDemo } from '$lib/demo/load';
import { countries } from './countries.svelte';
import { forgetThumbs, rememberThumb } from './thumbs.svelte';

/**
 * App-wide photo state. Points use $state.raw: with thousands of photos,
 * replacing the array is much cheaper than making every point reactive.
 * Everything else (trips, countries, stats) is derived from it.
 */
class Library {
	points = $state.raw<PhotoPoint[]>([]);
	tripEdits = $state.raw<TripEdit[]>([]);
	loaded = $state(false);
	progress = $state<ImportProgress | null>(null);
	importMinimized = $state(false);
	/** Files that failed in the last import */
	errors = $state.raw<ImportError[]>([]);
	/** Months selected in the timeline; null means everything */
	range = $state<TimeRange | null>(null);

	located = $derived(this.points.filter(isLocated));
	unlocated = $derived(this.points.filter((p) => !isLocated(p)));
	/** Located photos inside the timeline range: what the globe shows */
	visible = $derived(this.located.filter((p) => inRange(p.takenAt, this.range)));

	home = $derived(findHome(this.located));
	trips = $derived(detectTrips(this.located, this.home, countries.name, this.tripEdits));
	countryList = $derived(countrySummaries(this.located));
	visited = $derived(this.countryList.map((c) => c.iso3));
	cityList = $derived(cityCounts(this.located));
	byId = $derived(new Map(this.points.map((p) => [p.id, p])));

	isEmpty = $derived(this.loaded && this.points.length === 0);

	async load() {
		const [points, edits] = await Promise.all([loadPhotoPoints(), loadTripEdits()]);
		this.points = points;
		this.tripEdits = edits;
		this.loaded = true;
	}

	async import(files: File[]) {
		if (this.progress || files.length === 0) return;
		this.importMinimized = false;
		const result = await importPhotos(files, {
			onProgress: (progress) => (this.progress = progress),
			onBatch: (newPoints, thumbs) => {
				newPoints.forEach((p, i) => rememberThumb(p.id, thumbs[i]));
				this.points = sortByTime([...this.points, ...newPoints]);
			}
		});
		this.errors = result.errors;
		this.progress = null;
	}

	async retryErrors() {
		const files = this.errors.filter((e) => e.reason !== 'No es una foto').map((e) => e.file);
		this.errors = [];
		await this.import(files);
	}

	/** Fills the library with the sample photos, showing the same progress as an import */
	async loadDemo() {
		if (this.progress) return;
		this.importMinimized = false;
		await loadDemo({
			onProgress: (progress) => (this.progress = progress),
			onBatch: (newPoints, thumbs) => {
				newPoints.forEach((p, i) => rememberThumb(p.id, thumbs[i]));
				this.points = sortByTime([...this.points, ...newPoints]);
			}
		});
		this.tripEdits = await loadTripEdits();
		this.progress = null;
	}

	async toggleFavorite(id: string) {
		const point = this.byId.get(id);
		if (!point) return;
		await setFavorite(id, !point.favorite);
		this.replace([id], { favorite: !point.favorite });
	}

	async assignLocation(
		ids: string[],
		place: { lat: number; lng: number; country: string | null; city: string | null }
	) {
		await setLocation(ids, place);
		this.replace(ids, place);
	}

	async renameTrip(id: string, title: string) {
		await saveTripEdit({ id, title });
		this.tripEdits = await loadTripEdits();
	}

	async setTripCover(id: string, coverId: string) {
		await saveTripEdit({ id, coverId });
		this.tripEdits = await loadTripEdits();
	}

	async clear() {
		await clearLibrary();
		forgetThumbs();
		this.points = [];
		this.tripEdits = [];
		this.range = null;
	}

	private replace(ids: string[], changes: Partial<PhotoPoint>) {
		const set = new Set(ids);
		this.points = this.points.map((p) => (set.has(p.id) ? { ...p, ...changes } : p));
	}
}

function sortByTime(points: PhotoPoint[]) {
	return points.sort((a, b) => a.takenAt - b.takenAt);
}

export const library = new Library();
