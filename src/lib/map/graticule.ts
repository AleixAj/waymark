import type { FeatureCollection, LineString } from 'geojson';

/** Latitude/longitude lines every 10°, like d3.geoGraticule10() in the design */
export function graticule(): FeatureCollection<LineString> {
	const lines: [number, number][][] = [];
	for (let lng = -180; lng < 180; lng += 10) {
		const line: [number, number][] = [];
		for (let lat = -80; lat <= 80; lat += 2) line.push([lng, lat]);
		lines.push(line);
	}
	for (let lat = -80; lat <= 80; lat += 10) {
		const line: [number, number][] = [];
		for (let lng = -180; lng <= 180; lng += 2) line.push([lng, lat]);
		lines.push(line);
	}
	return {
		type: 'FeatureCollection',
		features: lines.map((coordinates) => ({
			type: 'Feature',
			properties: {},
			geometry: { type: 'LineString', coordinates }
		}))
	};
}
