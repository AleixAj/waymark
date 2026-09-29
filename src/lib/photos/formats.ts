// Small checks by file name, kept apart from the readers (exifr, zip.js) so the
// app can use them without downloading those libraries until an import starts.
import { pathOf } from './pick';

// Camera RAW formats. The browser can't show them, but almost all of them carry a
// ready-made JPEG preview (the one the camera shows on its screen) inside.
const RAW_EXTENSIONS =
	/\.(dng|cr2|cr3|crw|nef|nrw|arw|srf|sr2|raf|orf|rw2|rwl|pef|srw|x3f|3fr|iiq|erf|mrw|kdc|dcr|mos)$/i;

export function isRaw(file: { name: string }) {
	return RAW_EXTENSIONS.test(file.name);
}

/** True when the dropped files look like a Takeout export (zip files or its folder) */
export function looksLikeTakeout(files: File[]) {
	return files.some(
		(f) =>
			f.name.toLowerCase().endsWith('.zip') ||
			(f.name.toLowerCase().endsWith('.json') && /(^|\/)takeout\//i.test(pathOf(f)))
	);
}
