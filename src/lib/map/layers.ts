import type { LayerSpecification } from 'maplibre-gl';
import { ACCENT, PHOTO_SOURCE } from './config';

// Groups of photos: the circle grows with the number of photos inside
const clusters: LayerSpecification = {
	id: 'photo-clusters',
	type: 'circle',
	source: PHOTO_SOURCE,
	filter: ['has', 'point_count'],
	paint: {
		'circle-color': ACCENT,
		'circle-opacity': 0.9,
		'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 100, 24, 1000, 32],
		'circle-stroke-width': 3,
		'circle-stroke-color': 'rgba(245, 165, 36, 0.25)'
	}
};

const clusterCount: LayerSpecification = {
	id: 'photo-cluster-count',
	type: 'symbol',
	source: PHOTO_SOURCE,
	filter: ['has', 'point_count'],
	layout: {
		'text-field': ['get', 'point_count_abbreviated'],
		'text-font': ['Noto Sans Regular'],
		'text-size': 12,
		'text-allow-overlap': true
	},
	paint: { 'text-color': '#1a1204' }
};

// A single photo that is not grouped with others
const singlePhoto: LayerSpecification = {
	id: 'photo-single',
	type: 'circle',
	source: PHOTO_SOURCE,
	filter: ['!', ['has', 'point_count']],
	paint: {
		'circle-color': ACCENT,
		'circle-radius': 6,
		'circle-stroke-width': 2,
		'circle-stroke-color': '#070b14'
	}
};

export const PHOTO_LAYERS = [clusters, clusterCount, singlePhoto];
export const CLICKABLE_LAYERS = [clusters.id, singlePhoto.id];
