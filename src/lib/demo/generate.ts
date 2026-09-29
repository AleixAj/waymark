import type { DemoCredit, Photo } from '$lib/photos/types';
import { CAMERAS, HOME, TRIPS, type DemoTrip } from './data';
import library from './photos.json';

/** A photo of scripts/build-demo.mjs: real place, camera and credit from Wikimedia Commons */
interface CommonsPhoto {
	title: string;
	lat: number;
	lng: number;
	width: number;
	height: number;
	thumb: string;
	page: string;
	author: string;
	license: string;
	licenseUrl: string;
	camera: string | null;
	aperture: number | null;
	exposure: number | null;
	iso: number | null;
	focal: number | null;
	/** Where its thumbnail is in static/demo/thumbs.bin: [start, length] */
	pack: [number, number];
}

// Data made by scripts/build-demo.mjs: its shape is known, TypeScript only sees a big JSON
const PHOTOS = library as unknown as {
	trips: CommonsPhoto[][][];
	home: CommonsPhoto[];
	unlocated: CommonsPhoto[];
};

/** Photo data without the images: the thumbnails come from static/demo/thumbs.bin */
export type DemoPhoto = Omit<Photo, 'thumb' | 'file'> & { pack: [number, number] };

const DAY = 24 * 3600 * 1000;

