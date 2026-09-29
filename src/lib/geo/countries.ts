import { geoBounds, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';

export interface CountryProps {
	iso3: string;
	iso2: string;
	name: string;
	continent: string;
	biome: 'polar' | 'arid' | 'trop' | 'boreal' | 'temperate';
}

export type CountryFeature = Feature<Polygon | MultiPolygon, CountryProps>;
export type CountryTopology = Topology<{ countries: GeometryCollection<CountryProps> }>;

export const TOTAL_COUNTRIES = 195;

export function toCountryFeatures(topology: CountryTopology) {
	return feature(topology, topology.objects.countries).features as CountryFeature[];
}

/** Finds which country a point belongs to. A bounding box check skips most countries quickly. */
export class CountryIndex {
	private items: { feature: CountryFeature; box: [[number, number], [number, number]] }[];

	constructor(features: CountryFeature[]) {
		this.items = features.map((f) => ({ feature: f, box: geoBounds(f) }));
	}

	find(lat: number, lng: number): CountryProps | null {
		for (const { feature, box } of this.items) {
			if (!inBox(box, lat, lng)) continue;
			if (geoContains(feature, [lng, lat])) return feature.properties;
		}
		return null;
	}
}

function inBox(box: [[number, number], [number, number]], lat: number, lng: number) {
	const [[west, south], [east, north]] = box;
	if (lat < south || lat > north) return false;
	// Boxes that cross the date line have west > east
	return west <= east ? lng >= west && lng <= east : lng >= west || lng <= east;
}
