// Longest side of the light copy saved in Google Drive
const SYNC_SIZE = 2048;
// A JPEG already this small goes up as it is (keeping its EXIF)
const SYNC_KEEP_BYTES = 1.5 * 1024 * 1024;

/**
 * Light copy of a photo for Google Drive: at most 2048 px, about 20 times smaller
 * than the original, still sharp on any screen. Formats this browser can't
 * decode (HEIC in Chrome) go up as they are.
 */
export async function syncCopy(file: Blob, display?: Blob): Promise<Blob> {
	const source = display ?? file;
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(source);
	} catch {
		return file;
	}
	const scale = Math.min(1, SYNC_SIZE / Math.max(bitmap.width, bitmap.height));
	if (scale === 1 && source.type === 'image/jpeg' && source.size <= SYNC_KEEP_BYTES) {
		bitmap.close();
		return source;
	}
	const canvas = new OffscreenCanvas(
		Math.round(bitmap.width * scale),
		Math.round(bitmap.height * scale)
	);
	const ctx = canvas.getContext('2d')!;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
