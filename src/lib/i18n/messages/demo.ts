import { translator } from '../i18n.svelte';

// Texts of the demo loading card
export default translator({
	es: {
		placing: 'Colocando las fotos en el globo…',
		downloading: 'Descargando fotos · {loaded} de {total} MB',
		preparing: 'Preparando la descarga…',
		title: 'Preparando la demo',
		lead: 'Unas 600 fotos reales de 15 viajes por 18 países, como el álbum de una persona.',
		progress: 'Progreso de la demo',
		credits: 'Fotos de Wikimedia Commons con licencia libre.',
		offline: 'Hace falta conexión a internet para descargar las fotos de ejemplo'
	},
	en: {
		placing: 'Placing the photos on the globe…',
		downloading: 'Downloading photos · {loaded} of {total} MB',
		preparing: 'Getting the download ready…',
		title: 'Getting the demo ready',
		lead: "About 600 real photos from 15 trips across 18 countries, like one person's album.",
		progress: 'Demo progress',
		credits: 'Photos from Wikimedia Commons with a free licence.',
		offline: 'An internet connection is needed to download the sample photos'
	},
	ca: {
		placing: 'Col·locant les fotos al globus…',
		downloading: 'Descarregant fotos · {loaded} de {total} MB',
		preparing: 'Preparant la descàrrega…',
		title: 'Preparant la demo',
		lead: "Unes 600 fotos reals de 15 viatges per 18 països, com l'àlbum d'una persona.",
		progress: 'Progrés de la demo',
		credits: 'Fotos de Wikimedia Commons amb llicència lliure.',
		offline: "Cal connexió a internet per descarregar les fotos d'exemple"
	}
});
