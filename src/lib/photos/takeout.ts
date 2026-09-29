import { BlobReader, BlobWriter, ZipReader, configure } from '@zip.js/zip.js';
import { isImage, type ImportHint, type ImportItem } from './importer';
import { pathOf } from './pick';

// Unzipping uses the browser's own DecompressionStream, no extra workers
configure({ useWebWorkers: false });

/**
 * Google Takeout exports Google Photos as zip files. Each photo comes with a
 * small JSON file ("sidecar") that keeps its date and location, even when
 * Google removed them from the photo itself.
 */
export interface TakeoutAlbum {
	/** Folder of the album inside the export */
	id: string;
	name: string;
	/** "Photos from 2023" folders: every photo of that year */
	byYear: boolean;
	items: ImportItem[];
}

interface Entry {
	path: string;
	open: () => Promise<File>;
}

interface Sidecar {
	/** Name the photo should have, e.g. "IMG_1234.JPG(1)" for a repeated name */
	key: string;
	/** Original name of the photo */
	title: string;
	hint: ImportHint;
}

const YEAR_FOLDER = /^(photos from|fotos de|fotos del año|fotos del) \d{4}$/i;

/** Albums of a Takeout export, or null if the files are not one */
export async function readTakeout(files: File[]): Promise<TakeoutAlbum[] | null> {
	const entries = await listEntries(files);
	const sidecars = new Map<string, Sidecar[]>();
	let found = 0;
	for (const entry of entries) {
		if (!entry.path.toLowerCase().endsWith('.json')) continue;
		const sidecar = await readSidecar(entry);
		if (!sidecar) continue;
		const folder = dirname(entry.path);
		sidecars.set(folder, [...(sidecars.get(folder) ?? []), sidecar]);
		found++;
	}
	if (found === 0) return null;

	const albums = new Map<string, TakeoutAlbum>();
	for (const entry of entries) {
		const name = basename(entry.path);
		if (!isImage({ name })) continue;
		const folder = dirname(entry.path);
		const sidecar = matchSidecar(name, sidecars.get(folder) ?? []);
		const albumName = basename(folder) || 'Google Fotos';
		let album = albums.get(folder);
		if (!album) {
			album = { id: folder, name: albumName, byYear: YEAR_FOLDER.test(albumName), items: [] };
			albums.set(folder, album);
		}
		// Year folders ("Photos from 2023") are not albums the user made
		const hint = album.byYear ? sidecar?.hint : { ...sidecar?.hint, album: albumName };
		album.items.push({ name, open: entry.open, hint });
	}
	// Albums first (by name), then the years (newest first)
	return [...albums.values()].sort((a, b) =>
		a.byYear !== b.byYear
			? a.byYear
				? 1
				: -1
			: a.byYear
				? b.name.localeCompare(a.name)
				: a.name.localeCompare(b.name)
	);
}

/** Every file, including the ones inside zip files (read only when opened) */
async function listEntries(files: File[]): Promise<Entry[]> {
	const entries: Entry[] = [];
	for (const file of files) {
		if (!file.name.toLowerCase().endsWith('.zip')) {
			entries.push({ path: pathOf(file), open: async () => file });
			continue;
		}
		const reader = new ZipReader(new BlobReader(file));
		for (const entry of await reader.getEntries()) {
			if (entry.directory) continue;
			const name = basename(entry.filename);
			entries.push({
				path: entry.filename,
				open: async () => {
					const blob = await entry.getData!(new BlobWriter());
					return new File([blob], name, { lastModified: entry.lastModDate.getTime() });
				}
			});
		}
	}
	return entries;
}

async function readSidecar(entry: Entry): Promise<Sidecar | null> {
	try {
		const data = JSON.parse(await (await entry.open()).text());
		return parseSidecar(basename(entry.path), data);
	} catch {
		return null;
	}
}

interface SidecarJson {
	title?: string;
	photoTakenTime?: { timestamp?: string };
	geoData?: GeoJson;
	geoDataExif?: GeoJson;
}
interface GeoJson {
	latitude?: number;
	longitude?: number;
	altitude?: number;
}

/** Date and place from a sidecar; album files ("metadata.json") give null */
export function parseSidecar(fileName: string, data: SidecarJson): Sidecar | null {
	const seconds = Number(data.photoTakenTime?.timestamp);
	if (typeof data.title !== 'string' || !Number.isFinite(seconds) || seconds <= 0) return null;
	const place = position(data.geoData) ?? position(data.geoDataExif);
	return {
		key: sidecarKey(fileName),
		title: data.title,
		hint: { takenAt: seconds * 1000, ...place }
	};
}

/** Google writes 0, 0 when it doesn't know the place */
function position(geo: GeoJson | undefined) {
	if (!geo || typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') return null;
	if (geo.latitude === 0 && geo.longitude === 0) return null;
	return { lat: geo.latitude, lng: geo.longitude, altitude: geo.altitude };
}

/**
 * Name of the photo a sidecar belongs to. Takeout names them in several ways:
 * "IMG_1.JPG.json", "IMG_1.JPG.supplemental-metadata.json", a cut version like
 * "IMG_1.JPG.suppl.json", and "IMG_1.JPG(1).json" for the second photo called IMG_1.
 */
export function sidecarKey(fileName: string) {
	let base = fileName.replace(/\.json$/i, '');
	const repeated = base.match(/^(.*)\((\d+)\)$/);
	if (repeated) base = repeated[1];
	const dot = base.lastIndexOf('.');
	const last = base.slice(dot).toLowerCase();
	if (dot > 0 && last.length > 1 && '.supplemental-metadata'.startsWith(last)) {
		base = base.slice(0, dot);
	}
	return (repeated ? `${base}(${repeated[2]})` : base).toLowerCase();
}

/** "IMG_1(1).JPG" -> "img_1.jpg(1)"; edited copies ("IMG_1-editado.JPG") use the original's */
export function photoKey(fileName: string) {
	const name = fileName.replace(
		/-(editado|edited|bearbeitet|modifié|modificato|bewerkt)(\.[^.]+)$/i,
		'$2'
	);
	const repeated = name.match(/^(.*)\((\d+)\)(\.[^.]+)$/);
	return (repeated ? `${repeated[1]}${repeated[3]}(${repeated[2]})` : name).toLowerCase();
}

/** The sidecar of a photo among the sidecars of its folder */
export function matchSidecar(fileName: string, sidecars: Sidecar[]): Sidecar | null {
	const key = photoKey(fileName);
	const lower = fileName.toLowerCase();
	return (
		sidecars.find((s) => s.key === key) ??
		sidecars.find((s) => s.title.toLowerCase() === lower) ??
		// Long names are cut in the sidecar file name
		sidecars.find((s) => s.key.length >= 20 && key.startsWith(s.key)) ??
		null
	);
}

function basename(path: string) {
	return path.slice(path.lastIndexOf('/') + 1);
}

function dirname(path: string) {
	const slash = path.lastIndexOf('/');
	return slash < 0 ? '' : path.slice(0, slash);
}
