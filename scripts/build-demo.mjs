// Builds the photo list of the sample library from Wikimedia Commons:
//   src/lib/demo/photos.json  -> real photos near every stop of the demo trips
//   docs/demo-credits.md      -> author and license of each photo
//   static/demo/thumbs.bin    -> every thumbnail as WebP in one file, so the demo
//                                loads with one download instead of 600
//
// Only freely licensed photos (CC0, public domain, CC BY, CC BY-SA) are used,
// and the viewer shows the author and license of each one.
// Run with: node scripts/build-demo.mjs  (needs internet, takes a few minutes)
// With --pack it keeps the chosen photos and only rebuilds the thumbnails file.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { TRIPS } from '../src/lib/demo/data.ts';

const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks every script to say who it is
const USER_AGENT = 'waymark-demo-builder/1.0 (https://github.com/AleixAj/waymark)';
// A real album has fewer photos than the old painted demo: about a third of them
const SHARE = 0.35;
const MIN_PER_STOP = 3;
// Places around home (Madrid): everyday photos spread over the years
const HOME_SPOTS = [
	[40.4153, -3.6845], // Retiro
	[40.4199, -3.7059], // Gran Vía
	[40.418, -3.7143], // Palacio Real
	[40.4154, -3.7074], // Plaza Mayor
	[40.4531, -3.6883], // Castellana
	[40.3954, -3.7009] // Madrid Río
];
const HOME_PHOTOS = 48;
const UNLOCATED_PHOTOS = 22;

const ALLOWED_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? [\d.]+)/i;
// Photos a traveller wouldn't take: people's portraits, street-view captures,
// trains by their series number, event pictures
const NOT_TRAVEL =
	/\b(cropped|mapillary|portrait|retrato|headshot|series|serie|emu|dmu|locomotive|premios?|festival|exhibici[oó]n|wikipedia|conference|press)\b/i;
const PERSON_NAME = /^\p{Lu}\p{Ll}+( \p{Lu}\p{Ll}+){1,2}\.[jJ][pP][eE]?[gG]$/u;
// Files that are not photos at all
const NOT_A_PHOTO =
	/\b(map|mapa|plan|diagram|logo|coat of arms|escudo|flag|bandera|sign|plaque|document|drawing|painting|poster|stamp|coin|scan|chart|seal|icon|text)\b/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
	const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
	for (let attempt = 0; attempt < 4; attempt++) {
		const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
		if (response.ok) return response.json();
		await sleep(2000 * (attempt + 1));
	}
	throw new Error(`Commons did not answer: ${url}`);
}

const clean = (html = '') =>
	html
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();

// Photos near a point, best first: the ones Commons reviewers marked as quality or
// valued images are usually the landmarks a traveller photographs. Small places
// without them fall back to any photo nearby.
const SEARCHES = [
	'incategory:"Quality_images"',
	'incategory:"Valued_images_sorted_by_promotion_date"',
	''
];

/** Photos near a point, with their size, license, author and camera */
async function photosNear(lat, lng, radius, level) {
	const km = Math.max(1, Math.min(30, Math.round(radius / 1000)));
	const data = await api({
		action: 'query',
		generator: 'search',
		gsrsearch: `filetype:bitmap nearcoord:${km}km,${lat},${lng} ${SEARCHES[level]}`.trim(),
		gsrnamespace: '6',
		gsrlimit: '50',
		prop: 'imageinfo|coordinates',
		colimit: 'max',
		iiprop: 'url|size|mime|extmetadata|commonmetadata',
		iiurlwidth: '330',
		iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl'
	});
	return (data.query?.pages ?? []).flatMap((page) => {
		const info = page.imageinfo?.[0];
		const where = page.coordinates?.[0];
		if (!info || !where || info.mime !== 'image/jpeg' || !info.thumburl) return [];
		const meta = info.extmetadata ?? {};
		const license = meta.LicenseShortName?.value ?? '';
		const author = clean(meta.Artist?.value);
		if (!ALLOWED_LICENSE.test(license) || !author) return [];
		const title = page.title.replace(/^File:/, '');
		if (NOT_A_PHOTO.test(title) || NOT_TRAVEL.test(title)) return [];
		// A vertical photo named just "Firstname Lastname.jpg" is someone's portrait
		if (info.height > info.width && PERSON_NAME.test(title)) return [];
		if (Math.min(info.width, info.height) < 1200) return [];
		const ratio = info.width / info.height;
		if (ratio > 2 || ratio < 0.6) return [];
		const exif = Object.fromEntries((info.commonmetadata ?? []).map((m) => [m.name, m.value]));
		return [
			{
				title,
				lat: Math.round(where.lat * 1e5) / 1e5,
				lng: Math.round(where.lon * 1e5) / 1e5,
				width: info.width,
				height: info.height,
				thumb: info.thumburl,
				page: info.descriptionurl,
				author: author.slice(0, 80),
				license,
				licenseUrl: meta.LicenseUrl?.value ?? '',
				camera: cameraOf(exif),
				aperture: number(exif.FNumber),
				exposure: number(exif.ExposureTime),
				iso: number(exif.ISOSpeedRatings),
				focal: number(exif.FocalLength),
				level
			}
		];
	});
}

/** "10/40" or "0.004" -> number */
function number(value) {
	if (value === undefined || value === null || value === '') return null;
	const text = String(value);
	const [a, b] = text.split('/').map(Number);
	const n = b ? a / b : Number(text);
	return Number.isFinite(n) && n > 0 ? Math.round(n * 10000) / 10000 : null;
}

