import { describe, expect, it } from 'vitest';
import type { PhotoPoint } from '$lib/photos/types';
import { mergeByTime } from './merge';

const p = (id: string, takenAt: number): PhotoPoint => ({
	id,
	takenAt,
	lat: 0,
	lng: 0,
	country: null,
	city: null,
	favorite: false
});

describe('mergeByTime', () => {
	it('keeps the list sorted by time', () => {
		const merged = mergeByTime([p('a', 1), p('c', 5)], [p('d', 9), p('b', 3)]);
		expect(merged.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
	});

	it('never adds the same photo twice', () => {
		const merged = mergeByTime([p('a', 1)], [p('a', 1), p('b', 2)]);
		expect(merged.map((x) => x.id)).toEqual(['a', 'b']);
	});
});
