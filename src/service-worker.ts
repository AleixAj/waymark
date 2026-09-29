/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

// Keeps the app and its geo data in the browser, so after the first visit Waymark
// opens and imports photos without internet. Street map tiles still need a connection.
const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `waymark-${version}`;
// The app shell: code, styles, fonts, geo data, and the page itself (a single-page app)
const ASSETS = [...build, ...files.filter((file) => !file.endsWith('_headers')), '/'];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	// Old versions of the app are removed (the map tile cache is not ours: it stays)
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key.startsWith('waymark-') && key !== CACHE)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);
	// Only our own files; map tiles and other sites go straight to the network
	if (request.method !== 'GET' || url.origin !== sw.location.origin) return;

	// Pages: always try the network first so updates arrive, the saved copy when offline
	if (request.mode === 'navigate') {
		event.respondWith(fetch(request).catch(() => caches.match('/') as Promise<Response>));
		return;
	}

	// Files of this version never change: the saved copy is used when there is one
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
	}
});
