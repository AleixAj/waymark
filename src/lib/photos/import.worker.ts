/// <reference lib="webworker" />
import { loadCities, loadCountries } from '$lib/geo/data';
import { readPhotoMeta } from './exif';
import { PlaceFinder } from './places';
import { createThumbnail } from './thumbnail';
import type { Photo } from './types';

export type ProcessedPhoto = Omit<Photo, 'id' | 'file' | 'favorite'>;
export type WorkerRequest = { file: File };
export type WorkerResponse = { ok: true; photo: ProcessedPhoto } | { ok: false; error: string };

// Geo data is loaded once per worker and reused for every photo
let finder: Promise<PlaceFinder> | undefined;
function getFinder() {
	finder ??= Promise.all([loadCountries(), loadCities()]).then(
		([countries, cities]) => new PlaceFinder(countries, cities)
	);
	return finder;
}

// Heavy work (decode, resize, EXIF, place lookup) runs here so the globe never stutters.
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const { file } = event.data;
	try {
		const [meta, preview, places] = await Promise.all([
			readPhotoMeta(file),
			createThumbnail(file),
			getFinder()
		]);
		const place = places.find(meta.lat, meta.lng);
		const photo: ProcessedPhoto = {
			name: file.name,
			size: file.size,
			...meta,
			...preview,
			...place
		};
		self.postMessage({ ok: true, photo } satisfies WorkerResponse);
	} catch (error) {
		self.postMessage({ ok: false, error: errorReason(file, error) } satisfies WorkerResponse);
	}
};

/** Short reason shown to the user in the import error list */
function errorReason(file: File, error: unknown) {
	if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name))
		return 'Formato no compatible';
	if (error instanceof DOMException && error.name === 'InvalidStateError') return 'Archivo dañado';
	return 'No se pudo leer';
}