function cameraOf(exif) {
	const model = String(exif.Model ?? '').trim();
	const make = String(exif.Make ?? '').trim();
	if (!model) return null;
	// Photo apps write themselves as the "camera"
	if (/photoshop|lightroom|playmemories|picasa|gimp/i.test(model)) return null;
	const brand = make.split(' ')[0];
	return model.toLowerCase().startsWith(brand.toLowerCase()) || !brand
		? model
		: `${brand.charAt(0)}${brand.slice(1).toLowerCase()} ${model}`;
}

/** Best photos first (quality, then valued, then any), never two alike */
function pick(photos, want, used) {
	const sorted = [...photos].sort((a, b) => a.level - b.level);
	const chosen = [];
	const perAuthor = new Map();
	for (const photo of sorted) {
		if (chosen.length >= want) break;
		// A series of the same subject has almost the same name: keep one
		const base = photo.title.replace(/[\s_-]*\(?\d+\)?\.jpe?g$/i, '').toLowerCase();
		if (used.has(photo.title) || used.has(base)) continue;
		if ((perAuthor.get(photo.author) ?? 0) >= 3) continue;
		used.add(photo.title);
		used.add(base);
		perAuthor.set(photo.author, (perAuthor.get(photo.author) ?? 0) + 1);
		chosen.push(photo);
	}
	return chosen;
}

async function forStop(stop, used) {
	const want = Math.max(MIN_PER_STOP, Math.round(stop.photos * SHARE));
	const radius = Math.max(3000, (stop.spread ?? 2.5) * 1500);
	let candidates = [];
	let found = [];
	for (let level = 0; level < SEARCHES.length && found.length < want; level++) {
		candidates = [...candidates, ...(await photosNear(stop.lat, stop.lng, radius, level))];
		found = pick(candidates, want, new Set(used));
		await sleep(300);
	}
	for (const photo of found) {
		used.add(photo.title);
		used.add(photo.title.replace(/[\s_-]*\(?\d+\)?\.jpe?g$/i, '').toLowerCase());
	}
	return found;
}

/** Searches Commons for the photos of every stop, of home and without location */
async function choosePhotos() {
	const used = new Set();
	const trips = [];
	for (const [t, trip] of TRIPS.entries()) {
		const stops = [];
		for (const [s, stop] of trip.stops.entries()) {
			const photos = await forStop(stop, used);
			console.log(`${t}.${s} ${stop.city}: ${photos.length}`);
			stops.push(photos);
		}
		trips.push(stops);
	}

	const home = [];
	for (const [lat, lng] of HOME_SPOTS) {
		const want = Math.ceil(HOME_PHOTOS / HOME_SPOTS.length);
		home.push(...(await forStop({ lat, lng, photos: want / SHARE, spread: 1.2 }, used)));
		await sleep(300);
	}
	console.log(`home: ${home.length}`);

	// Photos "received by chat": real photos from other cities, with no location
	const unlocated = [];
	for (const [lat, lng] of [
		[40.4168, -3.7038],
		[41.3874, 2.1686],
		[37.3891, -5.9845],
		[39.4699, -0.3763]
	]) {
		const found = await forStop(
			{ lat, lng, photos: UNLOCATED_PHOTOS / 4 / SHARE, spread: 4 },
			used
		);
		unlocated.push(...found);
		await sleep(300);
	}
	console.log(`unlocated: ${unlocated.length}`);
	return { trips, home, unlocated };
}

// Size of the packed thumbnails: enough for the grids, the markers and the trip covers
const THUMB_SIZE = 256;

/**
 * Downloads every thumbnail, turns it into a small WebP and packs them all in
 * one file. Each photo keeps where its thumbnail starts and how long it is.
 */
async function packThumbnails(all) {
	const parts = [];
	let offset = 0;
	for (const [i, photo] of all.entries()) {
		const url = photo.thumb.replace(/\/\d+px-/, '/330px-');
		let image;
		for (let attempt = 0; attempt < 4 && !image; attempt++) {
			const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
			if (response.ok) image = Buffer.from(await response.arrayBuffer());
			else await sleep(1500 * (attempt + 1));
		}
		if (!image) throw new Error(`Thumbnail not available: ${url}`);
		const webp = await sharp(image)
			.rotate()
			.resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside' })
			.webp({ quality: 72 })
			.toBuffer();
		photo.pack = [offset, webp.length];
		parts.push(webp);
		offset += webp.length;
		if (i % 50 === 0) console.log(`thumbnails ${i}/${all.length}`);
		await sleep(60);
	}
	mkdirSync('static/demo', { recursive: true });
	writeFileSync('static/demo/thumbs.bin', Buffer.concat(parts));
	console.log(`thumbs.bin: ${(offset / 1024 / 1024).toFixed(1)} MB`);
}

const library = process.argv.includes('--pack')
	? JSON.parse(readFileSync('src/lib/demo/photos.json', 'utf8'))
	: await choosePhotos();
const all = [...library.trips.flat(2), ...library.home, ...library.unlocated];
await packThumbnails(all);
writeFileSync('src/lib/demo/photos.json', JSON.stringify(library));

const credits = [
	'# Sample photos',
	'',
	'The sample library of Waymark ("Probar con fotos de ejemplo") uses these photos from',
	'[Wikimedia Commons](https://commons.wikimedia.org/). Each one keeps its own license; the',
	'viewer shows the author and license of every sample photo.',
	'',
	'| Photo | Author | License |',
	'|---|---|---|',
	...all.map(
		(p) =>
			`| [${p.title.replace(/\|/g, '/')}](${p.page}) | ${p.author.replace(/\|/g, '/')} | ${
				p.licenseUrl ? `[${p.license}](${p.licenseUrl})` : p.license
			} |`
	)
];
writeFileSync('docs/demo-credits.md', credits.join('\n') + '\n');
console.log(`photos: ${all.length}`);
