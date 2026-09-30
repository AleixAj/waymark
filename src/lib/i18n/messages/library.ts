import { translator } from '../i18n.svelte';

// Texts of the photo library shown to the user when an import stops
export default translator({
	es: {
		import: 'Importación',
		interrupted: 'Se ha interrumpido'
	},
	en: {
		import: 'Import',
		interrupted: 'It was interrupted'
	},
	ca: {
		import: 'Importació',
		interrupted: "S'ha interromput"
	}
});
