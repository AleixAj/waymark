/// <reference lib="webworker" />
import { paintScene } from './paint';

export type PaintRequest = { scene: string; portrait: boolean };
export type PaintResponse = { thumb: Blob };

// Only the small preview is painted here; the big image is painted when the photo is opened
self.onmessage = async (event: MessageEvent<PaintRequest>) => {
	const { scene, portrait } = event.data;
	const canvas = new OffscreenCanvas(portrait ? 213 : 320, portrait ? 320 : 213);
	paintScene(canvas, scene);
	const thumb = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
	self.postMessage({ thumb } satisfies PaintResponse);
};
