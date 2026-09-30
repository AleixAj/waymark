import { translator } from '../i18n.svelte';

// Texts of the world sidebar, the timeline and the breadcrumb
export default translator({
	es: {
		library: 'Biblioteca',
		yourWorld: 'Tu mundo',
		collapse: 'Plegar panel',
		trips: 'Viajes',
		detecting: 'Detectando viajes…',
		noTrips: 'Aún no hay viajes. Aparecen solos cuando tienes varias fotos seguidas lejos de casa.',
		countries: 'Países',
		sortCountries: 'Ordenar países',
		byPhotos: 'Fotos',
		byDate: 'Fecha',
		timeline: 'Línea de tiempo',
		seeAll: 'ver todo',
		rangeStart: 'Inicio del rango',
		rangeEnd: 'Fin del rango',
		month: '{month}: {n} foto|{month}: {n} fotos',
		path: 'Ruta'
	},
	en: {
		library: 'Library',
		yourWorld: 'Your world',
		collapse: 'Collapse panel',
		trips: 'Trips',
		detecting: 'Detecting trips…',
		noTrips:
			'No trips yet. They show up on their own when you have several photos in a row away from home.',
		countries: 'Countries',
		sortCountries: 'Sort countries',
		byPhotos: 'Photos',
		byDate: 'Date',
		timeline: 'Timeline',
		seeAll: 'see all',
		rangeStart: 'Range start',
		rangeEnd: 'Range end',
		month: '{month}: {n} photo|{month}: {n} photos',
		path: 'Breadcrumb'
	},
	ca: {
		library: 'Biblioteca',
		yourWorld: 'El teu món',
		collapse: 'Plegar el panell',
		trips: 'Viatges',
		detecting: 'Detectant viatges…',
		noTrips:
			'Encara no hi ha viatges. Apareixen sols quan tens diverses fotos seguides lluny de casa.',
		countries: 'Països',
		sortCountries: 'Ordenar els països',
		byPhotos: 'Fotos',
		byDate: 'Data',
		timeline: 'Línia de temps',
		seeAll: 'veure-ho tot',
		rangeStart: 'Inici del rang',
		rangeEnd: 'Fi del rang',
		month: '{month}: {n} foto|{month}: {n} fotos',
		path: 'Ruta'
	}
});
