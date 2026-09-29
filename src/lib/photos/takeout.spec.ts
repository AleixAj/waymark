import { describe, expect, it } from 'vitest';
import { BlobReader, BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { matchSidecar, parseSidecar, photoKey, readTakeout, sidecarKey } from './takeout';

const sidecar = (lat: number, lng: number, title = 'IMG_1.JPG') => ({
	title,
	photoTakenTime: { timestamp: '1690960500' },
	geoData: { latitude: lat, longitude: lng, altitude: 12 }
});

describe('Takeout names', () => {
	it('finds the photo name in every kind of sidecar name', () => {
		expect(sidecarKey('IMG_1.JPG.json')).toBe('img_1.jpg');
		expect(sidecarKey('IMG_1.JPG.supplemental-metadata.json')).toBe('img_1.jpg');
		expect(sidecarKey('IMG_1.JPG.suppl.json')).toBe('img_1.jpg');
		expect(sidecarKey('IMG_1.JPG(1).json')).toBe('img_1.jpg(1)');
		expect(sidecarKey('IMG_1.JPG.supplemental-metadata(2).json')).toBe('img_1.jpg(2)');
	});

	it('matches repeated names and edited copies', () => {
		expect(photoKey('IMG_1(1).JPG')).toBe('img_1.jpg(1)');
		expect(photoKey('IMG_1-editado.JPG')).toBe('img_1.jpg');
	});

	it('pairs a photo with its sidecar, also when the name was cut', () => {
		const long = 'PXL_20230802_091500123.MP.jpg';
		const sidecars = [
			parseSidecar('IMG_1.JPG.json', sidecar(1, 1))!,
			parseSidecar('IMG_1.JPG(1).json', sidecar(2, 2))!,
			parseSidecar('PXL_20230802_091500123.M.json', sidecar(3, 3, long))!
		];
		expect(matchSidecar('IMG_1.JPG', sidecars)?.hint.lat).toBe(1);
		expect(matchSidecar('IMG_1(1).JPG', sidecars)?.hint.lat).toBe(2);
		expect(matchSidecar(long, sidecars)?.hint.lat).toBe(3);
	});

	it('ignores album files and unknown places', () => {
		expect(parseSidecar('metadata.json', { title: 'Roma' })).toBeNull();
		const unknown = parseSidecar('IMG_2.JPG.json', sidecar(0, 0));
		expect(unknown?.hint).toEqual({ takenAt: 1690960500000 });
	});
});

describe('readTakeout', () => {
	it('reads albums and locations from a zip', async () => {
		const writer = new ZipWriter(new BlobWriter('application/zip'));
		const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])]);
		await writer.add('Takeout/Google Fotos/Roma 2023/IMG_1.JPG', new BlobReader(jpeg));
		await writer.add(
			'Takeout/Google Fotos/Roma 2023/IMG_1.JPG.supplemental-metadata.json',
			new TextReader(JSON.stringify(sidecar(41.9, 12.5)))
		);
		await writer.add(
			'Takeout/Google Fotos/Roma 2023/metadata.json',
			new TextReader(JSON.stringify({ title: 'Roma 2023' }))
		);
		await writer.add('Takeout/Google Fotos/Photos from 2023/IMG_1.JPG', new BlobReader(jpeg));
		await writer.add('Takeout/Google Fotos/Photos from 2023/VID_2.MP4', new BlobReader(jpeg));
		const zip = new File([await writer.close()], 'takeout-001.zip');

		const albums = await readTakeout([zip]);
		expect(albums?.map((a) => [a.name, a.byYear, a.items.length])).toEqual([
			['Roma 2023', false, 1],
			['Photos from 2023', true, 1]
		]);
		const [roma] = albums!;
		expect(roma.items[0].hint).toMatchObject({ lat: 41.9, lng: 12.5 });
		const file = await roma.items[0].open();
		expect(file.name).toBe('IMG_1.JPG');
		expect(file.size).toBe(4);
	});

	it('says null for files that are not a Takeout', async () => {
		expect(await readTakeout([new File(['x'], 'photo.jpg')])).toBeNull();
	});
});
