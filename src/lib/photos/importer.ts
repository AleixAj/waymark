import { findExistingIds, savePhotos } from './db';
import type { Photo, PhotoPoint } from './types';
import type { WorkerRequest, WorkerResponse } from './import.worker';

export interface ImportProgress {
	total: number;
	done: number;
	withLocation: number;
	withoutLocation: number;
	duplicates: number;
	failed: number;
}

interface ImportOptions {
	onProgress: (progress: ImportProgress) => void;
	/** Called every few photos so the globe fills up while importing */
	onBatch: (points: PhotoPoint[]) => void;
}

const BATCH_SIZE = 24;
const IMAGE_TYPES = /^image\/(jpeg|png|webp|heic|heif|avif)$/;

/** Same file imported twice gets the same id, so we can skip it */
export function photoId(file: File) {
	return `${file.name}-${file.size}-${file.lastModified}`;
}

export function isImage(file: File) {
	return IMAGE_TYPES.test(file.type);
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
		failed: 0
	};
	onProgress({ ...progress });

	let batch: Photo[] = [];
	async function flush() {
		if (batch.length === 0) return;
		const saved = batch;
		batch = [];
		await savePhotos(saved);
		onBatch(saved.map(({ id, lat, lng, takenAt }) => ({ id, lat, lng, takenAt })));
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
					const photo: Photo = { id: photoId(file), file, ...result.photo };
					batch.push(photo);
					if (photo.lat === null) progress.withoutLocation++;
					else progress.withLocation++;
				} else {
					progress.failed++;
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
		worker.onerror = (event) => resolve({ ok: false, error: event.message });
		worker.postMessage({ file } satisfies WorkerRequest);
	});
}
