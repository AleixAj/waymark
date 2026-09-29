import { savePhotos, saveTripEdit } from '$lib/photos/db';
import { toPoint, type Photo, type PhotoPoint } from '$lib/photos/types';
import type { ImportProgress } from '$lib/photos/importer';
import { generateDemo, type DemoPhoto } from './generate';
import type { PaintRequest, PaintResponse } from './paint.worker';

interface DemoOptions {
	onProgress: (progress: ImportProgress) => void;
	onBatch: (points: PhotoPoint[], thumbs: Blob[]) => void;
	signal?: AbortSignal;
}

const BATCH_SIZE = 60;
const PAINT_TIMEOUT_MS = 10_000;

/** Creates the sample library: paints the images in workers and saves them like a real import */
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

	const workerCount = Math.min(4, navigator.hardwareConcurrency || 2);
	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			const worker = new Worker(new URL('./paint.worker.ts', import.meta.url), { type: 'module' });
			try {
				let next = queue.shift();
				while (next && !signal?.aborted) {
					const result = await paintInWorker(worker, next);
					if ('thumb' in result) {
						const { scene, label, ...fields } = next;
						// The thumbnail doubles as "file": the viewer paints the big image from `demo`
						batch.push({
							...fields,
							thumb: result.thumb,
							file: result.thumb,
							demo: { scene, label }
						});
						if (next.lat === null) progress.withoutLocation++;
						else progress.withLocation++;
					}
					progress.done++;
					onProgress({ ...progress });
					if (batch.length >= BATCH_SIZE) await flush();
					next = queue.shift();
				}
			} finally {
				worker.terminate();
			}
		})
	);
	await flush();
	return progress;
}

function paintInWorker(worker: Worker, photo: DemoPhoto) {
	return new Promise<PaintResponse>((resolve) => {
		const timer = setTimeout(() => resolve({ error: 'timeout' }), PAINT_TIMEOUT_MS);
		const done = (value: PaintResponse) => {
			clearTimeout(timer);
			resolve(value);
		};
		worker.onmessage = (event: MessageEvent<PaintResponse>) => done(event.data);
		worker.onerror = () => done({ error: 'worker' });
		worker.postMessage({
			scene: photo.scene,
			portrait: photo.height > photo.width
		} satisfies PaintRequest);
	});
}
