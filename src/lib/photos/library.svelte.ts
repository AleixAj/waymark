import { clearLibrary, loadPhotoPoints } from './db';
import { importPhotos, type ImportProgress } from './importer';
import type { PhotoPoint } from './types';

// App-wide photo state. $state.raw avoids making every point reactive,
// which keeps things fast with thousands of photos (we replace the array instead).
class Library {
	points = $state.raw<PhotoPoint[]>([]);
	progress = $state<ImportProgress | null>(null);
	loaded = $state(false);

	located = $derived(this.points.filter((p) => p.lat !== null).length);

	async load() {
		this.points = await loadPhotoPoints();
		this.loaded = true;
	}

	async import(files: File[]) {
		if (this.progress) return; // one import at a time
		await importPhotos(files, {
			onProgress: (progress) => (this.progress = progress),
			onBatch: (newPoints) => (this.points = [...this.points, ...newPoints])
		});
		this.progress = null;
	}

	async clear() {
		await clearLibrary();
		this.points = [];
	}
}

export const library = new Library();
