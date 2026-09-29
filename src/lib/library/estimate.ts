import { isLocated, type LocatedPoint, type PhotoPoint } from '$lib/photos/types';
import { groupBy } from './trips';

// A photo without GPS takes the place of a photo taken at most this long before or after
export const ESTIMATE_WINDOW_MS = 2 * 3600 * 1000;

export interface Estimate {
	id: string;
	/** The photo with real GPS it takes the place from */
	source: LocatedPoint;
}

/**
 * Guesses the place of photos without GPS, like Google Photos does. Phones
 * often lose the GPS of some photos, and WhatsApp photos never have it.
 * 1. The closest photo in time with real GPS (not another guess), up to 2 hours away.
 * 2. Otherwise, the closest photo in time with GPS of the same album: an album
 *    like "Lisboa 2022" is one trip, so its photos are in the same area.
 */
export function estimateLocations(points: PhotoPoint[]): Estimate[] {
	const anchors = points
		.filter((p): p is LocatedPoint => isLocated(p) && !p.estimated)
		.sort((a, b) => a.takenAt - b.takenAt);
	if (anchors.length === 0) return [];
	const albumAnchors = groupBy(
		anchors.filter((p) => p.album),
		(p) => p.album!
	);

	const estimates: Estimate[] = [];
	for (const point of points) {
		if (isLocated(point)) continue;
		const near = closestInTime(anchors, point.takenAt);
		if (Math.abs(near.takenAt - point.takenAt) <= ESTIMATE_WINDOW_MS) {
			estimates.push({ id: point.id, source: near });
			continue;
		}
		const sameAlbum = point.album ? albumAnchors.get(point.album) : undefined;
		if (sameAlbum)
			estimates.push({ id: point.id, source: closestInTime(sameAlbum, point.takenAt) });
	}
	return estimates;
}

/** Binary search in photos sorted by time */
function closestInTime(sorted: LocatedPoint[], time: number) {
	let low = 0;
	let high = sorted.length - 1;
	while (low < high) {
		const middle = (low + high) >> 1;
		if (sorted[middle].takenAt < time) low = middle + 1;
		else high = middle;
	}
	const after = sorted[low];
	const before = sorted[low - 1];
	if (!before) return after;
	return time - before.takenAt <= after.takenAt - time ? before : after;
}
