// RAW files often have no image type, so the picker would hide them
const RAW_TYPES = '.dng,.cr2,.cr3,.nef,.arw,.raf,.orf,.rw2,.pef,.srw';

/**
 * Opens the system file picker. With `folder` the user picks a whole folder.
 * Resolves with an empty list if the user cancels.
 */
export function pickFiles(
	folder = false,
	accept = `image/*,.heic,.heif,${RAW_TYPES}`
): Promise<File[]> {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.multiple = true;
		input.hidden = true;
		if (folder) input.webkitdirectory = true;
		else input.accept = accept;

		const finish = (files: File[]) => {
			input.remove();
			resolve(files);
		};
		input.addEventListener('change', () => finish(Array.from(input.files ?? [])));
		input.addEventListener('cancel', () => finish([]));
		// Some older browsers only open pickers of inputs that are in the page
		document.body.append(input);
		input.click();
	});
}

// Folder of each dropped file ("Takeout/Google Fotos/Viaje a Roma/IMG_1.jpg"),
// needed to know the albums of a Google Takeout export
const droppedPaths = new WeakMap<File, string>();

/** Path of a file inside the folder the user chose or dropped */
export function pathOf(file: File) {
	return droppedPaths.get(file) ?? (file.webkitRelativePath || file.name);
}

/** Files dropped on the page, including the photos inside dropped folders */
export async function droppedFiles(data: DataTransfer): Promise<File[]> {
	const entries = Array.from(data.items)
		.map((item) => item.webkitGetAsEntry?.())
		.filter((entry): entry is FileSystemEntry => !!entry);
	// Browsers without folder support: plain file list
	if (entries.length === 0) return Array.from(data.files);

	const files: File[] = [];
	for (const entry of entries) await collect(entry, files);
	return files;
}

async function collect(entry: FileSystemEntry, files: File[]) {
	if (entry.isFile) {
		const file = await new Promise<File | null>((resolve) =>
			(entry as FileSystemFileEntry).file(resolve, () => resolve(null))
		);
		if (file) {
			droppedPaths.set(file, entry.fullPath.replace(/^\//, ''));
			files.push(file);
		}
		return;
	}
	if (!entry.isDirectory) return;
	const reader = (entry as FileSystemDirectoryEntry).createReader();
	// readEntries returns the content in chunks: keep reading until it's empty
	for (;;) {
		const chunk = await new Promise<FileSystemEntry[]>((resolve) =>
			reader.readEntries(resolve, () => resolve([]))
		);
		if (chunk.length === 0) break;
		for (const child of chunk) await collect(child, files);
	}
}
