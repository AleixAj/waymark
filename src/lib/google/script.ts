import { translator } from '$lib/i18n/i18n.svelte';

const t = translator({
	es: { failed: 'No se pudo conectar con Google. Revisa tu conexión.' },
	en: { failed: 'Could not connect to Google. Check your connection.' },
	ca: { failed: "No s'ha pogut connectar amb Google. Revisa la connexió." }
});

const loading = new Map<string, Promise<void>>();

/** Adds a script from Google once; later calls wait for the same load */
export function loadScript(src: string): Promise<void> {
	let promise = loading.get(src);
	if (!promise) {
		promise = new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = src;
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => {
				// Allow a new try (e.g. when the connection comes back)
				loading.delete(src);
				script.remove();
				reject(new Error(t('failed')));
			};
			document.head.append(script);
		});
		loading.set(src, promise);
	}
	return promise;
}
