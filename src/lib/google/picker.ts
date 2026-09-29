import { GOOGLE_API_KEY, GOOGLE_APP_ID } from './config';
import { loadScript } from './script';

export interface PickedFile {
	id: string;
	name: string;
	mimeType: string;
	/** Last change in Drive, in ms */
	lastEditedUtc?: number;
}

// The small part of the Google Picker API that we use
interface PickerResult {
	action: string;
	docs?: PickedFile[];
}
interface PickerBuilder {
	addView(view: unknown): PickerBuilder;
	enableFeature(feature: string): PickerBuilder;
	setOAuthToken(token: string): PickerBuilder;
	setDeveloperKey(key: string): PickerBuilder;
	setAppId(id: string): PickerBuilder;
	setLocale(locale: string): PickerBuilder;
	setTitle(title: string): PickerBuilder;
	setSize(width: number, height: number): PickerBuilder;
	setCallback(callback: (result: PickerResult) => void): PickerBuilder;
	build(): { setVisible(visible: boolean): void };
}
interface DocsView {
	setParent(id: string): DocsView;
	setIncludeFolders(include: boolean): DocsView;
	setMimeTypes(types: string): DocsView;
	setMode(mode: string): DocsView;
	setLabel(label: string): DocsView;
	setOwnedByMe(mine: boolean): DocsView;
	setStarred(starred: boolean): DocsView;
	setEnableDrives(enabled: boolean): DocsView;
}
interface PickerApi {
	DocsViewMode: { GRID: string };
	PickerBuilder: new () => PickerBuilder;
	DocsView: new (viewId: string) => DocsView;
	ViewId: { DOCS: string };
	Feature: { MULTISELECT_ENABLED: string; SUPPORT_DRIVES: string };
	Action: { PICKED: string; CANCEL: string };
}
// Photo types shown in the picker (other files are hidden, folders are always shown)
const PHOTO_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif',
	'image/avif',
	'image/gif',
	'image/tiff',
	'image/x-adobe-dng',
	'image/x-canon-cr2',
	'image/x-canon-cr3',
	'image/x-nikon-nef',
	'image/x-sony-arw',
	'image/x-fuji-raf',
	'image/x-olympus-orf',
	'image/x-panasonic-rw2'
].join(',');

interface Gapi {
	load(name: string, callback: () => void): void;
}

async function loadPicker(): Promise<PickerApi> {
	await loadScript('https://apis.google.com/js/api.js');
	const scope = window as unknown as { gapi: Gapi; google: { picker: PickerApi } };
	await new Promise<void>((resolve) => scope.gapi.load('picker', resolve));
	return scope.google.picker;
}

/**
 * Opens Google's own window to choose photos from Drive. Waymark only gets
 * access to the photos chosen there. Resolves with [] when cancelled.
 */
export async function pickFromDrive(token: string): Promise<PickedFile[]> {
	const picker = await loadPicker();
	return new Promise((resolve) => {
		// Every tab shows photos as thumbnails; folders are opened one level at a time
		const photos = (label: string) =>
			new picker.DocsView(picker.ViewId.DOCS)
				.setMimeTypes(PHOTO_TYPES)
				.setMode(picker.DocsViewMode.GRID)
				.setLabel(label);
		new picker.PickerBuilder()
			.addView(photos('Mi unidad').setParent('root').setIncludeFolders(true))
			.addView(photos('Compartido conmigo').setOwnedByMe(false).setIncludeFolders(true))
			.addView(photos('Destacados').setStarred(true))
			.addView(photos('Unidades compartidas').setEnableDrives(true).setIncludeFolders(true))
			.enableFeature(picker.Feature.SUPPORT_DRIVES)
			.enableFeature(picker.Feature.MULTISELECT_ENABLED)
			.setOAuthToken(token)
			.setDeveloperKey(GOOGLE_API_KEY)
			// Needed so the chosen files can be read with the drive.file permission
			.setAppId(GOOGLE_APP_ID)
			.setLocale('es')
			.setTitle('Elige las fotos que quieres ver en el globo')
			// As big as Google allows, but never wider than the window
			.setSize(Math.min(1051, window.innerWidth - 32), Math.min(650, window.innerHeight - 32))
			.setCallback((result) => {
				if (result.action === picker.Action.PICKED) resolve(result.docs ?? []);
				else if (result.action === picker.Action.CANCEL) resolve([]);
			})
			.build()
			.setVisible(true);
	});
}
