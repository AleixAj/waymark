const THUMB_SIZE = 320;

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
