import type { FeatureCollection, Point } from 'geojson';
import type { PhotoPoint } from './types';

export type PhotoFeatures = FeatureCollection<Point, { id: string; takenAt: number }>;

/** Turns photos into GeoJSON points for the map. Photos without GPS are left out. */
export function toFeatureCollection(photos: PhotoPoint[]): PhotoFeatures {
	const features: PhotoFeatures['features'] = [];
	for (const photo of photos) {
		if (photo.lat === null || photo.lng === null) continue;
		features.push({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [photo.lng, photo.lat] },
			properties: { id: photo.id, takenAt: photo.takenAt }
		});
	}
	return { type: 'FeatureCollection', features };
}
