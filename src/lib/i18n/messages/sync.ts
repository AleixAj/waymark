import { translator } from '../i18n.svelte';

// Texts of the Google account, Drive sync and the Drive picker
export default translator({
	es: {
		connectFailed: 'No se pudo conectar con Google',
		driveFull: 'Tu Google Drive está lleno o no da permiso',
		syncFailed: 'No se pudo sincronizar con Google Drive',
		accountFailed: 'No se pudo leer tu cuenta de Google',
		yourAccount: 'Tu cuenta',
		noPermission: 'Google no ha dado permiso',
		drivePermission: 'Hace falta el permiso de Google Drive para sincronizar',
		popupClosed: 'Has cerrado la ventana de Google',
		popupFailed: 'No se pudo abrir la ventana de Google',
		driveStatus: 'Drive respondió {status}',
		myDrive: 'Mi unidad',
		shared: 'Compartido conmigo',
		starred: 'Destacados',
		sharedDrives: 'Unidades compartidas',
		pickerTitle: 'Elige las fotos que quieres ver en el globo'
	},
	en: {
		connectFailed: 'Could not connect to Google',
		driveFull: 'Your Google Drive is full or does not allow it',
		syncFailed: 'Could not sync with Google Drive',
		accountFailed: 'Could not read your Google account',
		yourAccount: 'Your account',
		noPermission: 'Google did not give permission',
		drivePermission: 'Google Drive permission is needed to sync',
		popupClosed: 'You closed the Google window',
		popupFailed: 'Could not open the Google window',
		driveStatus: 'Drive answered {status}',
		myDrive: 'My Drive',
		shared: 'Shared with me',
		starred: 'Starred',
		sharedDrives: 'Shared drives',
		pickerTitle: 'Choose the photos you want to see on the globe'
	},
	ca: {
		connectFailed: "No s'ha pogut connectar amb Google",
		driveFull: 'El teu Google Drive és ple o no dona permís',
		syncFailed: "No s'ha pogut sincronitzar amb Google Drive",
		accountFailed: "No s'ha pogut llegir el teu compte de Google",
		yourAccount: 'El teu compte',
		noPermission: 'Google no ha donat permís',
		drivePermission: 'Cal el permís de Google Drive per sincronitzar',
		popupClosed: 'Has tancat la finestra de Google',
		popupFailed: "No s'ha pogut obrir la finestra de Google",
		driveStatus: 'Drive ha respost {status}',
		myDrive: 'La meva unitat',
		shared: 'Compartit amb mi',
		starred: 'Destacats',
		sharedDrives: 'Unitats compartides',
		pickerTitle: 'Tria les fotos que vols veure al globus'
	}
});
