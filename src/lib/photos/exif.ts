import exifr from 'exifr';

export interface PhotoMeta {
	lat: number | null;
	lng: number | null;
	takenAt: number;
}

/** Reads GPS position and capture date. Only the first KBs of the file are parsed. */
export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
	let data: Record<string, unknown> | undefined;
	try {
		// Pick the raw GPS tags; exifr then adds the decimal latitude/longitude for us
		data = await exifr.parse(file, {
			pick: [
				'GPSLatitude',
				'GPSLatitudeRef',
				'GPSLongitude',
				'GPSLongitudeRef',
				'DateTimeOriginal',
				'CreateDate',
				'ModifyDate'
			]
		});
	} catch {
		// Files without EXIF (screenshots, PNGs...) are still valid photos
		data = undefined;
	}

	return {
		lat: toCoordinate(data?.latitude, 90),
		lng: toCoordinate(data?.longitude, 180),
		takenAt:
			toTime(data?.DateTimeOriginal ?? data?.CreateDate ?? data?.ModifyDate) ?? file.lastModified
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
