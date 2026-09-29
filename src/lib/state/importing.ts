import { auth } from '$lib/google/auth.svelte';
import { downloadFile } from '$lib/google/drive';
import { pickFromDrive } from '$lib/google/picker';
import type { ImportItem } from '$lib/photos/importer';
import { pickFiles } from '$lib/photos/pick';
import { looksLikeTakeout, readTakeout, type TakeoutAlbum } from '$lib/photos/takeout';
import { library } from './library.svelte';
import { ui } from './ui.svelte';

// The three ways to add photos: this device, Google Drive and Google Takeout

export async function importFromDevice(folder = false) {
	const files = await pickFiles(folder);
	if (files.length) await importFiles(files);
}

/** Files chosen or dropped: a Takeout export opens the album chooser first */
export async function importFiles(files: File[]) {
	ui.closeImport();
	if (looksLikeTakeout(files)) {
		ui.importNote = 'Leyendo tu exportación de Google Fotos…';
		try {
			const albums = await readTakeout(files);
			if (albums?.length) {
				ui.takeout = albums;
				return;
			}
		} catch {
			ui.importNote = 'No se pudo leer el archivo. ¿Es un .zip de Google Takeout completo?';
			return;
		} finally {
			if (ui.importNote?.startsWith('Leyendo')) ui.importNote = null;
		}
	}
	await library.import(files);
}

/** Takeout: the .zip files, or the folder once unzipped */
export async function importTakeout(folder = false) {
	const files = await pickFiles(folder, '.zip,application/zip');
	if (files.length) await importFiles(files);
}

/** Imports the photos of the albums chosen in a Takeout export */
export async function importAlbums(albums: TakeoutAlbum[]) {
	ui.takeout = null;
	await library.import(albums.flatMap((album) => album.items));
}

/**
 * Photos chosen in Google Drive. They are not copied to Drive again:
 * Waymark remembers the Drive file and reads it from there.
 */
export async function importFromDrive() {
	const token = await auth.getToken(true);
	if (!token) return;
	const picked = await pickFromDrive(token);
	if (!picked.length) return;
	ui.closeImport();
	const items: ImportItem[] = picked.map((doc) => ({
		name: doc.name,
		type: doc.mimeType,
		hint: { driveId: doc.id },
		open: async () => {
			// A long import can outlive the first token
			const current = (await auth.getToken(false)) ?? token;
			const blob = await downloadFile(current, doc.id);
			return new File([blob], doc.name, {
				type: doc.mimeType,
				lastModified: doc.lastEditedUtc ?? Date.now()
			});
		}
	}));
	await library.import(items);
}
