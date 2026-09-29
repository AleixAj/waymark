import { askForPersistentStorage, findExistingIds, savePhotos } from './db';
import { findPlace } from './placeFinder';
import { isRaw } from './raw';
import { toPoint, type Photo, type PhotoPoint } from './types';
import type { ProcessedPhoto, WorkerRequest, WorkerResponse } from './import.worker';

export interface ImportError {
	name: string;
	reason: string;
	/** Worth trying again (a busy or broken read), unlike a video or a full disk */
	retryable: boolean;
	file: File;
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

export function isImage(file: File) {
	return file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name) || isRaw(file);
}

export async function importPhotos(files: File[], { onProgress, onBatch, signal }: ImportOptions) {
	const queue = files.filter(isImage);
	const progress: ImportProgress = {
		total: queue.length,
		done: 0,
		withLocation: 0,
		withoutLocation: 0,
		duplicates: 0,
		// Videos and other files are listed so the user knows they were skipped
		errors: files
			.filter((file) => !isImage(file))
			.map((file) => ({ name: file.name, reason: 'No es una foto', retryable: false, file })),
		startedAt: Date.now()
	};
	onProgress({ ...progress });
	if (queue.length === 0) return progress;
	askForPersistentStorage();

	// Ids seen in this import, to skip the same photo selected twice
	const seen = new Set<string>();
	let batch: { photo: ProcessedPhoto; file: File }[] = [];
	let stopped = false;

	const flush = async () => {
		if (!batch.length || signal?.aborted) return;
		const items = batch;
		batch = [];
		const existing = await findExistingIds(items.map((item) => item.photo.id));
		const fresh = items.filter((item) => !existing.has(item.photo.id));
		progress.duplicates += items.length - fresh.length;

		const photos: Photo[] = await Promise.all(
			fresh.map(async ({ photo, file }) => ({
				...photo,
				...(await findPlace(photo.lat, photo.lng)),
				favorite: false,
				file
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
					file
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
			let file = queue.shift();
			while (file && !stopped && !signal?.aborted) {
				const result = await processInWorker(worker, file);
				if (result === 'timeout') {
					// A stuck worker (huge or broken file) is replaced by a fresh one
					worker.terminate();
					worker = createWorker();
					progress.errors.push({
						name: file.name,
						reason: 'Tardó demasiado',
						retryable: true,
						file
					});
				} else if (!result.ok) {
					progress.errors.push({
						name: file.name,
						reason: result.error,
						retryable: result.retryable,
						file
					});
				} else if (seen.has(result.photo.id)) {
					progress.duplicates++;
				} else {
					seen.add(result.photo.id);
					batch.push({ photo: result.photo, file });
				}
				progress.done++;
				onProgress({ ...progress });
				if (batch.length >= BATCH_SIZE) await flush();
				file = queue.shift();
			}
		} finally {
			worker.terminate();
		}
	}
}

function createWorker() {
	return new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' });
}

function processInWorker(worker: Worker, file: File) {
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
		worker.postMessage({ file } satisfies WorkerRequest);
	});
}
