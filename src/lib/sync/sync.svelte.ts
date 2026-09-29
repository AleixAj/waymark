import { auth, AuthError } from '$lib/google/auth.svelte';
import {
	createFolder,
	downloadFile,
	DriveError,
	findFolder,
	findInFolder,
	trashFile,
	updateFile,
	uploadFile
} from '$lib/google/drive';
import {
	applyRecords,
	exportMetadata,
	getPhoto,
	savePhotos,
	saveTripEdits,
	setDriveId,
	type PhotoRecord,
	type TripEdit
} from '$lib/photos/db';
import { createWorker, processInWorker } from '$lib/photos/importer';
import { syncCopy } from './copy';
import { demoMode } from '$lib/state/mode';
import { mergeTrips, planSync, toRemote } from './plan';

// Everything lives in one folder of the user's Drive
const FOLDER = 'Waymark';
// The list of photos (text only) that every device reads
const LIBRARY_FILE = 'library.json';
const PARALLEL = 3;
// library.json is saved every so many uploads, so a closed tab loses little
const SAVE_EVERY = 25;
const LAST_SYNC_KEY = 'waymark-last-sync';

interface LibraryFile {
	version: 1;
	photos: PhotoRecord[];
	trips: TripEdit[];
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'reconnect' | 'error';

/**
 * Keeps the library the same on every device of the user. Drive holds a light
 * copy of each photo and library.json with their details; each device uploads
 * what it has new and downloads what the others added.
 */
class Sync {
	status = $state<SyncStatus>('off');
	message = $state<string | null>(null);
	progress = $state<{ done: number; total: number } | null>(null);
	lastSync = $state<number | null>(null);
	/** Called when photos arrived from Drive, so the library reloads them */
	onPulled: (() => Promise<void>) | null = null;

	private timer: ReturnType<typeof setTimeout> | null = null;
	private running: Promise<void> | null = null;
	private again = false;

	constructor() {
		try {
			const saved = Number(localStorage.getItem(LAST_SYNC_KEY));
			if (saved > 0) this.lastSync = saved;
		} catch {
			// Blocked storage
		}
	}

	/** Syncs soon: many quick changes (favorites, an import) become one sync */
	schedule(delay = 3000) {
		// The sample library never goes to the user's Drive
		if (!auth.signedIn || demoMode) return;
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => this.run(false), delay);
	}

	/** Syncs now. From a click (`interactive`) it may ask Google for a new token. */
	run(interactive: boolean): Promise<void> {
		if (!auth.signedIn || demoMode) return Promise.resolve();
		if (this.running) {
			this.again = true;
			return this.running;
		}
		this.running = this.sync(interactive).finally(() => {
			this.running = null;
			if (this.again) {
				this.again = false;
				this.schedule(1000);
			}
		});
		return this.running;
	}

	/** After signing out: this device keeps its photos, nothing is synced */
	stop() {
		if (this.timer) clearTimeout(this.timer);
		this.status = 'off';
		this.message = null;
		this.lastSync = null;
		try {
			localStorage.removeItem(LAST_SYNC_KEY);
		} catch {
			// Blocked storage
		}
	}

	/** Deleting the library also sends the Drive folder to the trash (it can be restored) */
	async deleteRemote() {
		const token = await auth.getToken(true);
		if (!token) return;
		const folder = await findFolder(token, FOLDER);
		if (folder) await trashFile(token, folder);
		this.stop();
		this.status = 'idle';
	}

	private async sync(interactive: boolean) {
		let token: string | null;
		try {
			token = await auth.getToken(interactive);
		} catch (error) {
			this.fail(error instanceof AuthError ? error.message : 'No se pudo conectar con Google');
			return;
		}
		if (!token) {
			this.status = 'reconnect';
			return;
		}

		this.status = 'syncing';
		this.message = null;
		try {
			await this.syncWith(token);
			this.lastSync = Date.now();
			try {
				localStorage.setItem(LAST_SYNC_KEY, String(this.lastSync));
			} catch {
				// Blocked storage
			}
			this.status = 'idle';
		} catch (error) {
			if (error instanceof DriveError && error.status === 401) {
				// The token expired halfway: a click on "Sincronizar" gets a new one
				auth.expire();
				this.status = 'reconnect';
			} else if (error instanceof DriveError && error.status === 403) {
				this.fail('Tu Google Drive está lleno o no da permiso');
			} else {
				this.fail('No se pudo sincronizar con Google Drive');
			}
		} finally {
			this.progress = null;
		}
	}