/** Small seeded random generator, so the demo is the same every time */
function random(seed: number) {
	let s = seed % 2147483647 || 1;
	return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** File name like the camera would write it: "IMG_1234.JPG", "DSC_0042.JPG"... */
function fileName(camera: string | null, counter: number) {
	const name = camera ?? '';
	const prefix = /^nikon/i.test(name)
		? 'DSC_'
		: /^(sony|dsc)/i.test(name)
			? 'DSC'
			: /^fuji/i.test(name)
				? 'DSCF'
				: 'IMG_';
	return `${prefix}${String(counter).padStart(4, '0')}.JPG`;
}

/** Wikimedia keeps a few standard sizes: the big one is for the viewer */
function largeUrl(photo: CommonsPhoto) {
	const width = photo.width >= 1280 ? 1280 : 960;
	return photo.thumb.replace(/\/\d+px-/, `/${width}px-`);
}

/** The fields every sample photo has, from its Commons photo */
function fromCommons(photo: CommonsPhoto, rnd: () => number, counter: { n: number }) {
	// Some photos have no camera data: they get one of the demo cameras
	const fallback = CAMERAS[Math.floor(rnd() * CAMERAS.length)];
	const camera = photo.camera ?? fallback.camera;
	counter.n++;
	const credit: DemoCredit = {
		title: photo.title,
		author: photo.author,
		license: photo.license,
		licenseUrl: photo.licenseUrl,
		page: photo.page
	};
	return {
		id: `demo-${counter.n}`,
		name: fileName(camera, 1000 + counter.n),
		camera,
		lens: photo.camera ? null : fallback.lens,
		aperture: photo.aperture,
		exposure: photo.exposure,
		iso: photo.iso,
		focal: photo.focal,
		width: photo.width,
		height: photo.height,
		// Size of a typical JPEG with that many pixels
		size: Math.round(photo.width * photo.height * 0.35),
		pack: photo.pack,
		demo: { url: largeUrl(photo), credit },
		favorite: rnd() < 0.05,
		offset: null,
		area: null
	};
}

function tripPhotos(
	trip: DemoTrip,
	photos: CommonsPhoto[][],
	rnd: () => number,
	counter: { n: number }
): DemoPhoto[] {
	const start = new Date(...trip.start).getTime();
	const result: DemoPhoto[] = [];
	trip.stops.forEach((stop, stopIndex) => {
		const country = trip.countryByStop?.[stopIndex] ?? trip.country;
		const list = photos[stopIndex] ?? [];
		const nights = stop.nights ?? 1;
		const perNight = Math.ceil(list.length / nights);
		// Stops on the same day share it: each one gets its own slot between 9:00 and 21:00
		const sameDay = trip.stops.filter((s) => s.day === stop.day);
		const slot = sameDay.indexOf(stop);
		const slotHours = 12 / sameDay.length;
		list.forEach((photo, i) => {
			const night = Math.floor(i / perNight);
			const within = (i % perNight) / perNight;
			const hour = 9 + (slot + within) * slotHours;
			result.push({
				...fromCommons(photo, rnd, counter),
				lat: photo.lat,
				lng: photo.lng,
				altitude: null,
				takenAt: start + (stop.day + night) * DAY + hour * 3600 * 1000 + Math.floor(rnd() * 60_000),
				country,
				city: stop.city
			});
		});
	});
	return result;
}

const TRIP_SPANS = TRIPS.map((trip) => {
	const start = new Date(...trip.start).getTime();
	const days = Math.max(...trip.stops.map((s) => s.day + (s.nights ?? 1)));
	return [start - 4 * DAY, start + (days + 4) * DAY];
});

function nearTrip(time: number) {
	return TRIP_SPANS.some(([from, to]) => time >= from && time <= to);
}

/** Everyday photos around home, spread over the years, so Madrid is detected as home */
function homePhotos(rnd: () => number, counter: { n: number }, now: number): DemoPhoto[] {
	const result: DemoPhoto[] = [];
	const months = 93;
	PHOTOS.home.forEach((photo, i) => {
		const month = Math.floor((i / PHOTOS.home.length) * months);
		const day = 1 + Math.floor(rnd() * 27);
		const hour = 10 + Math.floor(rnd() * 10);
		const record = fromCommons(photo, rnd, counter);
		let takenAt = new Date(2019, month, day, hour).getTime();
		// Stay away from trip dates, or the photo would join the trip
		while (nearTrip(takenAt)) takenAt += 7 * DAY;
		if (takenAt > now) return;
		result.push({
			...record,
			lat: photo.lat,
			lng: photo.lng,
			altitude: 650,
			takenAt,
			country: HOME.country,
			city: HOME.city
		});
	});
	return result;
}

/** Photos received by chat: real photos, but without GPS */
function unlocatedPhotos(rnd: () => number, counter: { n: number }, now: number): DemoPhoto[] {
	// They come in bursts: a few months with several each
	const months: [number, number][] = [
		[2026, 6],
		[2025, 11],
		[2025, 3],
		[2024, 7],
		[2023, 1]
	];
	const result: DemoPhoto[] = [];
	PHOTOS.unlocated.forEach((photo, i) => {
		const [year, month] = months[i % months.length];
		const takenAt = new Date(
			year,
			month,
			1 + Math.floor(rnd() * 27),
			9 + Math.floor(rnd() * 12)
		).getTime();
		const record = fromCommons(photo, rnd, counter);
		if (takenAt > now) return;
		result.push({
			...record,
			// Chat apps remove the location and the camera data
			name: `IMG-${year}${String(1000 + i)}-WA00${i % 10}.jpg`,
			camera: null,
			lens: null,
			aperture: null,
			exposure: null,
			iso: null,
			focal: null,
			lat: null,
			lng: null,
			altitude: null,
			takenAt,
			country: null,
			city: null
		});
	});
	return result;
}

/** `now` only hides photos "from the future"; tests pass a fixed date */
export function generateDemo(now = Date.now()) {
	const rnd = random(42);
	const counter = { n: 0 };
	const byTrip = TRIPS.map((trip, i) => tripPhotos(trip, PHOTOS.trips[i] ?? [], rnd, counter));
	const photos = [
		...homePhotos(rnd, counter, now),
		...byTrip.flat(),
		...unlocatedPhotos(rnd, counter, now)
	]
		.filter((p) => p.takenAt <= now)
		.sort((a, b) => a.takenAt - b.takenAt);

	// Nice names for some trips, as if the user had renamed them.
	// The edit is anchored to the first photo of the trip.
	const titles = TRIPS.flatMap((trip, i) => {
		const first = byTrip[i].find((p) => p.takenAt <= now);
		if (!trip.title || !first) return [];
		return [{ id: `trip-${first.takenAt}`, anchorId: first.id, title: trip.title }];
	});
	return { photos, titles };
}
