import { savePhotos, saveTripEdit } from '$lib/photos/db';
import { toPoint, type Photo, type PhotoPoint } from '$lib/photos/types';
import type { ImportProgress } from '$lib/photos/importer';
import { generateDemo, type DemoPhoto } from './generate';
import type { PaintRequest, PaintResponse } from './paint.worker';

interface DemoOptions {
	onProgress: (progress: ImportProgress) => void;
	onBatch: (points: PhotoPoint[], thumbs: Blob[]) => void;
}

const BATCH_SIZE = 60;

/** Creates the sample library: paints the images in workers and saves them like a real import */
export async function loadDemo({ onProgress, onBatch }: DemoOptions) {
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

	const queue = [...photos];
	let batch: Photo[] = [];
	const flush = async () => {
		if (!batch.length) return;
		const saved = batch;
		batch = [];
		await savePhotos(saved);
		onBatch(
			saved.map(toPoint),
			saved.map((p) => p.thumb)
		);
	};

	const workerCount = Math.min(4, navigator.hardwareConcurrency || 2);
	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			const worker = new Worker(new URL('./paint.worker.ts', import.meta.url), { type: 'module' });
			let next = queue.shift();
			while (next) {
				const { thumb } = await paintInWorker(worker, next);
				const { scene, label, ...fields } = next;
				// The thumbnail doubles as "file": the viewer paints the big image from `demo`
				batch.push({ ...fields, thumb, file: thumb, demo: { scene, label } });
				if (next.lat === null) progress.withoutLocation++;
				else progress.withLocation++;
				progress.done++;
				onProgress({ ...progress });
				if (batch.length >= BATCH_SIZE) await flush();
				next = queue.shift();
			}
			worker.terminate();
		})
	);
	await flush();
}

function paintInWorker(worker: Worker, photo: DemoPhoto) {
	return new Promise<PaintResponse>((resolve) => {
		worker.onmessage = (event: MessageEvent<PaintResponse>) => resolve(event.data);
		worker.postMessage({
			scene: photo.scene,
			portrait: photo.height > photo.width
		} satisfies PaintRequest);
	});
}
