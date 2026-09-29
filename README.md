# Waymark

Your travel photos on an interactive 3D globe. Drop your photos in, Waymark reads where each one was taken and places it on the planet. Spin the globe, fly into a country or a city, replay a trip along its route and browse the photos you took there.

Everything runs in the browser: photos are processed and stored on your device. There is no server. Optionally you can sign in with Google to keep the library in sync between devices: a light copy of each photo goes to a Waymark folder in your own Google Drive. After the first visit it also works offline (only the street-level maps need a connection).

**Try it without your own photos:** open the app and click _"Probar con fotos de ejemplo"_. It generates a sample library (about 2,000 photos across 15 trips) right in the browser.

## Features

- **Globe view** with photo clusters, visited countries highlighted and a timeline to filter by date
- **Country view** with cities, days, distance and photos grouped by day
- **Place view** at street level: photos as thumbnails on the map, list synced with what you see
- **Trips detected automatically** from dates and places, with route, stages, _Play trip_ camera flight and GPX export
- **Photo viewer** with EXIF data (camera, lens, settings), location map, favorites and location fixing
- **Three ways to import**: files or folders from the device, photos already in Google Drive (not copied again), and Google Photos albums through a Google Takeout export
- **Google account** (optional): the library, favorites, fixed locations and trip titles stay in sync across devices
- **Photos without GPS**: their place is estimated from photos with GPS taken up to two hours away, or from the same album (an album is usually one trip). The rest can be dragged onto the globe, or placed a whole album at a time with a place search
- **Statistics**: countries, continents, distance travelled, photos per year, top cities, extreme points
- **Search** (Ctrl/⌘ K) for countries, cities, trips or pasted coordinates
- **Settings**: dark/light/system theme, km/mi, map style, reduced motion, globe quality, storage, export
- Responsive: on phones the panels become draggable bottom sheets

## Stack

- **SvelteKit + Svelte 5** (runes) with TypeScript, built as a static SPA
- **MapLibre GL** with globe projection, styled from the app's design tokens
- **d3-geo** for the flat map and the geometry (point in country, bounds)
- **exifr** to read GPS and camera data, **Dexie** (IndexedDB) to store the library
- **Google Identity Services** and the **Drive REST API** for the optional sync, **zip.js** for Takeout
- **Vitest**, ESLint and Prettier

## How it works

- **Import pipeline**: files go to a pool of Web Workers. Each worker fingerprints the file (SHA-256 of its size, start and end, to skip duplicates even if renamed), reads EXIF and makes a WebP thumbnail with `createImageBitmap` resizing while decoding. Stuck files time out and their worker is replaced; formats the browser can't show (HEIC in Chrome) keep their GPS and date with a placeholder preview. The main thread looks up the place and saves in batches, so the globe stays smooth while importing. Files inside a zip or in Drive are only opened when their turn comes.
- **RAW files** (DNG, CR2, CR3, NEF, ARW, RAF, ORF, RW2...): the worker scans the file for the JPEG preview the camera stored inside, walking the JPEG markers to find where it ends and skipping the lossless sensor data. The preview is turned upright with the EXIF orientation and kept as the viewable image. EXIF comes from exifr, from the CMT boxes of Canon CR3 files, or from the preview itself (Fujifilm).
- **Google Takeout**: Google Photos doesn't give other apps the location of your photos (its Picker API removes it), but Takeout keeps it in a JSON file next to each photo. Waymark reads the zip files with zip.js without unzipping them, pairs every photo with its JSON (Takeout names them in several ways, tested in `takeout.spec.ts`) and lets you choose the albums.
- **Sync with Google Drive**: sign-in uses Google Identity Services in the browser, with the `drive.file` permission (Waymark only sees the files it creates or the ones you pick). Drive keeps a copy of each photo at 2048 px (about 20 times smaller than the original) and `library.json` with the details of every photo. Each device uploads what is new, downloads what the others added, and for photos changed on two devices the most recent change wins (`src/lib/sync/plan.ts`, with tests). Photos picked from Drive are not copied: Waymark keeps a link to the file.
- **Dates and places**: EXIF time zones (`OffsetTimeOriginal`) are applied, impossible dates and "null island" (0,0) GPS are ignored.
- **Offline**: a service worker keeps the app shell and the geo data; IndexedDB is marked as persistent storage.
- **Offline places**: country shapes (Natural Earth) and ~34k cities (GeoNames) are bundled as static files. A bounding-box check plus `geoContains` finds the country; a 1° grid index finds the closest place. When that place lies inside the urban area of a much bigger city (its reach grows with population), it becomes a neighbourhood of it: Shinjuku is shown as part of Tokyo, Kópavogur as part of Reykjavík. The city view draws each neighbourhood around its photos and lets you filter by it.
- **Trips**: home is the place photographed in the most different months. Photos away from home are split into trips when you get back home or pause for more than 2.5 days; consecutive photos in the same city become stops. Renamed titles and covers are anchored to a photo, so they survive when the trip changes.
- **Performance**: the map only receives light data (id, position, date). Clustering uses Supercluster, thumbnails load only when they get close to the screen, and long lists use `content-visibility`.
- **The globe look**: MapLibre draws the planet; the halo and shading are a CSS layer that follows it. Its size is computed from the zoom, the latitude and the camera distance (`src/lib/map/globe.ts`, with tests).

## Getting started

```bash
pnpm install
pnpm dev
```

| Command                      | What it does                                                  |
| ---------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                   | Start the dev server                                          |
| `pnpm build`                 | Build the static site into `build/`                           |
| `pnpm test`                  | Run unit tests                                                |
| `pnpm check`                 | Type check                                                    |
| `pnpm lint`                  | Prettier + ESLint                                             |
| `node scripts/build-geo.mjs` | Rebuild `static/geo` (needs `scripts/.cache/cities15000.txt`) |

### Google sign-in (optional)

Without these keys the app works the same, just without an account. To enable it:

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project and enable the **Google Drive API** and the **Google Picker API**.
2. In _Google Auth Platform_, set up the consent screen (External), add yourself as a test user and add the `drive.file` scope.
3. Create an **OAuth client ID** of type _Web application_ with your origins (`http://localhost:5173` and your production URL) as _Authorized JavaScript origins_.
4. For "Desde Google Drive", create an **API key** restricted to the Picker API and your origins, and copy the **project number**.
5. Copy `.env.example` to `.env` and fill in `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY` and `VITE_GOOGLE_APP_ID` (the project number).

## Project structure

```
src/lib/
  map/         Globe: style, markers, route, halo, camera
  photos/      Import pipeline: EXIF, RAW, Takeout, thumbnails, workers, IndexedDB
  google/      Google sign-in, Drive API and Drive picker
  sync/        Sync with Google Drive
  geo/         Countries, cities and distances (offline)
  library/     Trips, statistics, timeline, formatting
  state/       App state (library, settings, UI)
  components/  UI: panels, viewer, search, settings...
  demo/        Sample library generator
src/routes/    Globe, country, place, trip, "sin ubicación" and statistics pages
scripts/       Build script for the geo data
```

## Data and credits

- Country shapes: [Natural Earth](https://www.naturalearthdata.com/) via [world-atlas](https://github.com/topojson/world-atlas) (public domain)
- Cities: [GeoNames](https://www.geonames.org/) `cities15000` (CC BY 4.0)
- Street and satellite maps: Esri World Topo Map and World Imagery
- Place search: [Nominatim](https://nominatim.org/) (© OpenStreetMap contributors)
- Flags: [country-flag-icons](https://gitlab.com/catamphetamine/country-flag-icons)
- Fonts: Geist, Geist Mono and Instrument Serif
