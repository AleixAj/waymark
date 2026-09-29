import {
	clearLibrary,
	loadPhotoPoints,
	loadTripEdits,
	saveTripEdit,
	setFavorite,
	setLocation,
	updatePlaces,
	type TripEdit
} from '$lib/photos/db';
import { findPlace } from '$lib/photos/placeFinder';
import type { Place } from '$lib/photos/places';
import {
	importPhotos,
	type ImportError,
	type ImportItem,
	type ImportProgress
} from '$lib/photos/importer';
import { forgetFullImages } from '$lib/photos/image';
import { isLocated, type PhotoPoint } from '$lib/photos/types';
import { cityCounts, countrySummaries } from '$lib/library/stats';
import { inRange, type TimeRange } from '$lib/library/timeline';
import { mergeByTime } from '$lib/library/merge';
import { detectTrips, findHome, type Trip } from '$lib/library/trips';
import { loadDemo } from '$lib/demo/load';
import { countries } from './countries.svelte';
import { forgetThumbs, rememberThumb } from './thumbs.svelte';
import { ui } from './ui.svelte';

// New photos are shown on the globe at most this often during an import,
// so trips and statistics are not recalculated for every small batch
const MERGE_EVERY_MS = 400;

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
	/** Trip of each photo, so the viewer doesn't search every trip for every photo */
	tripByPhoto = $derived.by(() => {
		const map = new Map<string, Trip>();
		for (const trip of this.trips) for (const id of trip.photoIds) map.set(id, trip);
		return map;
	});

	isEmpty = $derived(this.loaded && this.points.length === 0);
	busy = $derived(this.progress !== null);

	// Files dropped while another import is running wait here
	private waiting: (File | ImportItem)[] = [];
	private incoming: PhotoPoint[] = [];
	private mergeTimer: ReturnType<typeof setTimeout> | null = null;
	private abort: AbortController | null = null;
	/** Called after the user changes something that other devices should get */
	onChange: (() => void) | null = null;

	async load() {
		const [points, edits] = await Promise.all([loadPhotoPoints(), loadTripEdits()]);
		this.points = points;
		this.tripEdits = edits;
		this.loaded = true;
		void this.addMissingAreas();
	}

	/** Reads everything again (photos arrived from another device) */
	async reload() {
		const [points, edits] = await Promise.all([loadPhotoPoints(), loadTripEdits()]);
		this.mergeIncoming();
		this.points = points;
		this.tripEdits = edits;
	}

	/**
	 * Photos saved before neighbourhoods existed have no area: their place is
	 * looked up again once (Kópavogur becomes an area of Reikiavik).
	 */
	private async addMissingAreas() {
		// Sample photos keep the names of the demo
		const old = this.located.filter((p) => p.area === undefined && !p.id.startsWith('demo-'));
		if (!old.length) return;
		const changes = await Promise.all(
			old.map(async (p) => ({ id: p.id, place: await findPlace(p.lat, p.lng) }))
		);
		// Offline the lookup finds nothing: try again another day instead of losing the city
		const found = changes.filter((c) => c.place.city || c.place.country);
		if (!found.length) return;
		await updatePlaces(found);
		const byId = new Map(found.map((c) => [c.id, c.place]));
		this.points = this.points.map((p) => (byId.has(p.id) ? { ...p, ...byId.get(p.id) } : p));
	}

	/** Imports photos. Called while another import runs, the files are queued. */
	async import(files: (File | ImportItem)[]) {
		if (files.length === 0) return;
		if (this.abort) {
			this.waiting.push(...files);
			return;
		}
		await this.run((signal) =>
			importPhotos(files, {
				signal,
				onProgress: (progress) => (this.progress = progress),
				onBatch: (points, thumbs) => this.receive(points, thumbs)
			})
		);
		this.onChange?.();
		// Files that arrived in the meantime
		if (this.waiting.length) {
			const next = this.waiting;
			this.waiting = [];
			await this.import(next);
		}
	}

	/** Fills the library with the sample photos, showing the same progress as an import */
	async loadDemo() {
		if (this.abort) return;
		await this.run((signal) =>
			loadDemo({
				signal,
				onProgress: (progress) => (this.progress = progress),
				onBatch: (points, thumbs) => this.receive(points, thumbs)
			})
		);
		this.tripEdits = await loadTripEdits();
	}

	async retryErrors() {
		if (this.abort) return;
		const files = this.errors.filter((e) => e.retryable).map((e) => e.item);
		this.errors = [];
		await this.import(files);
	}

	/**
	 * Shared by imports and the demo: only one runs at a time, errors never leave
	 * the progress panel stuck, and deleting the library cancels it.
	 */
	private async run(task: (signal: AbortSignal) => Promise<ImportProgress>) {
		const controller = new AbortController();
		this.abort = controller;
		this.importMinimized = false;
		this.errors = [];
		try {
			const result = await task(controller.signal);
			if (!controller.signal.aborted) this.errors = result.errors;
		} catch {
			if (!controller.signal.aborted) {
				this.errors = [
					{
						name: 'Importación',
						reason: 'Se ha interrumpido',
						retryable: false,
						item: { name: '', open: async () => new File([], '') }
					}
				];
			}
		} finally {
			this.mergeIncoming();
			if (this.abort === controller) {
				this.abort = null;
				this.progress = null;
			}
		}
	}

	/** New photos from an import: kept for a moment and added to the library together */
	private receive(points: PhotoPoint[], thumbs: Blob[]) {
		points.forEach((p, i) => rememberThumb(p.id, thumbs[i]));
		this.incoming.push(...points);
		this.mergeTimer ??= setTimeout(() => this.mergeIncoming(), MERGE_EVERY_MS);
	}

	private mergeIncoming() {
		if (this.mergeTimer) clearTimeout(this.mergeTimer);
		this.mergeTimer = null;
		if (!this.incoming.length) return;
		const incoming = this.incoming;
		this.incoming = [];
		this.points = mergeByTime(this.points, incoming);
	}

	async toggleFavorite(id: string) {
		const point = this.byId.get(id);
		if (!point) return;
		// Updated in memory first: a double click reads the new value, not the old one
		const favorite = !point.favorite;
		this.replace([id], { favorite });
		await setFavorite(id, favorite);
		this.onChange?.();
	}

	async assignLocation(ids: string[], place: { lat: number; lng: number } & Place) {
		await setLocation(ids, place);
		this.replace(ids, place);
		this.onChange?.();
	}

	async renameTrip(trip: Trip, title: string) {
		await saveTripEdit({ id: trip.id, anchorId: trip.photoIds[0], title });
		this.tripEdits = await loadTripEdits();
		this.onChange?.();
	}

	async setTripCover(trip: Trip, coverId: string) {
		await saveTripEdit({ id: trip.id, anchorId: trip.photoIds[0], coverId });
		this.tripEdits = await loadTripEdits();
		this.onChange?.();
	}

	/** Deletes everything, including an import that is still running */
	async clear() {
		this.abort?.abort();
		this.abort = null;
		this.waiting = [];
		this.incoming = [];
		if (this.mergeTimer) clearTimeout(this.mergeTimer);
		this.mergeTimer = null;

		await clearLibrary();
		forgetThumbs();
		forgetFullImages();
		this.points = [];
		this.tripEdits = [];
		this.range = null;
		this.progress = null;
		this.errors = [];
		this.importMinimized = false;
		ui.closeViewer();
		ui.placing = null;
		ui.dragging = null;
		ui.hoveredPhoto = null;
	}

	private replace(ids: string[], changes: Partial<PhotoPoint>) {
		const set = new Set(ids);
		this.points = this.points.map((p) => (set.has(p.id) ? { ...p, ...changes } : p));
	}
}

export const library = new Library();
