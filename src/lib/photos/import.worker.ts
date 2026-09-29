/// <reference lib="webworker" />
import { readPhotoMeta, toPosition, type ExifResult, type RawFile } from './exif';
import { createThumbnail, rawDisplayImage } from './thumbnail';
import { fileFingerprint } from './fingerprint';
import { findJpegs, isRaw } from './raw';

export interface ProcessedPhoto extends Omit<
	ExifResult,
	'width' | 'height' | 'hasExif' | 'orientation'
> {
	id: string;
	name: string;
	size: number;
	width: number;
	height: number;
	thumb: Blob;
	previewable: boolean;
	/** Image to show for RAW files (the JPEG preview stored inside them) */
	display?: Blob;
}

/** What we know about a photo from outside the file */
export interface ImportHint {
	/** Google Takeout keeps the location even when the photo lost it */
	lat?: number;
	lng?: number;
	altitude?: number;
	/** Capture time, used when the photo has no date inside */
	takenAt?: number;
	/** The photo is a file in the user's Google Drive */
	driveId?: string;
	/** Album or folder it came from */
	album?: string;
}

export type WorkerRequest = { file: File; hint?: ImportHint };
export type WorkerResponse =
	{ ok: true; photo: ProcessedPhoto } | { ok: false; error: string; retryable: boolean };

// Heavy work (hashing, EXIF, decode and resize) runs here so the globe never stutters.
// Finding the country and city is done once on the main thread, not in every worker.
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const { file, hint } = event.data;
	try {
		const raw = isRaw(file) ? await readRaw(file) : undefined;
		const [id, meta] = await Promise.all([
			fileFingerprint(file),
			readPhotoMeta(file, Date.now(), raw, hint?.takenAt)
		]);
		// The GPS inside the photo wins; the hint fills it when missing
		if (meta.lat === null && hint) {
			Object.assign(meta, toPosition(hint.lat, hint.lng));
			if (meta.lat !== null) meta.altitude ??= hint.altitude ?? null;
		}
		const display = raw ? await rawDisplayImage(raw.jpegs, meta.orientation) : null;
		const preview = await createThumbnail(display ?? file, meta);
		// Neither an image the browser can decode nor any camera data: not a photo
		if (!preview.decoded && !meta.hasExif) {
			self.postMessage({
				ok: false,
				error: 'Archivo dañado',
				retryable: false
			} satisfies WorkerResponse);
			return;
		}
		const { hasExif: _hasExif, orientation: _orientation, ...fields } = meta;
		const photo: ProcessedPhoto = {
			...fields,
			id,
			name: file.name,
			size: file.size,
			width: preview.width,
			height: preview.height,
			thumb: preview.thumb,
			previewable: preview.decoded,
			...(display && { display })
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

async function readRaw(file: File): Promise<RawFile> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	return { bytes, jpegs: findJpegs(bytes) };
}