	private async syncWith(token: string) {
		const folder = (await findFolder(token, FOLDER)) ?? (await createFolder(token, FOLDER));
		let libraryId = await findInFolder(token, folder, LIBRARY_FILE);
		const remote = libraryId ? await readLibrary(token, libraryId) : null;
		const local = await exportMetadata();

		const plan = planSync(local.photos, remote?.photos ?? [], remote !== null);
		const trips = mergeTrips(local.trips, remote?.trips ?? []);
		if (plan.updateLocal.length) await applyRecords(plan.updateLocal);
		if (trips.updateLocal.length) await saveTripEdits(trips.updateLocal);

		const merged = new Map(plan.merged.map((p) => [p.id, p]));
		const save = async () => {
			const file: LibraryFile = {
				version: 1,
				photos: toRemote([...merged.values()]),
				trips: trips.merged
			};
			const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
			if (libraryId) await updateFile(token, libraryId, blob);
			else libraryId = await uploadFile(token, { name: LIBRARY_FILE, parent: folder, blob });
		};

		this.progress = { done: 0, total: plan.upload.length + plan.download.length };
		let sinceSave = 0;
		await inParallel(plan.upload, async (record) => {
			const photo = await getPhoto(record.id);
			if (photo) {
				const copy = await syncCopy(photo.file, photo.display);
				const driveId = await uploadFile(token, {
					name: copyName(photo.name, copy),
					parent: folder,
					blob: copy
				});
				await setDriveId(photo.id, driveId);
				merged.set(photo.id, { ...merged.get(photo.id)!, driveId });
				if (++sinceSave >= SAVE_EVERY) {
					sinceSave = 0;
					await save();
				}
			}
			this.tick();
		});
		await save();

		// Photos added on other devices: download the copy and make the thumbnail here
		const workers: Worker[] = [];
		try {
			await inParallel(plan.download, async (record, slot) => {
				workers[slot] ??= createWorker();
				let blob: Blob;
				try {
					blob = await downloadFile(token, record.driveId!);
				} catch (error) {
					// A photo deleted from Drive by hand is skipped; an expired token stops the sync
					if (error instanceof DriveError && error.status === 404) {
						this.tick();
						return;
					}
					throw error;
				}
				const file = new File([blob], record.name, { type: blob.type });
				const result = await processInWorker(workers[slot], file);
				if (result !== 'timeout' && result.ok) {
					const { thumb, display, previewable } = result.photo;
					await savePhotos([
						{ ...record, thumb, file: blob, previewable, ...(display && { display }) }
					]);
				}
				this.tick();
			});
		} finally {
			for (const worker of workers) worker?.terminate();
		}

		if (plan.download.length || plan.updateLocal.length || trips.updateLocal.length) {
			await this.onPulled?.();
		}
	}

	private tick() {
		if (this.progress) this.progress = { ...this.progress, done: this.progress.done + 1 };
	}

	private fail(message: string) {
		this.status = 'error';
		this.message = message;
	}
}

async function readLibrary(token: string, id: string): Promise<LibraryFile | null> {
	try {
		const data = JSON.parse(await (await downloadFile(token, id)).text()) as LibraryFile;
		return Array.isArray(data.photos) ? { ...data, trips: data.trips ?? [] } : null;
	} catch (error) {
		if (error instanceof DriveError) throw error;
		// A broken list is rebuilt from this device
		return null;
	}
}

/** "IMG_1234.HEIC" uploaded as a JPEG copy is called "IMG_1234.jpg" */
function copyName(name: string, copy: Blob) {
	if (copy.type !== 'image/jpeg') return name;
	return name.replace(/\.[^.]+$/, '') + '.jpg';
}

/** Runs `task` on every item, a few at a time; `slot` tells which lane runs it */
async function inParallel<T>(items: T[], task: (item: T, slot: number) => Promise<void>) {
	let next = 0;
	const lane = async (slot: number) => {
		while (next < items.length) await task(items[next++], slot);
	};
	await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, (_, i) => lane(i)));
}

export const sync = new Sync();

/** Signs in with Google and brings the library in line with Drive right away */
export async function signIn() {
	await auth.signIn();
	await sync.run(false);
}

/** Signs out; the photos stay in this browser */
export function signOut() {
	auth.signOut();
	sync.stop();
}
