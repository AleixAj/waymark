/// <reference lib="webworker" />
import { readPhotoMeta } from './exif';
import { createThumbnail } from './thumbnail';
import type { ProcessedPhoto } from './types';

export type WorkerRequest = { file: File };
export type WorkerResponse = { ok: true; photo: ProcessedPhoto } | { ok: false; error: string };

// Heavy work (decode, resize, EXIF) runs here so the globe never stutters.
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const { file } = event.data;
	try {
		const [meta, preview] = await Promise.all([readPhotoMeta(file), createThumbnail(file)]);
		const photo: ProcessedPhoto = { name: file.name, ...meta, ...preview };
		self.postMessage({ ok: true, photo } satisfies WorkerResponse);
	} catch (error) {
		self.postMessage({ ok: false, error: String(error) } satisfies WorkerResponse);
	}
};
