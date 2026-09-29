import { SCENES } from './data';

type Canvas = OffscreenCanvas | HTMLCanvasElement;

/**
 * Paints a placeholder "photo" like the ones in the design mockups:
 * a three-color gradient (sky, horizon, ground) with thin diagonal lines.
 */
export function paintScene(canvas: Canvas, scene: string, label = '') {
	const { width, height } = canvas;
	const ctx = canvas.getContext('2d') as
		CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	const [a, b, c] = SCENES[scene] ?? SCENES.calle;

	const gradient = ctx.createLinearGradient(0, 0, width * 0.14, height);
	gradient.addColorStop(0, a);
	gradient.addColorStop(0.52, b);
	gradient.addColorStop(1, c);
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
	ctx.lineWidth = Math.max(1, width / 900);
	const step = Math.max(7, width / 110);
	ctx.beginPath();
	for (let x = -height; x < width; x += step) {
		ctx.moveTo(x, 0);
		ctx.lineTo(x + height, height);
	}
	ctx.stroke();

	if (label) {
		const size = Math.max(10, Math.round(width / 70));
		ctx.font = `${size}px "Geist Mono", ui-monospace, monospace`;
		ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
		ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
		ctx.shadowBlur = 2;
		ctx.fillText(label, size * 0.8, height - size * 0.8);
	}
}

/** Full size image for the viewer, painted when the photo is opened */
export async function paintDemoImage(scene: string, label: string, portrait: boolean) {
	const canvas = document.createElement('canvas');
	canvas.width = portrait ? 1000 : 1500;
	canvas.height = portrait ? 1500 : 1000;
	paintScene(canvas, scene, label);
	return new Promise<Blob>((resolve) =>
		canvas.toBlob((blob) => resolve(blob!), 'image/webp', 0.85)
	);
}
