# Waymark

Your travel photos on an interactive 3D globe. Drop your photos in, Waymark reads where each one was taken and places it on the planet. Spin the globe, fly into a country or a city, replay a trip along its route and browse the photos you took there.

Everything runs in the browser: photos are processed and stored on your device and are never uploaded anywhere. It even works offline.

**Try it without your own photos:** open the app and click _"Probar con fotos de ejemplo"_. It generates a sample library (about 2,000 photos across 15 trips) right in the browser.

## Features

- **Globe view** with photo clusters, visited countries highlighted and a timeline to filter by date
- **Country view** with cities, days, distance and photos grouped by day
- **Place view** at street level: photos as thumbnails on the map, list synced with what you see
- **Trips detected automatically** from dates and places, with route, stages, _Play trip_ camera flight and GPX export
- **Photo viewer** with EXIF data (camera, lens, settings), location map, favorites and location fixing
- **Photos without GPS**: drag them onto the globe (or click on the map) to place them
- **Statistics**: countries, continents, distance travelled, photos per year, top cities, extreme points
- **Search** (Ctrl/⌘ K) for countries, cities, trips or pasted coordinates
- **Settings**: dark/light/system theme, km/mi, map style, reduced motion, globe quality, storage, export
- Responsive: on phones the panels become draggable bottom sheets

## Stack

- **SvelteKit + Svelte 5** (runes) with TypeScript, built as a static SPA
- **MapLibre GL** with globe projection, styled from the app's design tokens
- **d3-geo** for the flat map and the geometry (point in country, bounds)
- **exifr** to read GPS and camera data, **Dexie** (IndexedDB) to store the library
- **Vitest**, ESLint and Prettier

## How it works

- **Import pipeline**: files go to a pool of Web Workers. Each worker reads EXIF, makes a WebP thumbnail with `createImageBitmap` + `OffscreenCanvas` and finds the country and nearest city offline. The main thread only saves batches, so the globe stays smooth while importing.
- **Offline places**: country shapes (Natural Earth) and ~34k cities (GeoNames) are bundled as static files. A bounding-box check plus `geoContains` finds the country; a 1° grid index finds the city.
- **Trips**: photos sorted by time are split when there is a pause of more than 2.5 days; runs far from home with enough photos become trips, and consecutive photos in the same city become stops.
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

## Project structure

```
src/lib/
  map/         Globe: style, markers, route, halo, camera
  photos/      Import pipeline: EXIF, thumbnails, workers, IndexedDB
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
- Flags: [country-flag-icons](https://gitlab.com/catamphetamine/country-flag-icons)
- Fonts: Geist, Geist Mono and Instrument Serif
