import { translator } from '../i18n.svelte';

// Texts of the country panel
export default translator({
	es: {
		country: 'País',
		visits: '{n} visita|{n} visitas',
		all: 'Todas',
		explore: 'Explorar {city} en el mapa',
		noVisits: '0 fotos · sin visitas',
		notFound: 'No encontramos este país',
		noPhotos: 'Aún no tienes fotos en {country}',
		noGps: 'Si hiciste fotos allí y no tienen GPS, puedes ubicarlas desde Sin ubicación.',
		review: 'Revisar fotos sin ubicación'
	},
	en: {
		country: 'Country',
		visits: '{n} visit|{n} visits',
		all: 'All',
		explore: 'Explore {city} on the map',
		noVisits: '0 photos · no visits',
		notFound: "We couldn't find this country",
		noPhotos: "You don't have photos in {country} yet",
		noGps: 'If you took photos there without GPS, you can place them from No location.',
		review: 'Review photos without location'
	},
	ca: {
		country: 'País',
		visits: '{n} visita|{n} visites',
		all: 'Totes',
		explore: 'Explorar {city} al mapa',
		noVisits: '0 fotos · sense visites',
		notFound: 'No trobem aquest país',
		noPhotos: 'Encara no tens fotos a {country}',
		noGps: 'Si hi vas fer fotos i no tenen GPS, pots ubicar-les des de Sense ubicació.',
		review: 'Revisar les fotos sense ubicació'
	}
});
