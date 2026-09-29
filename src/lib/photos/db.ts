import Dexie, { type EntityTable } from 'dexie';
import { toPoint, type Photo, type PhotoPoint } from './types';
import type { Place } from './places';

/** Things the user changed on a detected trip */
export interface TripEdit {
	id: string;
	/**
	 * A photo of the trip when it was edited. Trip ids change when photos are added
	 * or removed, so the edit follows the trip that still contains this photo.
	 */
	anchorId?: string;
	title?: string;
	coverId?: string;
}

// IndexedDB database that lives in the browser.
const db = new Dexie('waymark') as Dexie & {
	photos: EntityTable<Photo, 'id'>;
	trips: EntityTable<TripEdit, 'id'>;
};

// Only indexed fields go here; blobs are stored but not indexed.
db.version(1).stores({ photos: 'id, takenAt, name' });
db.version(2).stores({ photos: 'id, takenAt, name, country', trips: 'id' });
// Version 3 fills fields that older records don't have
db.version(3)
	.stores({ photos: 'id, takenAt, name, country', trips: 'id' })
	.upgrade((tx) =>
		tx
			.table('photos')
			.toCollection()
			.modify((photo: Partial<Photo>) => {
				photo.favorite ??= false;
				photo.country ??= null;
				photo.city ??= null;
				photo.previewable ??= true;
			})
	);

export async function savePhotos(photos: Photo[]) {
	await db.photos.bulkPut(photos);
}

/** Loads only the light fields, so the map starts fast even with thousands of photos */
export async function loadPhotoPoints(): Promise<PhotoPoint[]> {
	const points: PhotoPoint[] = [];
	await db.photos.orderBy('takenAt').each((photo) => points.push(toPoint(photo)));
	return points;
}

export function getPhoto(id: string) {
	return db.photos.get(id);
}

export async function getThumbs(ids: string[]) {
	const photos = await db.photos.bulkGet(ids);
	return photos.map((p) => p?.thumb);
}

export async function setFavorite(id: string, favorite: boolean) {
	await db.photos.update(id, { favorite });
}

export async function setLocation(ids: string[], place: { lat: number; lng: number } & Place) {
	await db.photos.where('id').anyOf(ids).modify(place);
}

/** New country, city and area for photos whose place was looked up again */
export async function updatePlaces(changes: { id: string; place: Place }[]) {
	await db.photos.bulkUpdate(changes.map(({ id, place }) => ({ key: id, changes: place })));
}

/** Returns which of these ids are already saved */
export async function findExistingIds(ids: string[]) {
	const found = await db.photos.bulkGet(ids);
	return new Set(ids.filter((_, i) => found[i]));
}

/** Camera name of each photo, for the "by camera" grouping */
export async function getCameras(ids: string[]) {
	const photos = await db.photos.bulkGet(ids);
	return new Map(ids.map((id, i) => [id, photos[i]?.camera ?? null]));
}

export function loadTripEdits() {
	return db.trips.toArray();
}

export async function saveTripEdit(edit: TripEdit) {
	const current = await db.trips.get(edit.id);
	await db.trips.put({ ...current, ...edit });
}

/** Sizes of what we keep, for the storage section in Settings */
export async function measureLibrary() {
	let thumbs = 0;
	let originals = 0;
	await db.photos.each((photo) => {
		thumbs += photo.thumb.size;
		// Sample photos reuse the thumbnail as file
		if (photo.file !== photo.thumb) originals += photo.file.size;
		// Viewable copy of RAW photos
		originals += photo.display?.size ?? 0;
	});
	return { thumbs, originals };
}

/** Everything except the images: used by "Export library" */
export async function exportMetadata() {
	const photos: Omit<Photo, 'thumb' | 'file' | 'display'>[] = [];
	await db.photos.each(({ thumb: _thumb, file: _file, display: _display, ...rest }) =>
		photos.push(rest)
	);
	return { photos, trips: await db.trips.toArray() };
}

export async function clearLibrary() {
	await Promise.all([db.photos.clear(), db.trips.clear()]);
}

/**
 * Asks the browser not to delete our data when the disk gets full.
 * This library may hold the only copy of the imported photos.
 */
export async function askForPersistentStorage() {
	try {
		if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
			await navigator.storage.persist();
		}
	} catch {
		// Not supported: the data is still saved, just not protected
	}
}
