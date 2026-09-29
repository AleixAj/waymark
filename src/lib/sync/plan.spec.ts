import { describe, expect, it } from 'vitest';
import type { PhotoRecord } from '$lib/photos/db';
import { mergeTrips, planSync } from './plan';

const record = (id: string, extra: Partial<PhotoRecord> = {}): PhotoRecord => ({
	id,
	name: `${id}.jpg`,
	width: 4000,
	height: 3000,
	size: 5_000_000,
	lat: 40,
	lng: -3,
	altitude: null,
	takenAt: 0,
	offset: null,
	country: 'ESP',
	city: 'Madrid',
	favorite: false,
	camera: null,
	lens: null,
	aperture: null,
	exposure: null,
	iso: null,
	focal: null,
	...extra
});

describe('planSync', () => {
	it('uploads new photos and downloads the ones from other devices', () => {
		const plan = planSync(
			[
				record('a'),
				record('b', { driveId: 'd-b' }),
				record('demo', { demo: { url: 'https://example.org/demo.jpg' } })
			],
			[record('b', { driveId: 'd-b' }), record('c', { driveId: 'd-c' })],
			true
		);
		expect(plan.upload.map((p) => p.id)).toEqual(['a']);
		expect(plan.download.map((p) => p.id)).toEqual(['c']);
		// Sample photos stay on this device
		expect(plan.merged.map((p) => p.id).sort()).toEqual(['a', 'b', 'c']);
	});

	it('keeps the most recent change of a photo', () => {
		const plan = planSync(
			[record('a', { favorite: false, updatedAt: 1, driveId: 'd-a', previewable: false })],
			[record('a', { favorite: true, updatedAt: 2, driveId: 'd-a' })],
			true
		);
		expect(plan.merged[0].favorite).toBe(true);
		expect(plan.updateLocal).toHaveLength(1);
		// Whether the browser shows the image is not taken from another device
		expect(plan.updateLocal[0]).not.toHaveProperty('previewable');

		const older = planSync(
			[record('a', { favorite: true, updatedAt: 3 })],
			[record('a', { favorite: false, updatedAt: 2, driveId: 'd-a' })],
			true
		);
		expect(older.merged[0]).toMatchObject({ favorite: true, driveId: 'd-a' });
		expect(older.updateLocal).toHaveLength(0);
	});

	it('uploads copies again when the Drive folder was deleted, but not Drive originals', () => {
		const plan = planSync(
			[record('a', { driveId: 'old' }), record('b', { driveId: 'mine', driveOriginal: true })],
			[],
			false
		);
		expect(plan.upload.map((p) => p.id)).toEqual(['a']);
	});
});

describe('mergeTrips', () => {
	it('keeps the most recent title', () => {
		const { merged, updateLocal } = mergeTrips(
			[{ id: 't1', title: 'Viejo', updatedAt: 1 }],
			[
				{ id: 't1', title: 'Nuevo', updatedAt: 2 },
				{ id: 't2', title: 'Otro', updatedAt: 1 }
			]
		);
		expect(merged.map((t) => t.title)).toEqual(['Nuevo', 'Otro']);
		expect(updateLocal).toHaveLength(2);
	});
});
