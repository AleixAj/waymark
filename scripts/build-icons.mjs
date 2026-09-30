// Makes every size of the logo from the original drawing (docs/brand/logo.png):
//   src/lib/assets/logo.webp   -> the logo next to the name in the app
//   src/lib/assets/logo-hero.webp -> the big one on the welcome screen (sharp on retina)
//   static/favicon.png         -> browser tab
//   static/apple-touch-icon.png, static/icons/*.png -> home screen when installed
// Run with: node scripts/build-icons.mjs
import sharp from 'sharp';

const SOURCE = 'docs/brand/logo.png';
// Home screen icons need a background: a warm cream makes the navy outline stand out
const CREAM = { r: 255, g: 244, b: 224, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// The drawing without the empty space around it
const logo = await sharp(SOURCE).trim().toBuffer();

/** The logo centered in a square, taking `share` of its width */
async function square(size, share, background) {
	const inner = Math.round(size * share);
	const resized = await sharp(logo)
		.resize(inner, inner, { fit: 'contain', background: CLEAR })
		.toBuffer();
	return sharp({ create: { width: size, height: size, channels: 4, background } }).composite([
		{ input: resized, gravity: 'center' }
	]);
}

await sharp(logo).resize({ height: 96 }).webp({ quality: 90 }).toFile('src/lib/assets/logo.webp');
await sharp(logo)
	.resize({ height: 360 })
	.webp({ quality: 88 })
	.toFile('src/lib/assets/logo-hero.webp');
await (
	await square(64, 1, CLEAR)
)
	.png({ palette: true, compressionLevel: 9 })
	.toFile('static/favicon.png');
await (
	await square(180, 0.78, CREAM)
)
	.png({ palette: true, compressionLevel: 9 })
	.toFile('static/apple-touch-icon.png');
await (
	await square(192, 0.9, CLEAR)
)
	.png({ palette: true, compressionLevel: 9 })
	.toFile('static/icons/icon-192.png');
await (
	await square(512, 0.9, CLEAR)
)
	.png({ palette: true, compressionLevel: 9 })
	.toFile('static/icons/icon-512.png');
// Android crops these into circles or other shapes: the logo stays in the safe middle
await (
	await square(512, 0.62, CREAM)
)
	.png({ palette: true, compressionLevel: 9 })
	.toFile('static/icons/maskable-512.png');
console.log('icons ready');
