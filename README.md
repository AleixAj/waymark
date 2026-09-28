# Waymark

Your travel photos on an interactive 3D globe. Drop your photos in, Waymark reads where each one was taken and places it on the map. Spin the planet, zoom into a country or a city, and see the photos you took there.

Everything runs in the browser: photos are processed and stored on your device and are never uploaded anywhere.

## Stack

- **SvelteKit + Svelte 5** (runes) with TypeScript, built as a static SPA
- **MapLibre GL** with globe projection and free vector tiles from [OpenFreeMap](https://openfreemap.org)
- **exifr** to read GPS position and capture date from EXIF
- **Dexie** (IndexedDB) to keep the library in the browser
- **Vitest**, ESLint and Prettier

## Performance notes

- EXIF parsing and thumbnails run in a pool of **Web Workers**, so the globe stays smooth while importing.
- Thumbnails are resized with `createImageBitmap` + `OffscreenCanvas` and saved as small WebP files.
- Photo clustering happens inside MapLibre's own worker.
- The map only receives light data (id, position, date); the heavy blobs stay in IndexedDB until needed.
- Photos are saved in batches, so the globe fills up progressively during an import.

## Getting started

```bash
pnpm install
pnpm dev
```

| Command      | What it does          |
| ------------ | --------------------- |
| `pnpm dev`   | Start the dev server  |
| `pnpm build` | Build the static site |
| `pnpm test`  | Run unit tests        |
| `pnpm check` | Type check            |
| `pnpm lint`  | Prettier + ESLint     |

## Project structure

```
src/lib/
  map/         Globe component, map config and layers
  photos/      Import pipeline: EXIF, thumbnails, worker, IndexedDB, app state
  components/  UI pieces
  styles/      Global styles and design tokens
```
