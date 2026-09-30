import { translator } from '../i18n.svelte';

// Texts of the page with photos without location
export default translator({
	es: {
		title: 'Fotos sin ubicación',
		unknownCamera: 'Cámara desconocida',
		noAlbum: 'Sin álbum',
		placedIn: '{n} foto ubicada en {place}|{n} fotos ubicadas en {place}',
		placedOnMap: '{n} foto ubicada en el mapa|{n} fotos ubicadas en el mapa',
		dropIn: 'Soltar en {place}',
		dropHere: 'Soltar aquí',
		groupBy: 'Agrupar',
		byAlbum: 'Por álbum',
		byDate: 'Por fecha',
		byCamera: 'Por cámara',
		noteStart:
			'Estas fotos no guardan datos GPS, y tampoco hay fotos con GPS de la misma hora para estimarlo. Es normal en fotos de WhatsApp o de cámaras con la ubicación desactivada. Usa',
		noteEnd: 'en un álbum, o arrastra las fotos al globo.',
		selected: 'seleccionada|seleccionadas',
		deselect: 'Deseleccionar',
		assign: 'Asignar ubicación…',
		placeAll: 'Ubicar todas',
		selectPhoto: 'Seleccionar foto',
		allLocated: 'Todas tus fotos tienen ubicación',
		allLocatedText:
			'Cuando importes fotos sin GPS aparecerán aquí para que las coloques en el globo.',
		placing:
			'Busca dónde se hicieron la foto, o haz clic en el globo|Busca dónde se hicieron las {n} fotos, o haz clic en el globo',
		view: 'Ver'
	},
	en: {
		title: 'Photos without location',
		unknownCamera: 'Unknown camera',
		noAlbum: 'No album',
		placedIn: '{n} photo placed in {place}|{n} photos placed in {place}',
		placedOnMap: '{n} photo placed on the map|{n} photos placed on the map',
		dropIn: 'Drop in {place}',
		dropHere: 'Drop here',
		groupBy: 'Group',
		byAlbum: 'By album',
		byDate: 'By date',
		byCamera: 'By camera',
		noteStart:
			"These photos have no GPS data, and there are no photos with GPS from the same time to estimate it. It's common in WhatsApp photos or with cameras that have location turned off. Use",
		noteEnd: 'on an album, or drag the photos onto the globe.',
		selected: 'selected|selected',
		deselect: 'Deselect',
		assign: 'Set location…',
		placeAll: 'Place all',
		selectPhoto: 'Select photo',
		allLocated: 'All your photos have a location',
		allLocatedText:
			'When you import photos without GPS they will show up here so you can place them on the globe.',
		placing:
			'Search where the photo was taken, or click on the globe|Search where the {n} photos were taken, or click on the globe',
		view: 'View'
	},
	ca: {
		title: 'Fotos sense ubicació',
		unknownCamera: 'Càmera desconeguda',
		noAlbum: 'Sense àlbum',
		placedIn: '{n} foto ubicada a {place}|{n} fotos ubicades a {place}',
		placedOnMap: '{n} foto ubicada al mapa|{n} fotos ubicades al mapa',
		dropIn: 'Deixar a {place}',
		dropHere: 'Deixar aquí',
		groupBy: 'Agrupar',
		byAlbum: 'Per àlbum',
		byDate: 'Per data',
		byCamera: 'Per càmera',
		noteStart:
			'Aquestes fotos no tenen dades GPS, i tampoc hi ha fotos amb GPS de la mateixa hora per estimar-les. És normal en fotos de WhatsApp o de càmeres amb la ubicació desactivada. Fes servir',
		noteEnd: 'en un àlbum, o arrossega les fotos al globus.',
		selected: 'seleccionada|seleccionades',
		deselect: 'Desseleccionar',
		assign: 'Assignar ubicació…',
		placeAll: 'Ubica-les totes',
		selectPhoto: 'Seleccionar la foto',
		allLocated: 'Totes les teves fotos tenen ubicació',
		allLocatedText:
			'Quan importis fotos sense GPS apareixeran aquí perquè les puguis col·locar al globus.',
		placing:
			'Cerca on es va fer la foto, o fes clic al globus|Cerca on es van fer les {n} fotos, o fes clic al globus',
		view: 'Veure'
	}
});
