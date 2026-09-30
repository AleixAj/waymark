import { savePhotos, saveTripEdit } from '$lib/photos/db';
import { findPlace } from '$lib/photos/placeFinder';
import { toPoint, type Photo, type PhotoPoint } from '$lib/photos/types';
import type { ImportProgress } from '$lib/photos/importer';
import { generateDemo, type DemoPhoto } from './generate';
import t from '$lib/i18n/messages/demo';

/** What the loading window shows */
export interface DemoStatus {
	step: 'download' | 'place';
	/** 0 to 1 */
	progress: number;
	/** Megabytes downloaded, and of how many */
	loaded: number;
	total: number;
}

interface DemoOptions {
	onProgress: (progress: ImportProgress) => void;
	onBatch: (points: PhotoPoint[], thumbs: Blob[]) => void;
	onStatus: (status: DemoStatus) => void;
	signal?: AbortSignal;
}

// All the thumbnails in one file (made by scripts/build-demo.mjs)
const THUMBS_URL = '/demo/thumbs.bin';
// Downloading is most of the wait; placing the photos is the rest
const DOWNLOAD_SHARE = 0.85;

/**
 * Creates the sample library. The thumbnails come in one file from this site;
 * the big images are loaded from Wikimedia Commons when a photo is opened.
 * The globe gets all the photos at once at the end, not bit by bit.
 */
export async function loadDemo({ onProgress, onBatch, onStatus, signal }: DemoOptions) {
	const { photos, titles } = generateDemo();
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

	const thumbs = await downloadThumbs(signal, (loaded, total) =>
		onStatus({ step: 'download', progress: (loaded / total) * DOWNLOAD_SHARE, loaded, total })
	);
	const size = thumbs.size / 1e6;

	const records: Photo[] = [];
	for (const [i, photo] of photos.entries()) {
		if (signal?.aborted) return progress;
		const [start, length] = photo.pack;
		records.push(await toRecord(photo, thumbs.slice(start, start + length, 'image/webp')));
		if (photo.lat === null) progress.withoutLocation++;
		else progress.withLocation++;
		progress.done++;
		if (i % 40 === 0) {
			const placed = DOWNLOAD_SHARE + (i / photos.length) * (1 - DOWNLOAD_SHARE);
			onStatus({ step: 'place', progress: placed, loaded: size, total: size });
			// Let the browser paint the progress bar before going on
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
	}
	await savePhotos(records);
	for (const edit of titles) await saveTripEdit(edit);
	if (signal?.aborted) return progress;
	onStatus({ step: 'place', progress: 1, loaded: size, total: size });
	onBatch(
		records.map(toPoint),
		records.map((p) => p.thumb)
	);
	onProgress({ ...progress });
	return progress;
}

/** The thumbnails file, reporting the megabytes received as they arrive */
async function downloadThumbs(
	signal: AbortSignal | undefined,
	onBytes: (loaded: number, total: number) => void
): Promise<Blob> {
	let response: Response;
	try {
		response = await fetch(THUMBS_URL, { signal });
		if (!response.ok || !response.body) throw new Error(String(response.status));
	} catch (error) {
		if (signal?.aborted) throw error;
		const offline = new Error(t('offline'));
		offline.name = 'UserError';
		throw offline;
	}
	const total = Number(response.headers.get('Content-Length')) || 6e6;
	const reader = response.body.getReader();
	const chunks: BlobPart[] = [];
	let loaded = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		loaded += value.length;
		onBytes(loaded / 1e6, Math.max(total, loaded) / 1e6);
	}
	return new Blob(chunks);
}

async function toRecord({ pack: _pack, ...photo }: DemoPhoto, thumb: Blob): Promise<Photo> {
	// Neighbourhoods come from the real position (Shinjuku inside Tokio)
	const place = await findPlace(photo.lat, photo.lng);
	const area = place.city === photo.city ? place.area : null;
	// The thumbnail doubles as "file": the viewer loads the big image from Commons
	return { ...photo, area, thumb, file: thumb, previewable: true };
}
