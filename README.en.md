# Waymark

![SvelteKit](https://img.shields.io/badge/SvelteKit-2-ff3e00?logo=svelte&logoColor=fff)
![Svelte](https://img.shields.io/badge/Svelte-5_runes-ff3e00?logo=svelte&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-6_strict-3178c6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=fff)
![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-6-396cb2?logo=maplibre&logoColor=fff)
![Vitest](https://img.shields.io/badge/tests-66_Vitest-6e9f18?logo=vitest&logoColor=fff)

<p>
  <a href="README.md"><img src="docs/readme/lang-es.svg" alt="Español" width="170"></a>
  <img src="docs/readme/lang-en-active.svg" alt="English" width="170">
</p>

**Your travel photos on an interactive 3D globe.** Drop your photos in, Waymark reads where each one was taken and places it on the planet. Spin the globe, fly into a country or a city, replay a trip along its route and browse the photos you took there. Like Google Photos, but with a world map instead of albums.

A portfolio project built like a real product. **There is no server:** photos are processed and stored in the browser, the app works offline after the first visit and, if you want, it syncs your library between devices through your own Google Drive.

**Try it without your own photos:** open the app and click _"Probar con fotos de ejemplo"_. It generates a sample library of about 2,000 photos across 15 trips, right in the browser.

The interface is in Spanish.

## Highlights

- **Smooth 3D globe** with MapLibre GL in globe projection, styled from the app's design tokens, with a custom halo and shading moved by the GPU.
- **Parallel import** with a pool of Web Workers: SHA-256 fingerprint to skip duplicates, EXIF reading and thumbnails without blocking the UI. Supports JPG, HEIC and **RAW** (it extracts the JPEG preview the camera stores inside).
- **Three photo sources:** the device, **Google Drive** (without duplicating files) and **Google Photos** through Google Takeout, choosing albums.
- **Fully offline places:** 241 countries and 34,146 cities bundled as static data; the country and city of each photo are computed in the browser.
- **Trips detected automatically** from dates and places, with an animated route, stages and GPX export.
- **Estimated locations** for photos without GPS (WhatsApp, cameras with location off) from photos taken around the same time or in the same album.
- **Google Drive sync** without a backend: Google sign-in in the browser, light copies in a folder of the user's Drive and change merging across devices.
- **Quality:** strict TypeScript, 66 unit tests of the core logic, ESLint, Prettier and `svelte-check` with no errors.

## Features

- **Globe view** with photo clusters, visited countries highlighted and a timeline to filter by date.
- **Country view** with cities, days, distance travelled and photos grouped by day.
- **City view** at street level: thumbnails on the map, a list synced with what you see and **neighbourhoods** drawn on the map (Shinjuku inside Tokyo, Kópavogur inside Reykjavík) to filter by area.
- **Automatic trips** with route, stages, a _"Play trip"_ camera flight, editable title and cover, and GPX export.
- **Photo viewer** with EXIF data (camera, lens, settings), location map, favorites and location fixing.
- **Photos without a location:** grouped by album, date or camera; drag them onto the globe or place a whole album with a place search.
- **Statistics:** countries, continents, distance travelled, photos per year, top cities and extreme points.
- **Search** (Ctrl/⌘ K) for countries, cities, trips or pasted coordinates.
- **Globe color styles:** natural, grey (the world in grey and your countries in color), night and atlas, with a preview and saved choice.
- **Settings:** dark/light/system theme, km/mi, map style, reduced motion, globe quality, storage and export.
- **Responsive:** on phones the panels become draggable bottom sheets.

## Tech stack

| Layer      | Choice                                    | Why                                                                                                                       |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Framework  | SvelteKit 2 + Svelte 5 (runes)            | Fine-grained reactivity without a virtual DOM: with thousands of photos only what changes updates. Built as a static SPA. |
| Language   | TypeScript 6 (`strict`)                   | Data models shared between workers, database and views.                                                                   |
| Build      | Vite 8                                    | Workers as modules, code splitting per route and lazy loading of heavy libraries.                                         |
| Map        | MapLibre GL 6                             | Open source WebGL 3D globe, no keys or usage limits.                                                                      |
| Clustering | Supercluster                              | Clusters thousands of points per zoom level in milliseconds.                                                              |
| Geometry   | d3-geo                                    | Point in country, bounds and the flat map in Statistics.                                                                  |
| Metadata   | exifr                                     | Fast EXIF and GPS reading, also for TIFF-based RAW formats.                                                               |
| Storage    | Dexie (IndexedDB)                         | Stores photos, thumbnails and data in the browser, with indexes and migrations.                                           |
| Takeout    | zip.js                                    | Reads multi-GB zips without unzipping them: each photo is opened only when its turn comes.                                |
| Account    | Google Identity Services + Drive REST API | Sign-in and sync without a server of our own, with the minimal `drive.file` permission.                                   |
| Quality    | Vitest, ESLint, Prettier, svelte-check    | Tests of the domain logic and type checking of components.                                                                |

## Architecture

The app is a static SPA. All the heavy work happens in the browser, split so the globe never stutters:

```txt
Files (device, Drive or a Takeout zip)
      |
importer.ts ── spreads the photos across Web Workers (max. 4)
      |           SHA-256 fingerprint · EXIF / RAW · WebP thumbnail
      |
main thread ── country, city and neighbourhood (offline data) · saved in batches
      |
IndexedDB (Dexie) ── original photos, thumbnails and data
      |
library.svelte.ts ── light points (id, position, date) + derived state:
      |                trips, statistics, timeline, estimates
      |
Views (globe, country, city, trip) · MapLibre + Supercluster
      |
sync (optional) ── Google Drive: light copies + library.json
```

- **The map only receives light data.** Images load when a thumbnail gets close to the screen and are kept in a memory-bounded cache.
- **The domain logic is pure and tested:** trip detection, location estimates, Takeout matching, the sync plan, the city index and the globe math live in TypeScript modules with no UI dependencies.

## Technical decisions

**Import.** Each file goes through a worker that fingerprints it (SHA-256 of its size, start and end, to skip duplicates even when renamed), reads the EXIF and makes the thumbnail with `createImageBitmap`, which resizes while decoding. A stuck file gets its worker replaced. Formats the browser can't show (HEIC in Chrome) keep their GPS and date with a placeholder preview.

**RAW.** The worker looks for the JPEG preview the camera stored inside the file, walking the JPEG markers to find where it ends and skipping the lossless-JPEG sensor data browsers can't read. The preview is turned upright with the EXIF orientation. Metadata comes from exifr, from the CMT boxes of Canon CR3 files or from the preview itself (Fujifilm).

**Google Takeout.** The Google Photos API doesn't give other apps the location of your photos; Takeout does keep it, in a JSON file next to each photo. Waymark reads the zips without unzipping them, pairs each photo with its JSON (Takeout names them in several ways, all covered by tests) and lets you choose the albums.

**Offline places.** Country shapes (Natural Earth) and cities over 15,000 people (GeoNames) ship as static files. A 1° grid index finds the closest place in microseconds. When that place lies inside the urban area of a much bigger city (its reach grows with population), it becomes a neighbourhood of that city.

**Trips.** Home is the place photographed in the most different months. Photos away from home are grouped into trips that end when you get back or after a pause of more than 2.5 days; consecutive photos in the same city form a stage. Edited titles and covers are anchored to a photo, so they survive when the trip changes.

**Estimated locations.** A photo without GPS takes the place of the closest photo with GPS in time (up to 2 hours) or, if there is none, of the closest one in the same album. It is marked as estimated and can be fixed.

**Sync.** Sign-in uses Google Identity Services in the browser with the `drive.file` permission: Waymark only sees the files it creates or the ones the user picks. Drive keeps a copy of each photo at 2048 px (about 20 times lighter than the original) and a `library.json` with the data. Each device uploads what is new and downloads what the others added; when a photo changed in two places, the most recent change wins. Photos picked from Drive are not copied: Waymark keeps a link to the file.

**Privacy.** No server and no analytics: photos never leave the browser, except to the user's own Drive folder if they sign in.

## Performance

Measured in Chrome with the CPU slowed down 4 times, using the sample library (~2,000 photos):

- **Globe halo and shading** moved with `transform`: the GPU moves them, with no gradient repaint on every frame.
- **Street map** only downloaded and drawn when visible: dragging in the country view goes from ~50 to ~60 fps.
- **Markers:** clusters are only recomputed on a new zoom level or after moving away from the computed area, and the map size is only measured on resize.
- **Long lists** (a 300-photo trip) are rendered in steps while the browser is idle: the main-thread block when opening a trip drops from 480 to 235 ms.
- **Lazy loading:** the zip reader (128 KB) is only downloaded when a Takeout arrives, and the EXIF reader only lives in the workers.
- **Offline:** a service worker keeps the app shell and the geo data; IndexedDB is marked as persistent storage.

## Project structure

```txt
src/
├── lib/
│   ├── map/          # Globe: style, markers, route, neighbourhoods, halo and camera
│   ├── photos/       # Import: workers, EXIF, RAW, Takeout, thumbnails, IndexedDB
│   ├── geo/          # Countries, cities, distances and place search
│   ├── library/      # Trips, estimates, statistics, timeline and formatting
│   ├── sync/         # Sync plan and light copy for Google Drive
│   ├── google/       # Google sign-in, Drive API and Drive picker
│   ├── state/        # App state: library, settings, UI and import
│   ├── components/   # Panels, viewer, search, settings, import...
│   └── demo/         # Sample library generator
├── routes/           # Globe, country, city, trip, "sin ubicación" and statistics
└── service-worker.ts # Offline support
scripts/              # Geo data build script
static/geo/           # Bundled countries and cities
```

## Getting started

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:5173`. It works with no configuration; the Google account is optional.

| Command                      | What it does                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`                   | Development server                                                           |
| `pnpm build`                 | Builds the static site into `build/`                                         |
| `pnpm test`                  | Unit tests (Vitest)                                                          |
| `pnpm check`                 | Type check (`svelte-check`)                                                  |
| `pnpm lint`                  | Prettier + ESLint                                                            |
| `node scripts/build-geo.mjs` | Rebuilds `static/geo` (needs `scripts/.cache/cities15000.txt` from GeoNames) |

### Google account (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Drive API** and the **Google Picker API**.
2. In _Google Auth Platform_, set up the consent screen (External), add test users and the `drive.file` scope.
3. Create an **OAuth client ID** of type _Web application_ with your origins (`http://localhost:5173` and your production URL).
4. To import from Drive, create an **API key** restricted to the Picker API and your origins, and copy the **project number**.
5. Copy `.env.example` to `.env` and fill in `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY` and `VITE_GOOGLE_APP_ID`.

## Roadmap

- [x] 3D globe, country, city and trip views, viewer, statistics and search.
- [x] Worker-based import with duplicates, HEIC and RAW.
- [x] Offline places with neighbourhoods and main cities.
- [x] Automatic trips with route, stages and GPX.
- [x] Offline support with a service worker.
- [x] Google account, Drive sync and import from Drive and Google Takeout.
- [x] Estimated locations and placing whole albums with a place search.
- [x] Performance review measured with Chrome profiles.
- [x] Selectable globe color styles (natural, grey, night and atlas).
- [ ] Deployment on Cloudflare Pages and continuous integration with GitHub Actions.
- [ ] Screenshots and a demo video in this README.

## Why this project matters

- **A complete product without a backend:** import, storage, sync and offline support solved on the client, with clear privacy decisions.
- **Real data problems:** photos without GPS, RAW formats, Google exports with inconsistent file names, EXIF time zones, duplicates and neighbourhoods that are not cities.
- **Performance with judgment:** every optimization starts from a measurement, and the ones that didn't help were dropped.
- **Maintainable code:** domain logic in pure, tested modules, separate from the UI and the map.

## Data and credits

- Countries: [Natural Earth](https://www.naturalearthdata.com/) via [world-atlas](https://github.com/topojson/world-atlas) (public domain)
- Cities: [GeoNames](https://www.geonames.org/) `cities15000` (CC BY 4.0)
- Street and satellite maps: Esri World Topo Map and World Imagery
- Place search: [Nominatim](https://nominatim.org/) (© OpenStreetMap contributors)
- Flags: [country-flag-icons](https://gitlab.com/catamphetamine/country-flag-icons)
- Fonts: Geist, Geist Mono and Instrument Serif

---

Portfolio project by [Aleix Auqué](https://github.com/AleixAj).
