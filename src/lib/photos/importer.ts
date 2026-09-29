import { askForPersistentStorage, fillAlbums, findExistingIds, savePhotos } from './db';
import { findPlace } from './placeFinder';
import { isRaw } from './formats';
import { toPoint, type Photo, type PhotoPoint } from './types';
import type { ImportHint, ProcessedPhoto, WorkerRequest, WorkerResponse } from './import.worker';

export type { ImportHint };

/**
 * A photo to import. Photos inside a zip or in Google Drive are only opened
 * when their turn comes, so a big Takeout never sits in memory all at once.
 */
export interface ImportItem {
	name: string;
	/** MIME type when known (files from this device) */
	type?: string;
	open: () => Promise<File>;
	/** Data from outside the photo: Google Takeout location, Drive file... */
	hint?: ImportHint;
}

export interface ImportError {
	name: string;
	reason: string;
	/** Worth trying again (a busy or broken read), unlike a video or a full disk */
	retryable: boolean;
	item: ImportItem;
}

export interface ImportProgress {
	total: number;
	done: number;
	withLocation: number;
	withoutLocation: number;
	duplicates: number;
	errors: ImportError[];
	startedAt: number;
}

interface ImportOptions {
	onProgress: (progress: ImportProgress) => void;
	/** Called after each saved batch so the globe fills up while importing */
	onBatch: (points: PhotoPoint[], thumbs: Blob[]) => void;
	/** Aborted when the library is deleted during an import */
	signal?: AbortSignal;
}

const BATCH_SIZE = 48;
// A photo that takes longer than this is skipped (and its worker replaced)
const FILE_TIMEOUT_MS = 30_000;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif|avif|gif|tiff?)$/i;

export function isImage(file: { name: string; type?: string }) {
	return !!file.type?.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name) || isRaw(file);
}

/** A file from this device as an import item */
export function fileItem(file: File): ImportItem {
	return { name: file.name, type: file.type, open: async () => file };
}

export async function importPhotos(
	sources: (File | ImportItem)[],
	{ onProgress, onBatch, signal }: ImportOptions
) {
	const items = sources.map((source) => (source instanceof File ? fileItem(source) : source));
	const queue = items.filter(isImage);
	const progress: ImportProgress = {
		total: queue.length,
		done: 0,
		withLocation: 0,
		withoutLocation: 0,
		duplicates: 0,
		// Videos and other files are listed so the user knows they were skipped
		errors: items
			.filter((item) => !isImage(item))
			.map((item) => ({ name: item.name, reason: 'No es una foto', retryable: false, item })),
		startedAt: Date.now()
	};
	onProgress({ ...progress });
	if (queue.length === 0) return progress;
	askForPersistentStorage();

	// Ids seen in this import, to skip the same photo selected twice
	const seen = new Set<string>();
	let batch: { photo: ProcessedPhoto; file: File; hint?: ImportHint }[] = [];
	let stopped = false;

	const flush = async () => {
		if (!batch.length || signal?.aborted) return;
		const entries = batch;
		batch = [];
		const existing = await findExistingIds(entries.map((entry) => entry.photo.id));
		const fresh = entries.filter((entry) => !existing.has(entry.photo.id));
		progress.duplicates += entries.length - fresh.length;
		// A photo imported again from an album keeps its data, but learns the album
		await fillAlbums(
			entries
				.filter((entry) => existing.has(entry.photo.id) && entry.hint?.album)
				.map((entry) => ({ id: entry.photo.id, album: entry.hint!.album! }))
		);

		const now = Date.now();
		const photos: Photo[] = await Promise.all(
			fresh.map(async ({ photo, file, hint }) => ({
				...photo,
				...(await findPlace(photo.lat, photo.lng)),
				favorite: false,
				file,
				updatedAt: now,
				album: hint?.album ?? null,
				// A photo chosen in Drive is not uploaded again: Waymark points to it
				...(hint?.driveId && { driveId: hint.driveId, driveOriginal: true })
			}))
		);
		try {
			await savePhotos(photos);
		} catch {
			// Usually the browser storage is full: stop and tell the user which photos are missing
			stopped = true;
			queue.length = 0;
			for (const { file } of fresh) {
				progress.errors.push({
					name: file.name,
					reason: 'Sin espacio en el navegador',
					retryable: false,
					item: fileItem(file)
				});
			}
			onProgress({ ...progress });
			return;
		}
		for (const p of photos) {
			if (p.lat === null) progress.withoutLocation++;
			else progress.withLocation++;
		}
		if (!signal?.aborted) {
			onBatch(
				photos.map(toPoint),
				photos.map((p) => p.thumb)
			);
			onProgress({ ...progress });
		}
	};

	// One worker per CPU core (max 4); each takes the next file from the shared queue
	const workerCount = Math.min(4, navigator.hardwareConcurrency || 2, queue.length);
	await Promise.all(Array.from({ length: workerCount }, runWorker));
	await flush();
	return progress;

	async function runWorker() {
		let worker = createWorker();
		try {
			let item = queue.shift();
			while (item && !stopped && !signal?.aborted) {
				await processItem(item);
				progress.done++;
				onProgress({ ...progress });
				if (batch.length >= BATCH_SIZE) await flush();
				item = queue.shift();
			}
		} finally {
			worker.terminate();
		}

		async function processItem(item: ImportItem) {
			const fail = (reason: string, retryable: boolean) =>
				progress.errors.push({ name: item.name, reason, retryable, item });
			let file: File;
			try {
				file = await item.open();
			} catch {
				// A broken zip entry, or Drive didn't answer
				fail('No se pudo abrir', true);
				return;
			}
			const result = await processInWorker(worker, file, item.hint);
			if (result === 'timeout') {
				// A stuck worker (huge or broken file) is replaced by a fresh one
				worker.terminate();
				worker = createWorker();
				fail('Tardó demasiado', true);
			} else if (!result.ok) {
				fail(result.error, result.retryable);
			} else if (seen.has(result.photo.id)) {
				progress.duplicates++;
			} else {
				seen.add(result.photo.id);
				batch.push({ photo: result.photo, file, hint: item.hint });
			}
		}
	}
}

export function createWorker() {
	return new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' });
}

/** Reads one photo in a worker: id, EXIF, thumbnail. Resolves 'timeout' when stuck. */
export function processInWorker(worker: Worker, file: File, hint?: ImportHint) {
	return new Promise<WorkerResponse | 'timeout'>((resolve) => {
		const timer = setTimeout(() => resolve('timeout'), FILE_TIMEOUT_MS);
		const done = (value: WorkerResponse | 'timeout') => {
			clearTimeout(timer);
			resolve(value);
		};
		worker.onmessage = (event: MessageEvent<WorkerResponse>) => done(event.data);
		const fail = () => done({ ok: false, error: 'No se pudo leer', retryable: true });
		worker.onerror = fail;
		worker.onmessageerror = fail;
		worker.postMessage({ file, hint } satisfies WorkerRequest);
	});
}
