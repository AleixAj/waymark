import { translator } from '../i18n.svelte';

// Texts of the city panel (photos in the visible part of the map)
export default translator({
	es: {
		inThisArea: 'Fotos en esta zona',
		areasOf: 'Zonas de {city}',
		wholeCity: 'Toda la ciudad',
		photosIn: 'Fotos en {area}',
		showing: 'Mostrando fotos en esta zona',
		empty: 'No hay fotos en esta zona',
		emptyText: 'Mueve el mapa o aleja el zoom para ver más.'
	},
	en: {
		inThisArea: 'Photos in this area',
		areasOf: 'Areas of {city}',
		wholeCity: 'Whole city',
		photosIn: 'Photos in {area}',
		showing: 'Showing photos in this area',
		empty: 'No photos in this area',
		emptyText: 'Move the map or zoom out to see more.'
	},
	ca: {
		inThisArea: 'Fotos en aquesta zona',
		areasOf: 'Zones de {city}',
		wholeCity: 'Tota la ciutat',
		photosIn: 'Fotos a {area}',
		showing: 'Mostrant fotos en aquesta zona',
		empty: 'No hi ha fotos en aquesta zona',
		emptyText: 'Mou el mapa o allunya el zoom per veure-hi més.'
	}
});
