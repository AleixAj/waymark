import { translator } from '../i18n.svelte';

// Texts of the search palette and the place search box
export default translator({
	es: {
		placeholder: 'Buscar país, ciudad o viaje…',
		coords: 'Coordenadas',
		goHere: 'Ir a este punto',
		trips: 'Viajes',
		countries: 'Países',
		cities: 'Ciudades',
		noPhotos: 'Sin fotos',
		move: 'moverse',
		open: 'abrir',
		noMatch: 'Ningún lugar coincide con «{query}»',
		noMatchHint: 'Busca por país, ciudad o nombre de viaje. También puedes pegar unas coordenadas.',
		allCountries: 'Ver todos los países',
		clear: 'Borrar búsqueda',
		placePlaceholder: 'Busca un lugar: Grandvalira, Lisboa…',
		placeLabel: 'Buscar un lugar',
		found: 'Lugares encontrados',
		credit: 'Búsqueda de © OpenStreetMap'
	},
	en: {
		placeholder: 'Search country, city or trip…',
		coords: 'Coordinates',
		goHere: 'Go to this point',
		trips: 'Trips',
		countries: 'Countries',
		cities: 'Cities',
		noPhotos: 'No photos',
		move: 'move',
		open: 'open',
		noMatch: 'No place matches “{query}”',
		noMatchHint: 'Search by country, city or trip name. You can also paste coordinates.',
		allCountries: 'See all countries',
		clear: 'Clear search',
		placePlaceholder: 'Search a place: Grandvalira, Lisbon…',
		placeLabel: 'Search a place',
		found: 'Places found',
		credit: 'Search by © OpenStreetMap'
	},
	ca: {
		placeholder: 'Cercar país, ciutat o viatge…',
		coords: 'Coordenades',
		goHere: 'Anar a aquest punt',
		trips: 'Viatges',
		countries: 'Països',
		cities: 'Ciutats',
		noPhotos: 'Sense fotos',
		move: 'moure',
		open: 'obrir',
		noMatch: 'Cap lloc coincideix amb «{query}»',
		noMatchHint: 'Cerca per país, ciutat o nom de viatge. També pots enganxar unes coordenades.',
		allCountries: 'Veure tots els països',
		clear: 'Esborrar la cerca',
		placePlaceholder: 'Cerca un lloc: Grandvalira, Lisboa…',
		placeLabel: 'Cercar un lloc',
		found: 'Llocs trobats',
		credit: 'Cerca de © OpenStreetMap'
	}
});
