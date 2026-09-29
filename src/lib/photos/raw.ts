import exifr from 'exifr';

export { isRaw } from './formats';

export interface EmbeddedJpeg {
	bytes: Uint8Array;
	width: number;
	height: number;
}

// Previews smaller than this are the tiny ones for the file browser
const MIN_PREVIEW_BYTES = 8 * 1024;

/**
 * Finds the JPEG images stored inside a RAW file, biggest first.
 * It looks for the JPEG start mark and walks the JPEG structure to find where it ends.
 * Only normal JPEGs are kept: many RAWs store the sensor data as "lossless JPEG",
 * which browsers can't decode.
 */
export function findJpegs(bytes: Uint8Array): EmbeddedJpeg[] {
	const found: EmbeddedJpeg[] = [];
	let i = 0;
	while (i < bytes.length - 3) {
		if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
			const jpeg = readJpeg(bytes, i);
			if (jpeg) {
				if (jpeg.bytes.length >= MIN_PREVIEW_BYTES) found.push(jpeg);
				// Skip the whole image (and the small thumbnail inside its own EXIF)
				i += jpeg.bytes.length;
				continue;
			}
		}
		i++;
	}
	return found.sort((a, b) => b.width * b.height - a.width * a.height);
}

/** Reads one JPEG starting at `start`, or null if it isn't a JPEG a browser can show */
function readJpeg(bytes: Uint8Array, start: number): EmbeddedJpeg | null {
	let width = 0;
	let height = 0;
	let i = start + 2;
	while (i + 4 <= bytes.length) {
		if (bytes[i] !== 0xff) return null;
		const marker = bytes[i + 1];
		// Padding between segments
		if (marker === 0xff) {
			i++;
			continue;
		}
		if (marker === 0xd9) return null;
		const length = (bytes[i + 2] << 8) | bytes[i + 3];
		if (length < 2) return null;
		// Frame header: baseline (C0), extended (C1) and progressive (C2) are fine.
		// Any other type (lossless C3, arithmetic...) is not shown by browsers.
		if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
			if (marker > 0xc2) return null;
			height = (bytes[i + 5] << 8) | bytes[i + 6];
			width = (bytes[i + 7] << 8) | bytes[i + 8];
		}
		i += 2 + length;
		// Start of scan: compressed data follows until the next real marker
		if (marker === 0xda) {
			i = skipScan(bytes, i);
			if (i < 0) return null;
			if (bytes[i + 1] === 0xd9) {
				if (!width || !height) return null;
				return { bytes: bytes.subarray(start, i + 2), width, height };
			}
		}
	}
	return null;
}

/** Index of the marker after the compressed data (FF 00 and restart marks belong to the data) */
function skipScan(bytes: Uint8Array, i: number) {
	for (; i < bytes.length - 1; i++) {
		if (bytes[i] !== 0xff) continue;
		const next = bytes[i + 1];
		if (next === 0x00 || next === 0xff || (next >= 0xd0 && next <= 0xd7)) continue;
		return i;
	}
	return -1;
}

/**
 * EXIF data of RAW formats that exifr doesn't read by itself.
 * Returns the same fields as exifr.parse, or undefined.
 */
export async function readRawTags(
	bytes: Uint8Array,
	jpegs: EmbeddedJpeg[],
	options: object
): Promise<Record<string, unknown> | undefined> {
	const fromFile = (await patchedTiffTags(bytes, options)) ?? (await cr3Tags(bytes));
	// Some cameras (Fujifilm, Panasonic) write the full EXIF only inside the preview
	let fromPreview: Record<string, unknown> | undefined;
	for (const jpeg of jpegs) {
		fromPreview = await safeParse(jpeg.bytes, options);
		if (fromPreview) break;
	}
	if (!fromFile && !fromPreview) return undefined;
	// The RAW itself wins, the preview fills what is missing
	return { ...fromPreview, ...fromFile };
}

/**
 * Olympus (ORF) and Panasonic (RW2) files are TIFF files with their own start mark.
 * With the normal TIFF mark exifr reads them like any other TIFF.
 */
async function patchedTiffTags(bytes: Uint8Array, options: object) {
	// "IIRO" / "IIRS" (Olympus) or "IIU" (Panasonic) instead of "II*"
	const custom = bytes[0] === 0x49 && bytes[1] === 0x49 && (bytes[2] === 0x52 || bytes[2] === 0x55);
	if (!custom) return undefined;
	const copy = bytes.slice(0, Math.min(bytes.length, 4 * 1024 * 1024));
	copy[2] = 0x2a;
	copy[3] = 0x00;
	return safeParse(copy, options);
}

