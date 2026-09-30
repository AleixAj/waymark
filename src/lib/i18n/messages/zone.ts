import { translator } from '../i18n.svelte';

// Texts of the panel of a zone picked on the map
export default translator({
	es: {
		label: 'Fotos de la zona seleccionada',
		zone: 'Zona seleccionada',
		cities: 'Ciudades de la zona',
		all: 'Todas',
		explore: 'Explorar {name} por zonas',
		hint: 'Pulsa un círculo más pequeño en el mapa para acercarte más.'
	},
	en: {
		label: 'Photos of the selected area',
		zone: 'Selected area',
		cities: 'Cities in the area',
		all: 'All',
		explore: 'Explore {name} by area',
		hint: 'Tap a smaller circle on the map to zoom in further.'
	},
	ca: {
		label: 'Fotos de la zona seleccionada',
		zone: 'Zona seleccionada',
		cities: 'Ciutats de la zona',
		all: 'Totes',
		explore: 'Explorar {name} per zones',
		hint: 'Prem un cercle més petit al mapa per apropar-te més.'
	}
});
