import { getPhoto } from './db';
import { paintDemoImage } from '$lib/demo/paint';

// Full size images are big, so we keep only the last few in memory
const cache = new Map<string, string>();
const MAX_CACHED = 12;

/** Object URL of the full image of a photo (painted on the fly for sample photos) */
export async function fullImageUrl(id: string): Promise<string | null> {
	const cached = cache.get(id);
	if (cached) return cached;

	const photo = await getPhoto(id);
	if (!photo) return null;
	const blob = photo.demo
		? await paintDemoImage(photo.demo.scene, photo.demo.label, photo.height > photo.width)
		: photo.file;

	const url = URL.createObjectURL(blob);
	cache.set(id, url);
	if (cache.size > MAX_CACHED) {
		const [oldest, oldUrl] = cache.entries().next().value!;
		URL.revokeObjectURL(oldUrl);
		cache.delete(oldest);
	}
	return url;
}
