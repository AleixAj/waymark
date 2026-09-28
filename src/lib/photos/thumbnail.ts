const THUMB_SIZE = 320;

/**
 * Makes a small WebP preview. createImageBitmap decodes and resizes
 * off the main thread and applies the EXIF rotation for us.
 */
export async function createThumbnail(file: Blob) {
	const bitmap = await createImageBitmap(file);
	const { width, height } = bitmap;
	const scale = Math.min(1, THUMB_SIZE / Math.max(width, height));

	const canvas = new OffscreenCanvas(Math.round(width * scale), Math.round(height * scale));
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2D canvas not available');

	ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();

	const thumb = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
	return { thumb, width, height };
}
