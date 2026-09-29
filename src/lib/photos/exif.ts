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
	'FocalLength'
];

/** Reads GPS position, capture date and camera settings from the photo */
export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
	let data: Record<string, unknown> | undefined;
	try {
		// exifr adds decimal latitude/longitude when the raw GPS tags are picked
		data = await exifr.parse(file, { pick: TAGS });
	} catch {
		// Files without EXIF (screenshots, PNGs...) are still valid photos
		data = undefined;
	}

	return {
		lat: toCoordinate(data?.latitude, 90),
		lng: toCoordinate(data?.longitude, 180),
		altitude: toNumber(data?.GPSAltitude),
		takenAt:
			toTime(data?.DateTimeOriginal ?? data?.CreateDate ?? data?.ModifyDate) ?? file.lastModified,
		offset: typeof data?.OffsetTimeOriginal === 'string' ? data.OffsetTimeOriginal : null,
		camera: cameraName(data?.Make, data?.Model),
		lens: typeof data?.LensModel === 'string' ? data.LensModel : null,
		aperture: toNumber(data?.FNumber),
		exposure: toNumber(data?.ExposureTime),
		iso: toNumber(data?.ISO),
		focal: toNumber(data?.FocalLength)
	};
}

export function toCoordinate(value: unknown, limit: number): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	if (Math.abs(value) > limit) return null;
	return value;
}

export function toTime(value: unknown): number | null {
	if (!(value instanceof Date)) return null;
	const time = value.getTime();
	return Number.isNaN(time) ? null : time;
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
