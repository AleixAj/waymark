import { findExistingIds, savePhotos } from './db';
import { toPoint, type Photo, type PhotoPoint } from './types';
import type { WorkerRequest, WorkerResponse } from './import.worker';

export interface ImportError {
	name: string;
	reason: string;
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
	/** Called every few photos so the globe fills up while importing */
	onBatch: (points: PhotoPoint[], thumbs: Blob[]) => void;
}

const BATCH_SIZE = 24;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif|avif|gif)$/i;

/** Same file imported twice gets the same id, so we can skip it */
export function photoId(file: File) {
	return `${file.name}-${file.size}-${file.lastModified}`;
}

export function isImage(file: File) {
	return file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name);
}

export async function importPhotos(files: File[], { onProgress, onBatch }: ImportOptions) {
	const images = files.filter(isImage);
	const existing = await findExistingIds(images.map(photoId));
	const queue = images.filter((file) => !existing.has(photoId(file)));

	const progress: ImportProgress = {
		total: images.length,
		done: existing.size,
		withLocation: 0,
		withoutLocation: 0,
		duplicates: existing.size,
		// Videos and other files are listed as errors so the user knows they were skipped
		errors: files
			.filter((file) => !isImage(file))
			.map((file) => ({ name: file.name, reason: 'No es una foto', file })),
		startedAt: Date.now()
	};
	onProgress({ ...progress });

	let batch: Photo[] = [];
	async function flush() {
		if (batch.length === 0) return;
		const saved = batch;
		batch = [];
		await savePhotos(saved);
		onBatch(
			saved.map(toPoint),
			saved.map((photo) => photo.thumb)
		);
	}

	// One worker per CPU core (max 4), each one takes the next file from the queue
	const workerCount = Math.min(4, navigator.hardwareConcurrency || 2, queue.length);
	const workers = Array.from({ length: workerCount }, () => runWorker());

	async function runWorker() {
		const worker = new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module' });
		try {
			let file = queue.shift();
			while (file) {
				const result = await processInWorker(worker, file);
				if (result.ok) {
					const photo: Photo = { id: photoId(file), file, favorite: false, ...result.photo };
					batch.push(photo);
					if (photo.lat === null) progress.withoutLocation++;
					else progress.withLocation++;
				} else {
					progress.errors.push({ name: file.name, reason: result.error, file });
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

	await Promise.all(workers);
	await flush();
	return progress;
}

function processInWorker(worker: Worker, file: File) {
	return new Promise<WorkerResponse>((resolve) => {
		worker.onmessage = (event: MessageEvent<WorkerResponse>) => resolve(event.data);
		worker.onerror = () => resolve({ ok: false, error: 'No se pudo leer' });
		worker.postMessage({ file } satisfies WorkerRequest);
	});
}
