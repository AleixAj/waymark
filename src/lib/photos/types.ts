export interface Photo {
	id: string;
	name: string;
	lat: number | null;
	lng: number | null;
	/** Unix time in ms, taken from EXIF or the file date */
	takenAt: number;
	width: number;
	height: number;
	/** Small WebP preview used in the map and the grids */
	thumb: Blob;
	/** The original file, kept only in this browser */
	file: Blob;
}

/** What the map needs to draw a photo, without the heavy blobs */
export type PhotoPoint = Pick<Photo, 'id' | 'lat' | 'lng' | 'takenAt'>;

/** Result that the import worker sends back for each file */
export type ProcessedPhoto = Omit<Photo, 'id' | 'file'>;
