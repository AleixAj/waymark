import { translator } from '../i18n.svelte';

// Texts of the app frame: the layout, the world page, the flat map notice and dialogs
export default translator({
	es: {
		demoImport: 'Sal de la demo y entra con Google para añadir tus fotos',
		signInImport: 'Entra con Google para añadir tus fotos',
		dropTitle: 'Suelta las fotos para colocarlas en el globo',
		dropLead: 'Leemos la ubicación de cada una en este navegador',
		showPanel: 'Mostrar panel',
		noGlobe: 'Tu navegador no puede mostrar el globo 3D',
		noGlobeText:
			'Falta soporte para WebGL o está desactivado. Puedes seguir con el mapa plano: tus fotos, viajes, países y estadísticas siguen disponibles.',
		flatMap: 'Usar mapa plano',
		enableWebGL: 'Cómo activar WebGL'
	},
	en: {
		demoImport: 'Exit the demo and sign in with Google to add your photos',
		signInImport: 'Sign in with Google to add your photos',
		dropTitle: 'Drop the photos to place them on the globe',
		dropLead: 'We read the location of each one in this browser',
		showPanel: 'Show panel',
		noGlobe: "Your browser can't show the 3D globe",
		noGlobeText:
			'WebGL is not supported or is turned off. You can carry on with the flat map: your photos, trips, countries and statistics are still available.',
		flatMap: 'Use flat map',
		enableWebGL: 'How to turn on WebGL'
	},
	ca: {
		demoImport: 'Surt de la demo i entra amb Google per afegir les teves fotos',
		signInImport: 'Entra amb Google per afegir les teves fotos',
		dropTitle: 'Deixa anar les fotos per col·locar-les al globus',
		dropLead: 'Llegim la ubicació de cadascuna en aquest navegador',
		showPanel: 'Mostrar el panell',
		noGlobe: 'El teu navegador no pot mostrar el globus 3D',
		noGlobeText:
			'Falta suport per a WebGL o està desactivat. Pots continuar amb el mapa pla: les teves fotos, viatges, països i estadístiques continuen disponibles.',
		flatMap: 'Fer servir el mapa pla',
		enableWebGL: 'Com activar WebGL'
	}
});
