import type { PhotoRecord, TripEdit } from '$lib/photos/db';

export interface SyncPlan {
	/** What library.json should list after this sync */
	merged: PhotoRecord[];
	/** Newer versions from another device: saved here (text only, images stay) */
	updateLocal: PhotoRecord[];
	/** Photos only in Drive: their image is downloaded */
	download: PhotoRecord[];
	/** Photos only here: a copy goes up to Drive */
	upload: PhotoRecord[];
}

/**
 * Compares the photos of this device with the list saved in Drive.
 * When both have a photo, the most recent change wins (a favorite marked on
 * the phone reaches the computer). Sample photos never leave the device.
 * `remoteExists` is false when Drive has no list yet (first sync, or the
 * folder was deleted): then every photo goes up again.
 */
export function planSync(
	local: PhotoRecord[],
	remote: PhotoRecord[],
	remoteExists: boolean
): SyncPlan {
	const localById = new Map(local.map((p) => [p.id, p]));
	const plan: SyncPlan = { merged: [], updateLocal: [], download: [], upload: [] };

	for (const theirs of remote) {
		const mine = localById.get(theirs.id);
		if (!mine) {
			plan.merged.push(theirs);
			if (theirs.driveId) plan.download.push(theirs);
			continue;
		}
		if ((theirs.updatedAt ?? 0) > (mine.updatedAt ?? 0)) {
			// Their text, but this device keeps knowing its own copy in Drive
			const newer = { ...theirs, driveId: theirs.driveId ?? mine.driveId };
			plan.merged.push(newer);
			plan.updateLocal.push(withoutDeviceFields(newer));
		} else {
			plan.merged.push({ ...mine, driveId: mine.driveId ?? theirs.driveId });
		}
	}

	const inRemote = new Set(remote.map((p) => p.id));
	for (const mine of local) {
		if (inRemote.has(mine.id) || mine.demo) continue;
		// A copy made by Waymark whose list is gone was deleted with the folder
		const lost = !remoteExists && mine.driveId && !mine.driveOriginal;
		const record = lost ? { ...mine, driveId: undefined } : mine;
		plan.merged.push(record);
		if (!record.driveId) plan.upload.push(record);
	}
	return plan;
}

/** Whether this browser can show the image depends on the device, not on the photo */
function withoutDeviceFields(record: PhotoRecord): PhotoRecord {
	const { previewable: _previewable, ...rest } = record;
	return rest;
}

/** The list saved in Drive: no device-only fields */
export function toRemote(records: PhotoRecord[]) {
	return records.map(withoutDeviceFields);
}

/** Trip titles and covers: the most recent edit of each trip wins */
export function mergeTrips(local: TripEdit[], remote: TripEdit[]) {
	const merged = new Map(local.map((t) => [t.id, t]));
	const updateLocal: TripEdit[] = [];
	for (const theirs of remote) {
		const mine = merged.get(theirs.id);
		if (!mine || (theirs.updatedAt ?? 0) > (mine.updatedAt ?? 0)) {
			merged.set(theirs.id, theirs);
			updateLocal.push(theirs);
		}
	}
	return { merged: [...merged.values()], updateLocal };
}
