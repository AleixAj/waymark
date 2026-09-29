// Builds the offline geo data used by the app:
//   static/geo/countries-50m.json  -> TopoJSON with Spanish names, ISO codes, continent and biome
//   static/geo/countries-110m.json -> same, lighter, for the small flat map in Statistics
//   static/geo/countries-map.json  -> the 50m shapes cut at the ±180° line, for MapLibre
//   static/geo/countries-info.json -> name, codes, continent and bounding box of every country
//   static/geo/cities.json         -> cities with 15k+ people (GeoNames, CC BY 4.0)
//
// Run: node scripts/build-geo.mjs
// It expects scripts/.cache/cities15000.txt from https://download.geonames.org/export/dump/
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoBounds, geoCentroid, geoEquirectangular } from 'd3-geo';
import { geoProject } from 'd3-geo-projection';
import { feature } from 'topojson-client';
import { topology } from 'topojson-server';
import countries from 'i18n-iso-countries';
import { countries as countryInfo } from 'countries-list';

const require = createRequire(import.meta.url);
countries.registerLocale(require('i18n-iso-countries/langs/es.json'));

const OUT = 'static/geo';
mkdirSync(OUT, { recursive: true });

// Same land coloring rules as the design: a few dry and polar countries,
// the rest by latitude.
const ARID = new Set(
	'EGY LBY DZA SAU MLI NER TCD MRT SDN ESH OMN YEM ARE IRN IRQ JOR SYR KWT QAT AFG PAK TKM UZB KAZ MNG AUS NAM BWA SOM ERI DJI TUN MAR ISR PSE ETH KEN ZAF ARG MEX TUR ESP'.split(
		' '
	)
);
const POLAR = new Set(['GRL', 'ATA', 'ATF', 'SJM']);

// Countries without an ISO numeric id in world-atlas
const BY_NAME = { Kosovo: 'XKX', 'N. Cyprus': 'CYN', Somaliland: 'SOL' };
const EXTRA_NAMES = { XKX: 'Kosovo', CYN: 'Chipre del Norte', SOL: 'Somalilandia' };

const CONTINENTS = {
	EU: 'Europa',
	AS: 'Asia',
	AF: 'África',
	NA: 'América',
	SA: 'América',
	OC: 'Oceanía',
	AN: 'Antártida'
};

function biomeOf(iso3, geometry) {
	if (POLAR.has(iso3)) return 'polar';
	if (ARID.has(iso3)) return 'arid';
	const lat = Math.abs(geoCentroid(geometry)[1]);
	if (lat < 20) return 'trop';
	if (lat > 55) return 'boreal';
	return 'temperate';
}

function enrich(file, outName, cutName) {
	const topo = JSON.parse(readFileSync(`node_modules/world-atlas/${file}`, 'utf8'));
	const geoms = topo.objects.countries.geometries;
	const shapes = feature(topo, topo.objects.countries).features;

	geoms.forEach((geom, i) => {
		const english = geom.properties.name;
		const iso3 = geom.id ? countries.numericToAlpha3(geom.id) : BY_NAME[english];
		// Kosovo has no official code; GeoNames (the cities) uses "XK"
		const iso2 = iso3 === 'XKX' ? 'XK' : iso3 ? countries.alpha3ToAlpha2(iso3) : undefined;
		const name = (iso3 && countries.getName(iso3, 'es')) || EXTRA_NAMES[iso3] || english;
		const continent = CONTINENTS[countryInfo[iso2]?.continent] ?? '';
		geom.id = iso3 ?? english;
		geom.properties = {
			iso3: iso3 ?? english,
			iso2: iso2 ?? '',
			name: cleanName(name),
			continent,
			biome: biomeOf(iso3, shapes[i])
		};
	});

	// d3 works on the sphere, so it gets the original shapes
	writeFileSync(`${OUT}/${outName}`, JSON.stringify(topo));
	if (cutName) writeCountryInfo(geoms, shapes);
	if (cutName) writeFileSync(`${OUT}/${cutName}`, JSON.stringify(cutAtDateLine(topo)));
	console.log(`${outName}: ${geoms.length} countries`);
}

/**
 * Small file loaded on start: every country with its names and a box to frame
 * the camera (around its biggest piece of land: the USA without Alaska).
 */
function writeCountryInfo(geoms, shapes) {
	const info = geoms.map((geom, i) => {
		const [[w, s], [e, n]] = geoBounds(mainland(shapes[i]));
		const box = [w, s, e, n].map((v) => Math.round(v * 100) / 100);
		return { ...geom.properties, bbox: box };
	});
	writeFileSync(`${OUT}/countries-info.json`, JSON.stringify(info));
	console.log(`countries-info.json: ${info.length} countries`);
}

function mainland(shape) {
	const { geometry } = shape;
	if (geometry.type !== 'MultiPolygon') return shape;
	let best = geometry.coordinates[0];
	for (const polygon of geometry.coordinates) {
		if (polygon[0].length > best[0].length) best = polygon;
	}
	return { ...shape, geometry: { type: 'Polygon', coordinates: best } };
}

/**
 * World-atlas shapes are spherical: Russia or Fiji go straight from 179° to -179°.
 * A web map is flat, so we cut every shape at the ±180° line (d3 does it while
 * "projecting" with an equirectangular projection that keeps degrees as units).
 */
