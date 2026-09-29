import type { Photo } from '$lib/photos/types';
import { CAMERAS, HOME, SCENE_SETS, TRIPS, type DemoTrip } from './data';

/** Photo data without the images: they are painted later in the demo worker */
export type DemoPhoto = Omit<Photo, 'thumb' | 'file'> & { scene: string; label: string };

const DAY = 24 * 3600 * 1000;

/** Small seeded random generator, so the demo is the same every time */
function random(seed: number) {
	let s = seed % 2147483647 || 1;
	return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Moves a point a random distance (up to `km`) in a random direction */
function jitter(lat: number, lng: number, km: number, rnd: () => number) {
	const r = km * Math.sqrt(rnd());
	const angle = rnd() * Math.PI * 2;
	const dLat = (r * Math.cos(angle)) / 111;
	const dLng = (r * Math.sin(angle)) / (111 * Math.cos((lat * Math.PI) / 180));
	return { lat: lat + dLat, lng: lng + dLng };
}

function cameraFields(rnd: () => number, counter: number) {
	const cam = CAMERAS[Math.floor(rnd() * CAMERAS.length)];
	const landscape = rnd() > 0.2;
	const [w, h] = cam.size;
	return {
		name: `${cam.prefix}${String(counter).padStart(4, '0')}.${cam.ext}`,
		camera: cam.camera,
		lens: cam.lens,
		aperture: [1.8, 2.8, 4, 5.6, 8][Math.floor(rnd() * 5)],
		exposure: [1 / 60, 1 / 125, 1 / 250, 1 / 500, 1 / 1000][Math.floor(rnd() * 5)],
		iso: [100, 200, 400, 800, 1600][Math.floor(rnd() * 5)],
		focal: cam.camera.startsWith('iPhone') ? 24 : [23, 35, 50, 70][Math.floor(rnd() * 4)],
		width: landscape ? w : h,
		height: landscape ? h : w,
		size: Math.round((3 + rnd() * 9) * 1e6)
	};
}

function tripPhotos(trip: DemoTrip, rnd: () => number, counter: { n: number }): DemoPhoto[] {
	const start = new Date(...trip.start).getTime();
	const scenes = SCENE_SETS[trip.scenes];
	const photos: DemoPhoto[] = [];
	trip.stops.forEach((stop, stopIndex) => {
		const country = trip.countryByStop?.[stopIndex] ?? trip.country;
		const nights = stop.nights ?? 1;
		const perNight = Math.ceil(stop.photos / nights);
		// Stops on the same day share it: each one gets its own slot between 9:00 and 21:00
		const sameDay = trip.stops.filter((s) => s.day === stop.day);
		const slot = sameDay.indexOf(stop);
		const slotHours = 12 / sameDay.length;
		for (let i = 0; i < stop.photos; i++) {
			const night = Math.floor(i / perNight);
			const within = (i % perNight) / perNight;
			const hour = 9 + (slot + within) * slotHours;
			const takenAt =
				start + (stop.day + night) * DAY + hour * 3600 * 1000 + Math.floor(rnd() * 60_000);
			const place = jitter(stop.lat, stop.lng, stop.spread ?? 2.5, rnd);
			const scene = scenes[Math.floor(rnd() * scenes.length)];
			counter.n++;
			photos.push({
				id: `demo-${counter.n}`,
				...place,
				altitude: Math.round(20 + rnd() * 300),
				takenAt,
				offset: null,
				country,
				city: stop.city,
				area: null,
				favorite: rnd() < 0.04,
				scene,
				label: `${scene} · ${stop.city.toLowerCase()}`,
				...cameraFields(rnd, 1000 + counter.n)
			});
		}
	});
	return photos;
}

const TRIP_SPANS = TRIPS.map((trip) => {
	const start = new Date(...trip.start).getTime();
	const days = Math.max(...trip.stops.map((s) => s.day + (s.nights ?? 1)));
	return [start - 4 * DAY, start + (days + 4) * DAY];
});

function nearTrip(time: number) {
	return TRIP_SPANS.some(([from, to]) => time >= from && time <= to);
}

/** Everyday photos around home, a few per month, so Madrid is detected as home */
function homePhotos(rnd: () => number, counter: { n: number }, now: number): DemoPhoto[] {
	const photos: DemoPhoto[] = [];
	const scenes = SCENE_SETS.ciudad;
	for (let month = 0; month < 93; month++) {
		const count = 2 + Math.floor(rnd() * 4);
		for (let i = 0; i < count; i++) {
			const takenAt = new Date(
				2019,
				month,
				1 + Math.floor(rnd() * 27),
				10 + Math.floor(rnd() * 10)
			).getTime();
			// Random values are always drawn, even for skipped photos, so the rest of
			// the library doesn't change depending on today's date
			const scene = scenes[Math.floor(rnd() * scenes.length)];
			const place = jitter(HOME.lat, HOME.lng, 6, rnd);
			const camera = cameraFields(rnd, 1000 + counter.n + 1);
			// Stay away from trip dates, or the photo would join the trip
			if (takenAt > now || nearTrip(takenAt)) continue;
			counter.n++;
			photos.push({
				id: `demo-${counter.n}`,
				...place,
				altitude: 650,
				takenAt,
				offset: null,
				country: HOME.country,
				city: HOME.city,
				area: null,
				favorite: false,
				scene,
				label: `${scene} · madrid`,
				...camera
			});
		}
	}
	return photos;
}

/** Screenshots and chat photos: no GPS */
function unlocatedPhotos(rnd: () => number, counter: { n: number }, now: number): DemoPhoto[] {
	const photos: DemoPhoto[] = [];
	const scenes = Object.values(SCENE_SETS).flat();
	// Screenshots and chat photos come in bursts: a few months with several each
	const months: [number, number, number][] = [
		[2026, 6, 14],
		[2025, 11, 9],
		[2025, 3, 5],
		[2024, 7, 4],
		[2023, 1, 5]
	];
	const dates = months.flatMap(([y, m, count]) =>
		Array.from({ length: count }, () =>
			new Date(y, m, 1 + Math.floor(rnd() * 27), 9 + Math.floor(rnd() * 12)).getTime()
		)
	);
	for (const [i, takenAt] of dates.entries()) {
		const scene = scenes[Math.floor(rnd() * scenes.length)];
		const camera = cameraFields(rnd, 1000 + counter.n + 1);
		const cameraName = rnd() > 0.5 ? null : 'iPhone 15 Pro';
		if (takenAt > now) continue;
		counter.n++;
		photos.push({
			id: `demo-${counter.n}`,
			lat: null,
			lng: null,
			altitude: null,
			takenAt,
			offset: null,
			country: null,
			city: null,
			area: null,
			favorite: false,
			scene,
			label: `${scene} · sin gps`,
			...camera,
			camera: cameraName,
			name: `IMG-2025${String(1000 + i)}-WA00${i % 10}.jpg`
		});
	}
	return photos;
}

/** `now` only hides photos "from the future"; tests pass a fixed date */
export function generateDemo(now = Date.now()) {
	const rnd = random(42);
	const counter = { n: 0 };
	const photos = [
		...homePhotos(rnd, counter, now),
		...TRIPS.flatMap((trip) => tripPhotos(trip, rnd, counter)),
		...unlocatedPhotos(rnd, counter, now)
	]
		.filter((p) => p.takenAt <= now)
		.sort((a, b) => a.takenAt - b.takenAt);

	// Nice names for some trips, as if the user had renamed them.
	// The edit is anchored to the first photo of the trip.
	const titles = TRIPS.flatMap((trip) => {
		if (!trip.title) return [];
		const start = new Date(...trip.start).getTime();
		const first = photos.find((p) => p.city === trip.stops[0].city && p.takenAt >= start);
		return first ? [{ id: `trip-${first.takenAt}`, anchorId: first.id, title: trip.title }] : [];
	});
	return { photos, titles };
}
