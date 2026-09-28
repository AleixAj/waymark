import Dexie, { type EntityTable } from 'dexie';
import type { Photo, PhotoPoint } from './types';

// IndexedDB database that lives in the browser.
const db = new Dexie('waymark') as Dexie & {
	photos: EntityTable<Photo, 'id'>;
};

// Only indexed fields go here; blobs are stored but not indexed.
db.version(1).stores({
	photos: 'id, takenAt, name'
});

export async function savePhotos(photos: Photo[]) {
	await db.photos.bulkPut(photos);
}

/** Loads only the light fields, so the map starts fast even with thousands of photos */
export async function loadPhotoPoints(): Promise<PhotoPoint[]> {
	const points: PhotoPoint[] = [];
	await db.photos.orderBy('takenAt').each((photo) => {
		points.push({ id: photo.id, lat: photo.lat, lng: photo.lng, takenAt: photo.takenAt });
	});
	return points;
}

export async function getPhoto(id: string) {
	return db.photos.get(id);
}

export async function clearLibrary() {
	await db.photos.clear();
}

/** Returns which of these ids are already saved */
export async function findExistingIds(ids: string[]) {
	const keys = await db.photos.where('id').anyOf(ids).primaryKeys();
	return new Set(keys);
}
