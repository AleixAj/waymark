import { describe, expect, it } from 'vitest';
import { degrees, exifDate, findJpegs, isRaw } from './raw';

/** Smallest JPEG structure: start, frame header, scan with some data, end */
function jpeg(frame: number, width: number, height: number, dataSize = 10_000) {
	const data = new Array(dataSize).fill(0x12);
	// Bytes the scanner must not take as the end: FF 00 and a restart mark
	data[100] = 0xff;
	data[101] = 0x00;
	data[200] = 0xff;
	data[201] = 0xd3;
	return [
		0xff,
		0xd8,
		0xff,
		frame,
		0x00,
		0x0b,
		0x08,
		height >> 8,
		height & 0xff,
		width >> 8,
		width & 0xff,
		0x01,
		0x01,
		0x11,
		0x00,
		0xff,
		0xda,
		0x00,
		0x08,
		0x01,
		0x01,
		0x00,
		0x00,
		0x3f,
		0x00,
		...data,
		0xff,
		0xd9
	];
}

describe('findJpegs', () => {
	it('finds the previews, biggest first, and skips lossless sensor data', () => {
		const bytes = new Uint8Array([
			...new Array(50).fill(0),
			...jpeg(0xc0, 160, 120),
			...jpeg(0xc3, 6000, 4000),
			...jpeg(0xc2, 1620, 1080),
			...new Array(50).fill(0)
		]);
		const found = findJpegs(bytes);
		expect(found.map((j) => [j.width, j.height])).toEqual([
			[1620, 1080],
			[160, 120]
		]);
		expect(found[0].bytes[0]).toBe(0xff);
		expect(found[0].bytes[found[0].bytes.length - 1]).toBe(0xd9);
	});

	it('ignores tiny thumbnails and broken images', () => {
		const cut = jpeg(0xc0, 800, 600).slice(0, 5000);
		const bytes = new Uint8Array([...jpeg(0xc0, 80, 60, 100), ...cut]);
		expect(findJpegs(bytes)).toEqual([]);
	});
});

describe('RAW helpers', () => {
	it('knows RAW files by their extension', () => {
		expect(isRaw({ name: 'DSC_0001.NEF' })).toBe(true);
		expect(isRaw({ name: 'IMG_1.cr3' })).toBe(true);
		expect(isRaw({ name: 'photo.jpg' })).toBe(false);
	});

	it('turns GPS degrees, minutes and seconds into decimals', () => {
		expect(degrees([41, 24, 12.96], 'N', 'S')).toBeCloseTo(41.4036, 4);
		expect(degrees([21, 54, 46.8], 'W', 'W')).toBeCloseTo(-21.913, 3);
		expect(degrees([1, 2], 'N', 'S')).toBeUndefined();
	});

	it('reads EXIF dates as local time', () => {
		expect(exifDate('2023:08:02 09:15:00')?.getTime()).toBe(new Date(2023, 7, 2, 9, 15).getTime());
		expect(exifDate(42)).toBeUndefined();
	});
});
