// Id of a photo based on its content, so the same photo imported twice is detected
// even if it was renamed, and two different photos with the same name don't clash.
// Hashing the whole file would be slow, so we hash its size, start and end.
const SAMPLE = 64 * 1024;

export async function fileFingerprint(file: Blob) {
	const start = await file.slice(0, SAMPLE).arrayBuffer();
	const end = file.size > SAMPLE * 2 ? await file.slice(-SAMPLE).arrayBuffer() : new ArrayBuffer(0);
	const sizeBytes = new TextEncoder().encode(String(file.size));

	const data = new Uint8Array(sizeBytes.length + start.byteLength + end.byteLength);
	data.set(sizeBytes, 0);
	data.set(new Uint8Array(start), sizeBytes.length);
	data.set(new Uint8Array(end), sizeBytes.length + start.byteLength);

	const hash = await crypto.subtle.digest('SHA-256', data);
	// 16 bytes are plenty to avoid collisions in a personal library
	return Array.from(new Uint8Array(hash).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join(
		''
	);
}
