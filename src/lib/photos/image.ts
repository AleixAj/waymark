import { getPhoto } from './db';

// Full size images are big, so only the last few stay in memory.
// The Map keeps insertion order: the first entry is the one used longest ago.
const cache = new Map<string, Promise<string | null>>();
const MAX_CACHED = 16;

/** Object URL of the full image of a photo (painted on the fly for sample photos) */
export function fullImageUrl(id: string): Promise<string | null> {
	const cached = cache.get(id);
	if (cached) {
		// Move it to the end: recently used
		cache.delete(id);
		cache.set(id, cached);
		return cached;
	}

	// The promise is stored right away, so two calls for the same photo share one URL
	const request = createUrl(id);
	cache.set(id, request);
	request.then((url) => {
		if (!url) cache.delete(id);
	});

	while (cache.size > MAX_CACHED) {
		const [oldestId, oldest] = cache.entries().next().value!;
		cache.delete(oldestId);
		oldest.then((url) => url && URL.revokeObjectURL(url));
	}
	return request;
}

async function createUrl(id: string) {
	const photo = await getPhoto(id);
	if (!photo) return null;
	// Sample photos are shown straight from Wikimedia Commons
	if (photo.demo?.url) return photo.demo.url;
	const blob = photo.display ?? photo.file;
	return blob ? URL.createObjectURL(blob) : null;
}

/** Called when the library is deleted */
export function forgetFullImages() {
	for (const request of cache.values()) request.then((url) => url && URL.revokeObjectURL(url));
	cache.clear();
}
