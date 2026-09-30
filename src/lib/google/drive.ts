// Small client for the Google Drive REST API (v3). Drive accepts calls straight
// from the browser with the user's token, so Waymark needs no server.
import t from '$lib/i18n/messages/sync';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_TYPE = 'application/vnd.google-apps.folder';

export interface DriveFile {
	id: string;
	name: string;
}

/** A failed Drive call; 401 means the token expired */
export class DriveError extends Error {
	constructor(public status: number) {
		super(t('driveStatus', { status: String(status) }));
	}
}

async function call(token: string, url: string, init: RequestInit = {}) {
	const response = await fetch(url, {
		...init,
		headers: { ...init.headers, Authorization: `Bearer ${token}` }
	});
	if (!response.ok) throw new DriveError(response.status);
	return response;
}

/** Quotes a value for a Drive search */
function quote(value: string) {
	return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Files that match a search, oldest first */
async function findFiles(token: string, query: string): Promise<DriveFile[]> {
	const files: DriveFile[] = [];
	let pageToken = '';
	do {
		const params = new URLSearchParams({
			q: `${query} and trashed = false`,
			fields: 'nextPageToken, files(id, name)',
			orderBy: 'createdTime',
			pageSize: '1000',
			spaces: 'drive'
		});
		if (pageToken) params.set('pageToken', pageToken);
		const data = await (await call(token, `${API}/files?${params}`)).json();
		files.push(...data.files);
		pageToken = data.nextPageToken ?? '';
	} while (pageToken);
	return files;
}

/** The app folder in the user's Drive, or null if there is none yet */
export async function findFolder(token: string, name: string) {
	const [folder] = await findFiles(token, `name = ${quote(name)} and mimeType = '${FOLDER_TYPE}'`);
	return folder?.id ?? null;
}

export async function createFolder(token: string, name: string) {
	const response = await call(token, `${API}/files?fields=id`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, mimeType: FOLDER_TYPE })
	});
	return ((await response.json()) as { id: string }).id;
}

/** A file inside a folder, by name */
export async function findInFolder(token: string, folder: string, name: string) {
	const [file] = await findFiles(token, `name = ${quote(name)} and ${quote(folder)} in parents`);
	return file?.id ?? null;
}

/** Uploads a new file (details and content in one request) and returns its id */
export async function uploadFile(
	token: string,
	file: { name: string; parent: string; blob: Blob }
): Promise<string> {
	const boundary = `waymark-${crypto.randomUUID()}`;
	const details = { name: file.name, parents: [file.parent] };
	const body = new Blob([
		`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
		JSON.stringify(details),
		`\r\n--${boundary}\r\nContent-Type: ${file.blob.type || 'application/octet-stream'}\r\n\r\n`,
		file.blob,
		`\r\n--${boundary}--`
	]);
	const response = await call(token, `${UPLOAD}/files?uploadType=multipart&fields=id`, {
		method: 'POST',
		headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
		body
	});
	return ((await response.json()) as { id: string }).id;
}

/** Replaces the content of a file */
export async function updateFile(token: string, id: string, blob: Blob) {
	await call(token, `${UPLOAD}/files/${id}?uploadType=media`, {
		method: 'PATCH',
		headers: { 'Content-Type': blob.type || 'application/octet-stream' },
		body: blob
	});
}

export async function downloadFile(token: string, id: string): Promise<Blob> {
	return (await call(token, `${API}/files/${id}?alt=media`)).blob();
}

/** Moves a file or folder to the Drive trash (it can be restored for 30 days) */
export async function trashFile(token: string, id: string) {
	await call(token, `${API}/files/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ trashed: true })
	});
}
