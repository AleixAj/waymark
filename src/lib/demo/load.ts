import { savePhotos, saveTripEdit } from '$lib/photos/db';
import { findPlace } from '$lib/photos/placeFinder';
import { toPoint, type Photo, type PhotoPoint } from '$lib/photos/types';
import type { ImportProgress } from '$lib/photos/importer';
import { generateDemo, type DemoPhoto } from './generate';

interface DemoOptions {
	onProgress: (progress: ImportProgress) => void;
	onBatch: (points: PhotoPoint[], thumbs: Blob[]) => void;
	signal?: AbortSignal;
}

const BATCH_SIZE = 40;
// Thumbnails are downloaded a few at a time, not to flood Wikimedia
const PARALLEL = 6;
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Creates the sample library: downloads the thumbnail of each photo from
 * Wikimedia Commons and saves it like a real import. The big image is
 * loaded from Commons when a photo is opened.
 */
export async function loadDemo({ onProgress, onBatch, signal }: DemoOptions) {
	const { photos, titles } = generateDemo();
	for (const edit of titles) await saveTripEdit(edit);

	const progress: ImportProgress = {
		total: photos.length,
		done: 0,
		withLocation: 0,
		withoutLocation: 0,
		duplicates: 0,
		errors: [],
		startedAt: Date.now()
	};
	onProgress({ ...progress });

	const queue = [...photos];
	let batch: Photo[] = [];
	let failed = 0;
	const flush = async () => {
		if (!batch.length || signal?.aborted) return;
		const saved = batch;
		batch = [];
		await savePhotos(saved);
		if (signal?.aborted) return;
		onBatch(
			saved.map(toPoint),
			saved.map((p) => p.thumb)
		);
	};

	await Promise.all(
		Array.from({ length: PARALLEL }, async () => {
			let next = queue.shift();
			while (next && !signal?.aborted) {
				const thumb = await download(next.thumbUrl, signal);
				if (thumb) {
					batch.push(await toRecord(next, thumb));
					if (next.lat === null) progress.withoutLocation++;
					else progress.withLocation++;
				} else {
					failed++;
				}
				progress.done++;
				onProgress({ ...progress });
				if (batch.length >= BATCH_SIZE) await flush();
				next = queue.shift();
			}
		})
	);
	await flush();
	if (failed === photos.length && !signal?.aborted) {
		const error = new Error('Hace falta conexión a internet para descargar las fotos de ejemplo');
		error.name = 'UserError';
		throw error;
	}
	return progress;
}

async function toRecord({ thumbUrl: _url, ...photo }: DemoPhoto, thumb: Blob): Promise<Photo> {
	// Neighbourhoods come from the real position (Shinjuku inside Tokio)
	const place = await findPlace(photo.lat, photo.lng);
	const area = place.city === photo.city ? place.area : null;
	// The thumbnail doubles as "file": the viewer loads the big image from Commons
	return { ...photo, area, thumb, file: thumb, previewable: true };
}

async function download(url: string, signal?: AbortSignal): Promise<Blob | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	const stop = () => controller.abort();
	signal?.addEventListener('abort', stop);
	try {
		const response = await fetch(url, { signal: controller.signal });
		return response.ok ? await response.blob() : null;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener('abort', stop);
	}
}
