import { translator } from '../i18n.svelte';

// Texts of the trip panel and automatic trip names
export default translator({
	es: {
		trip: 'Viaje',
		trips: 'Viajes',
		// Automatic names: "Oviedo, julio 2026" and "Italia y Francia"
		atHome: '{place}, {date}',
		twoCountries: '{a} y {b}',
		noName: 'Sin nombre',
		nameLabel: 'Nombre del viaje (editable)',
		stops: 'etapa|etapas',
		pause: 'Pausar',
		play: 'Reproducir viaje',
		exportGpx: 'Exportar la ruta (GPX)',
		allPhotos: 'Ver todas las fotos',
		showStop: 'Ver la etapa {n} en el mapa',
		missing: 'Este viaje ya no existe',
		missingText: 'Puede que hayas borrado sus fotos o cambiado sus fechas.',
		backToGlobe: 'Volver al globo'
	},
	en: {
		trip: 'Trip',
		trips: 'Trips',
		atHome: '{place}, {date}',
		twoCountries: '{a} and {b}',
		noName: 'Unnamed',
		nameLabel: 'Trip name (editable)',
		stops: 'stop|stops',
		pause: 'Pause',
		play: 'Play trip',
		exportGpx: 'Export the route (GPX)',
		allPhotos: 'See all photos',
		showStop: 'Show stop {n} on the map',
		missing: 'This trip no longer exists',
		missingText: 'You may have deleted its photos or changed their dates.',
		backToGlobe: 'Back to the globe'
	},
	ca: {
		trip: 'Viatge',
		trips: 'Viatges',
		atHome: '{place}, {date}',
		twoCountries: '{a} i {b}',
		noName: 'Sense nom',
		nameLabel: 'Nom del viatge (editable)',
		stops: 'etapa|etapes',
		pause: 'Pausar',
		play: 'Reproduir el viatge',
		exportGpx: 'Exportar la ruta (GPX)',
		allPhotos: 'Veure totes les fotos',
		showStop: "Veure l'etapa {n} al mapa",
		missing: 'Aquest viatge ja no existeix',
		missingText: 'Potser has esborrat les seves fotos o canviat les seves dates.',
		backToGlobe: 'Tornar al globus'
	}
});
