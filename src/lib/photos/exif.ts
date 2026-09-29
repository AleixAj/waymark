import exifr from 'exifr';
import type { PhotoMeta } from './types';

// Only these tags are parsed, which keeps reading fast
const TAGS = [
	'GPSLatitude',
	'GPSLatitudeRef',
	'GPSLongitude',
	'GPSLongitudeRef',
	'GPSAltitude',
	'DateTimeOriginal',
	'CreateDate',
	'ModifyDate',
	'OffsetTimeOriginal',
	'Make',
	'Model',
	'LensModel',
	'FNumber',
	'ExposureTime',
	'ISO',
	'FocalLength',
	'ExifImageWidth',
	'ExifImageHeight'
];

// Dates before this come from a camera with its clock never set
const OLDEST_PHOTO = Date.UTC(1990, 0, 1);
const DAY = 86_400_000;

export interface ExifResult extends PhotoMeta {
	/** Size of the original image, when the camera wrote it */
	width: number | null;
	height: number | null;
	/** The file had readable EXIF data (a real photo, even if the browser can't show it) */
	hasExif: boolean;
}

/** Reads GPS position, capture date and camera settings from the photo */
export async function readPhotoMeta(file: File, now = Date.now()): Promise<ExifResult> {
	let data: Record<string, unknown> | undefined;
	try {
		// exifr adds decimal latitude/longitude when the raw GPS tags are picked
		data = await exifr.parse(file, { pick: TAGS });
	} catch {
		// Files without EXIF (screenshots, PNGs...) are still valid photos
		data = undefined;
	}

	const offset = toOffset(data?.OffsetTimeOriginal);
	// Each date is checked on its own: a broken DateTimeOriginal falls back to CreateDate
	const takenAt =
		toTime(data?.DateTimeOriginal, offset, now) ??
		toTime(data?.CreateDate, offset, now) ??
		toTime(data?.ModifyDate, offset, now) ??
		file.lastModified;

	return {
		...toPosition(data?.latitude, data?.longitude),
		altitude: toNumber(data?.GPSAltitude),
		takenAt,
		offset,
		camera: cameraName(data?.Make, data?.Model),
		lens: typeof data?.LensModel === 'string' ? data.LensModel : null,
		aperture: toNumber(data?.FNumber),
		exposure: toNumber(data?.ExposureTime),
		iso: toNumber(data?.ISO),
		focal: toNumber(data?.FocalLength),
		width: toNumber(data?.ExifImageWidth),
		height: toNumber(data?.ExifImageHeight),
		hasExif: !!data && Object.keys(data).length > 0
	};
}

export function toCoordinate(value: unknown, limit: number): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	if (Math.abs(value) > limit) return null;
	return value;
}

/** Latitude and longitude, or nulls. Phones without signal often write 0,0 ("null island"). */
export function toPosition(lat: unknown, lng: unknown) {
	const la = toCoordinate(lat, 90);
	const lo = toCoordinate(lng, 180);
	if (la === null || lo === null || (la === 0 && lo === 0)) return { lat: null, lng: null };
	return { lat: la, lng: lo };
}

/**
 * EXIF dates have no time zone, so exifr reads them as local time of this browser.
 * When the camera also wrote its offset ("+09:00"), we turn that wall clock into
 * the real moment, so photos from a phone and a camera sort correctly.
 */
export function toTime(value: unknown, offset: string | null = null, now = Date.now()) {
	if (!(value instanceof Date)) return null;
	let time = value.getTime();
	if (Number.isNaN(time)) return null;
	if (offset) {
		const wallClock = Date.UTC(
			value.getFullYear(),
			value.getMonth(),
			value.getDate(),
			value.getHours(),
			value.getMinutes(),
			value.getSeconds()
		);
		time = wallClock - offsetMinutes(offset) * 60_000;
	}
	// A camera with a wrong clock can say 1970 or 2099
	if (time < OLDEST_PHOTO || time > now + 2 * DAY) return null;
	return time;
}

/** "+09:00" stays, anything else becomes null */
export function toOffset(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const text = value.trim();
	return /^[+-]\d{2}:\d{2}$/.test(text) ? text : null;
}

export function offsetMinutes(offset: string) {
	const sign = offset.startsWith('-') ? -1 : 1;
	const [hours, minutes] = offset.slice(1).split(':').map(Number);
	return sign * (hours * 60 + minutes);
}

function toNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** "FUJIFILM" + "X-T5" -> "Fujifilm X-T5" (skips the brand when the model already has it) */
export function cameraName(make: unknown, model: unknown): string | null {
	const m = typeof model === 'string' ? model.trim() : '';
	const b = typeof make === 'string' ? make.trim() : '';
	if (!m) return b || null;
	if (!b || m.toLowerCase().startsWith(b.toLowerCase().split(' ')[0])) return m;
	const brand = b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
	return `${brand.split(' ')[0]} ${m}`;
}
