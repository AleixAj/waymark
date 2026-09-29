/// <reference lib="webworker" />
import { readPhotoMeta, type ExifResult } from './exif';
import { createThumbnail } from './thumbnail';
import { fileFingerprint } from './fingerprint';

export interface ProcessedPhoto extends Omit<ExifResult, 'width' | 'height' | 'hasExif'> {
	id: string;
	name: string;
	size: number;
	width: number;
	height: number;
	thumb: Blob;
	previewable: boolean;
}

export type WorkerRequest = { file: File };
export type WorkerResponse =
	{ ok: true; photo: ProcessedPhoto } | { ok: false; error: string; retryable: boolean };

// Heavy work (hashing, EXIF, decode and resize) runs here so the globe never stutters.
// Finding the country and city is done once on the main thread, not in every worker.
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const { file } = event.data;
	try {
		const [id, meta] = await Promise.all([fileFingerprint(file), readPhotoMeta(file)]);
		const preview = await createThumbnail(file, meta);
		// Neither an image the browser can decode nor any camera data: not a photo
		if (!preview.decoded && !meta.hasExif) {
			self.postMessage({
				ok: false,
				error: 'Archivo dañado',
				retryable: false
			} satisfies WorkerResponse);
			return;
		}
		const { hasExif: _hasExif, ...fields } = meta;
		const photo: ProcessedPhoto = {
			...fields,
			id,
			name: file.name,
			size: file.size,
			width: preview.width,
			height: preview.height,
			thumb: preview.thumb,
			previewable: preview.decoded
		};
		self.postMessage({ ok: true, photo } satisfies WorkerResponse);
	} catch {
		self.postMessage({
			ok: false,
			error: 'Archivo dañado',
			retryable: true
		} satisfies WorkerResponse);
	}
};