function cutAtDateLine(topo) {
	const shapes = feature(topo, topo.objects.countries);
	const degrees = geoEquirectangular()
		.scale(180 / Math.PI)
		.translate([0, 0])
		.reflectY(true)
		.precision(0.1);
	const cut = geoProject(shapes, degrees);
	return topology({ countries: cut }, 1e5);
}

// i18n-iso-countries uses long official names for a few countries
function cleanName(name) {
	const short = {
		'Estados Unidos de América': 'Estados Unidos',
		'Federación de Rusia': 'Rusia',
		'República Checa': 'Chequia',
		'Reino Unido de Gran Bretaña e Irlanda del Norte': 'Reino Unido'
	};
	return short[name] ?? name.replace(/\s*\(.*\)$/, '');
}

// Spanish names for well known cities (GeoNames uses English)
const CITY_ES = {
	Tokyo: 'Tokio',
	Kyoto: 'Kioto',
	'New York City': 'Nueva York',
	Reykjavik: 'Reikiavik',
	Reykjavík: 'Reikiavik',
	Lisbon: 'Lisboa',
	London: 'Londres',
	Seville: 'Sevilla',
	Saragossa: 'Zaragoza',
	Milan: 'Milán',
	Rome: 'Roma',
	Florence: 'Florencia',
	Venice: 'Venecia',
	Naples: 'Nápoles',
	Turin: 'Turín',
	Munich: 'Múnich',
	Cologne: 'Colonia',
	Vienna: 'Viena',
	Prague: 'Praga',
	Warsaw: 'Varsovia',
	Brussels: 'Bruselas',
	Geneva: 'Ginebra',
	Zurich: 'Zúrich',
	Athens: 'Atenas',
	Istanbul: 'Estambul',
	Moscow: 'Moscú',
	'Saint Petersburg': 'San Petersburgo',
	Copenhagen: 'Copenhague',
	Stockholm: 'Estocolmo',
	Edinburgh: 'Edimburgo',
	Dublin: 'Dublín',
	Marseille: 'Marsella',
	Bordeaux: 'Burdeos',
	Nice: 'Niza',
	Strasbourg: 'Estrasburgo',
	Porto: 'Oporto',
	Marrakesh: 'Marrakech',
	Cairo: 'El Cairo',
	'Mexico City': 'Ciudad de México',
	'Ho Chi Minh City': 'Ciudad Ho Chi Minh',
	Hanoi: 'Hanói',
	Beijing: 'Pekín',
	Shanghai: 'Shanghái',
	Seoul: 'Seúl',
	Singapore: 'Singapur',
	Philadelphia: 'Filadelfia',
	'New Orleans': 'Nueva Orleans',
	Havana: 'La Habana',
	'Cape Town': 'Ciudad del Cabo',
	Berlin: 'Berlín',
	Hiroshima: 'Hiroshima',
	Amsterdam: 'Ámsterdam',
	Antwerp: 'Amberes',
	Bruges: 'Brujas',
	Krakow: 'Cracovia',
	Budapest: 'Budapest',
	Bucharest: 'Bucarest',
	Jerusalem: 'Jerusalén',
	Tunis: 'Túnez',
	Fez: 'Fez',
	Tangier: 'Tánger',
	Genoa: 'Génova',
	Palermo: 'Palermo',
	Lucerne: 'Lucerna',
	Basel: 'Basilea',
	Hamburg: 'Hamburgo',
	Frankfurt: 'Fráncfort',
	Nuremberg: 'Núremberg',
	'Rio de Janeiro': 'Río de Janeiro',
	'The Hague': 'La Haya'
};

function buildCities() {
	const source = 'scripts/.cache/cities15000.txt';
	if (!existsSync(source)) {
		console.error(
			`Missing ${source}. Download cities15000.zip from https://download.geonames.org/export/dump/ and unzip it there.`
		);
		process.exit(1);
	}
	const rows = readFileSync(source, 'utf8')
		.split('\n')
		.map((row) => row.split('\t'))
		.filter((cols) => cols.length >= 15)
		.map((cols) => ({
			name: cols[1],
			lat: cols[4],
			lng: cols[5],
			iso2: cols[8],
			population: Number(cols[14])
		}));

	// Only the biggest city with each name gets the Spanish name:
	// London is "Londres", but London in Canada stays "London"
	const biggest = new Map();
	for (const row of rows) {
		if (!CITY_ES[row.name]) continue;
		if (!biggest.has(row.name) || row.population > biggest.get(row.name).population) {
			biggest.set(row.name, row);
		}
	}

	const cities = rows.map((row) => {
		const name = biggest.get(row.name) === row ? CITY_ES[row.name] : row.name;
		// [name, lat, lng, iso2, population] keeps the file small
		return [name, round(row.lat), round(row.lng), row.iso2, row.population];
	});
	writeFileSync(`${OUT}/cities.json`, JSON.stringify(cities));
	console.log(`cities.json: ${cities.length} cities`);
}

function round(value) {
	return Math.round(Number(value) * 1e4) / 1e4;
}

enrich('countries-50m.json', 'countries-50m.json', 'countries-map.json');
enrich('countries-110m.json', 'countries-110m.json');
buildCities();
