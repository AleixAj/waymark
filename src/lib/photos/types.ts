export interface CameraInfo {
	camera: string | null;
	lens: string | null;
	/** e.g. 2.8 */
	aperture: number | null;
	/** Exposure time in seconds, e.g. 0.002 */
	exposure: number | null;
	iso: number | null;
	/** Focal length in mm */
	focal: number | null;
}

export interface PhotoMeta extends CameraInfo {
	lat: number | null;
	lng: number | null;
	altitude: number | null;
	/** Unix time in ms, taken from EXIF or the file date */
	takenAt: number;
	/** Time zone written by the camera, e.g. "+09:00" */
	offset: string | null;
}

export interface Photo extends PhotoMeta {
	id: string;
	name: string;
	width: number;
	height: number;
	/** Size of the original file in bytes */
	size: number;
	/** ISO 3166 alpha-3 code, e.g. "JPN" */
	country: string | null;
	/** City with 15k+ people; neighbourhoods and nearby towns are grouped under a big city */
	city: string | null;
	/**
	 * Neighbourhood or town inside the city's area ("Shinjuku" in Tokio).
	 * Undefined in photos saved before areas existed: they are looked up again.
	 */
	area?: string | null;
	favorite: boolean;
	/** Small WebP preview used in the map and the grids */
	thumb: Blob;
	/** The original file, kept only in this browser */
	file: Blob;
	/** Image shown instead of the file for RAW photos (the JPEG preview inside them) */
	display?: Blob;
	/** False when this browser can't show the image (e.g. HEIC outside Safari) */
	previewable?: boolean;
	/** Sample photos have no real image: the viewer paints this scene instead */
	demo?: { scene: string; label: string };
}

/** Light version of a photo used by the map, lists and stats (no blobs) */
export type PhotoPoint = Pick<
	Photo,
	'id' | 'lat' | 'lng' | 'takenAt' | 'country' | 'city' | 'area' | 'favorite'
>;

/** A photo that has GPS */
export type LocatedPoint = PhotoPoint & { lat: number; lng: number };

export function isLocated(point: PhotoPoint): point is LocatedPoint {
	return point.lat !== null && point.lng !== null;
}

export function toPoint(photo: Photo): PhotoPoint {
	const { id, lat, lng, takenAt, country, city, area, favorite } = photo;
	return { id, lat, lng, takenAt, country, city, area, favorite };
}
