import { SvelteMap } from 'svelte/reactivity';
import { getThumbs } from '$lib/photos/db';

// Object URLs for thumbnails, created on demand and shared by every component.
// Requests made in the same frame are loaded together in one IndexedDB call.
const urls = new SvelteMap<string, string>();
const pending = new Set<string>();
let scheduled = false;

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
	if (!urls.has(id)) urls.set(id, URL.createObjectURL(blob));
}

async function loadPending() {
	scheduled = false;
	const ids = [...pending];
	const blobs = await getThumbs(ids);
	ids.forEach((id, i) => {
		pending.delete(id);
		const blob = blobs[i];
		if (blob && !urls.has(id)) urls.set(id, URL.createObjectURL(blob));
	});
}

export function forgetThumbs() {
	for (const url of urls.values()) URL.revokeObjectURL(url);
	urls.clear();
}
