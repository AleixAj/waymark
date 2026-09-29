import type { PhotoPoint } from '$lib/photos/types';

/**
 * Adds new photos to a list sorted by time, skipping ids it already has.
 * A merge is linear, much cheaper than sorting everything again on every batch.
 */
export function mergeByTime(current: PhotoPoint[], added: PhotoPoint[]) {
	const known = new Set(current.map((p) => p.id));
	const fresh = added.filter((p) => !known.has(p.id)).sort((a, b) => a.takenAt - b.takenAt);
	const result: PhotoPoint[] = [];
	let i = 0;
	let j = 0;
	while (i < current.length || j < fresh.length) {
		if (j >= fresh.length || (i < current.length && current[i].takenAt <= fresh[j].takenAt)) {
			result.push(current[i++]);
		} else {
			result.push(fresh[j++]);
		}
	}
	return result;
}