// TIFF tag numbers inside the Canon CR3 boxes
const TAG = {
	make: 0x010f,
	model: 0x0110,
	orientation: 0x0112,
	exposure: 0x829a,
	fNumber: 0x829d,
	iso: 0x8827,
	dateOriginal: 0x9003,
	dateCreate: 0x9004,
	offset: 0x9011,
	focal: 0x920a,
	width: 0xa002,
	height: 0xa003,
	lens: 0xa434,
	latRef: 1,
	lat: 2,
	lngRef: 3,
	lng: 4,
	altitude: 6
};

/**
 * Canon CR3 keeps its EXIF in boxes: CMT1 (camera), CMT2 (photo settings)
 * and CMT4 (GPS). Each one is a small TIFF file.
 */
async function cr3Tags(bytes: Uint8Array) {
	// "ftypcrx " at the start marks a CR3
	const kind = ascii(bytes, 4, 12);
	if (kind !== 'ftypcrx ') return undefined;
	const head = bytes.subarray(0, Math.min(bytes.length, 1024 * 1024));
	const [camera, photo, gps] = await Promise.all(
		['CMT1', 'CMT2', 'CMT4'].map((name) => {
			const box = findBox(head, name);
			return box ? readIfd0(box) : undefined;
		})
	);
	if (!camera && !photo && !gps) return undefined;

	const tags: Record<string, unknown> = {
		Make: camera?.[TAG.make],
		Model: camera?.[TAG.model],
		Orientation: camera?.[TAG.orientation],
		ExposureTime: photo?.[TAG.exposure],
		FNumber: photo?.[TAG.fNumber],
		ISO: first(photo?.[TAG.iso]),
		DateTimeOriginal: exifDate(photo?.[TAG.dateOriginal]),
		CreateDate: exifDate(photo?.[TAG.dateCreate]),
		OffsetTimeOriginal: photo?.[TAG.offset],
		FocalLength: photo?.[TAG.focal],
		ExifImageWidth: photo?.[TAG.width],
		ExifImageHeight: photo?.[TAG.height],
		LensModel: photo?.[TAG.lens],
		GPSAltitude: gps?.[TAG.altitude]
	};
	if (gps) {
		tags.latitude = degrees(gps[TAG.lat], gps[TAG.latRef], 'S');
		tags.longitude = degrees(gps[TAG.lng], gps[TAG.lngRef], 'W');
	}
	return tags;
}

/** Contents of the first box with this name (a 4 byte size comes before the name) */
function findBox(bytes: Uint8Array, name: string) {
	for (let i = 4; i < bytes.length - 4; i++) {
		if (ascii(bytes, i, i + 4) !== name) continue;
		const size =
			((bytes[i - 4] << 24) | (bytes[i - 3] << 16) | (bytes[i - 2] << 8) | bytes[i - 1]) >>> 0;
		if (size < 8 || i - 4 + size > bytes.length) return undefined;
		return bytes.subarray(i + 4, i - 4 + size);
	}
	return undefined;
}

/** First folder of tags of a TIFF, with tag numbers as keys and raw values */
function readIfd0(tiff: Uint8Array) {
	return safeParse(tiff, {
		tiff: true,
		ifd0: true,
		exif: false,
		gps: false,
		interop: false,
		ifd1: false,
		translateKeys: false,
		translateValues: false,
		reviveValues: false,
		mergeOutput: true
	}) as Promise<Record<number, unknown> | undefined>;
}

async function safeParse(data: Uint8Array, options: object) {
	try {
		const result = await exifr.parse(data, options);
		return result && Object.keys(result).length ? (result as Record<string, unknown>) : undefined;
	} catch {
		return undefined;
	}
}

/** "2024:05:01 10:30:00" -> Date in local time, like exifr does */
export function exifDate(value: unknown) {
	if (typeof value !== 'string') return undefined;
	const m = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
	if (!m) return undefined;
	const [, y, mo, d, h, mi, s] = m.map(Number);
	return new Date(y, mo - 1, d, h, mi, s);
}

/** [degrees, minutes, seconds] + "N"/"S" -> signed decimal degrees */
export function degrees(value: unknown, ref: unknown, negative: string) {
	const parts =
		Array.isArray(value) || ArrayBuffer.isView(value) ? Array.from(value as number[]) : [];
	if (parts.length !== 3 || parts.some((n) => typeof n !== 'number')) return undefined;
	const decimal = parts[0] + parts[1] / 60 + parts[2] / 3600;
	return typeof ref === 'string' && ref.trim().toUpperCase() === negative ? -decimal : decimal;
}

function first(value: unknown) {
	return Array.isArray(value) ? value[0] : value;
}

function ascii(bytes: Uint8Array, from: number, to: number) {
	return String.fromCharCode(...bytes.subarray(from, to));
}
