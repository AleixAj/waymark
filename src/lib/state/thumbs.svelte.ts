import { SvelteMap } from 'svelte/reactivity';
import { getThumbs } from '$lib/photos/db';

// Object URLs for thumbnails, created on demand and shared by every component.
// Requests made in the same moment are loaded together in one IndexedDB call.
// Only the most recently used ones are kept, so memory stays bounded with big libraries
// (a component showing an evicted thumbnail simply asks for it again).
const MAX_URLS = 2000;

const urls = new SvelteMap<string, string>();
const pending = new Set<string>();
let scheduled = false;
// Changes when the library is deleted, so late answers are ignored
let generation = 0;

export function thumbUrl(id: string): string | undefined {
	const url = urls.get(id);
	if (!url && !pending.has(id)) {
		pending.add(id);
		if (!scheduled) {
			scheduled = true;
			queueMicrotask(loadPending);
		}
	}
	return url;
}

/** Adds thumbnails we already have in memory (right after an import) */
export function rememberThumb(id: string, blob: Blob) {
	if (!urls.has(id)) store(id, blob);
}

async function loadPending() {
	scheduled = false;
	const ids = [...pending];
	const current = generation;
	let blobs: (Blob | undefined)[] = [];
	try {
		blobs = await getThumbs(ids);
	} catch {
		// They are asked again the next time a component needs them
	}
	for (const id of ids) pending.delete(id);
	if (current !== generation) return;
	ids.forEach((id, i) => {
		const blob = blobs[i];
		if (blob && !urls.has(id)) store(id, blob);
	});
}

function store(id: string, blob: Blob) {
	urls.set(id, URL.createObjectURL(blob));
	// SvelteMap keeps insertion order: the first ones are the oldest
	if (urls.size > MAX_URLS) {
		for (const [oldId, oldUrl] of urls) {
			URL.revokeObjectURL(oldUrl);
			urls.delete(oldId);
			if (urls.size <= MAX_URLS * 0.9) break;
		}
	}
}

export function forgetThumbs() {
	generation++;
	pending.clear();
	for (const url of urls.values()) URL.revokeObjectURL(url);
	urls.clear();
}

/**
 * Same cache, for code outside Svelte templates (the map markers):
 * resolves with the URL once the thumbnail is loaded.
 */
export async function loadThumbUrl(id: string): Promise<string | undefined> {
	const cached = urls.get(id);
	if (cached) return cached;
	try {
		const [blob] = await getThumbs([id]);
		if (!blob) return undefined;
		if (!urls.has(id)) store(id, blob);
		return urls.get(id);
	} catch {
		return undefined;
	}
}
