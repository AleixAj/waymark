import exifr from 'exifr';
import type { EmbeddedJpeg } from './raw';

const THUMB_SIZE = 320;
// Longest side of the image shown in the viewer for RAW files
const DISPLAY_SIZE = 2560;

export interface Preview {
	thumb: Blob;
	width: number;
	height: number;
	/** False when the browser couldn't decode the image (e.g. HEIC in Chrome) */
	decoded: boolean;
}

/**
 * Makes a small WebP preview. The image is resized while it is decoded, so a
 * 100 MP panorama never sits in memory at full size. createImageBitmap also
 * applies the EXIF rotation for us.
 */
export async function createThumbnail(
	file: Blob,
	knownSize: { width: number | null; height: number | null }
): Promise<Preview> {
	try {
		// Only the width is given, the browser keeps the proportions
		const bitmap = await createImageBitmap(file, {
			resizeWidth: THUMB_SIZE,
			resizeQuality: 'medium'
		});
		// A portrait photo would come out 320 px wide and very tall: fit it in the box instead
		const scale = Math.min(1, THUMB_SIZE / Math.max(bitmap.width, bitmap.height));
		const canvas = new OffscreenCanvas(
			Math.round(bitmap.width * scale),
			Math.round(bitmap.height * scale)
		);
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		const ratio = bitmap.width / bitmap.height;
		bitmap.close();

		const thumb = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
		const size = await originalSize(file, knownSize, ratio);
		return { thumb, ...size, decoded: true };
	} catch {
		// The photo is still useful for the map (GPS and date were read), so it gets a placeholder
		const thumb = await placeholder();
		return { thumb, width: knownSize.width ?? 0, height: knownSize.height ?? 0, decoded: false };
	}
}

/**
 * Turns the preview found inside a RAW file into a JPEG the viewer can show:
 * upright and at most 2560 px. Tries the next preview if one doesn't decode.
 */
export async function rawDisplayImage(
	jpegs: EmbeddedJpeg[],
	orientation: number
): Promise<Blob | null> {
	for (const jpeg of jpegs) {
		try {
			return await uprightJpeg(jpeg, orientation);
		} catch {
			// Try the next one
		}
	}
	return null;
}

async function uprightJpeg(jpeg: EmbeddedJpeg, orientation: number) {
	// Copied into its own buffer: the bytes are a view of the whole RAW file
	const blob = new Blob([jpeg.bytes.slice()], { type: 'image/jpeg' });
	// A preview with its own rotation is turned by the browser when decoded
	const own = await exifr.orientation(jpeg.bytes).catch(() => undefined);
	const turn = own ? 1 : orientation;
	const scale = Math.min(1, DISPLAY_SIZE / Math.max(jpeg.width, jpeg.height));
	if (turn === 1 && scale === 1) {
		// Already fine: just check the browser can decode it
		(await createImageBitmap(blob)).close();
		return blob;
	}

	const bitmap = await createImageBitmap(blob, {
		resizeWidth: Math.round(jpeg.width * scale),
		resizeHeight: Math.round(jpeg.height * scale),
		resizeQuality: 'high'
	});
	const w = bitmap.width;
	const h = bitmap.height;
	const sideways = turn >= 5;
	const canvas = new OffscreenCanvas(sideways ? h : w, sideways ? w : h);
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(...orientationMatrix(turn, w, h));
	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();
	return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
}

/** Canvas transform that draws an image stored with this EXIF orientation upright */
export function orientationMatrix(
	orientation: number,
	w: number,
	h: number
): [number, number, number, number, number, number] {
	switch (orientation) {
		case 2:
			return [-1, 0, 0, 1, w, 0]; // mirrored
		case 3:
			return [-1, 0, 0, -1, w, h]; // upside down
		case 4:
			return [1, 0, 0, -1, 0, h];
		case 5:
			return [0, 1, 1, 0, 0, 0];
		case 6:
			return [0, 1, -1, 0, h, 0]; // turned 90° right
		case 7:
			return [0, -1, -1, 0, h, w];
		case 8:
			return [0, -1, 1, 0, 0, w]; // turned 90° left
		default:
			return [1, 0, 0, 1, 0, 0];
	}
}

/** Real size of the photo: from EXIF when possible, else by decoding it once */
async function originalSize(
	file: Blob,
	known: { width: number | null; height: number | null },
	ratio: number
) {
	if (known.width && known.height) return { width: known.width, height: known.height };
	try {
		const full = await createImageBitmap(file);
		const size = { width: full.width, height: full.height };
		full.close();
		return size;
	} catch {
		// Too big to decode at full size: keep at least the right proportions
		return { width: Math.round(THUMB_SIZE * ratio), height: THUMB_SIZE };
	}
}

/** Grey card with a camera icon look, for photos the browser can't show */
async function placeholder() {
	const canvas = new OffscreenCanvas(THUMB_SIZE, Math.round(THUMB_SIZE * 0.66));
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#2a3342';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
	ctx.lineWidth = 3;
	ctx.strokeRect(canvas.width / 2 - 26, canvas.height / 2 - 18, 52, 36);
	ctx.beginPath();
	ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, Math.PI * 2);
	ctx.stroke();
	return canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
}
