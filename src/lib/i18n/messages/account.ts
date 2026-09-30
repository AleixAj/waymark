import { translator } from '../i18n.svelte';

// Texts of the account button and its menu
export default translator({
	es: {
		signOutFailed: 'No se pudo cerrar la sesión',
		syncingCount: 'Sincronizando {done} de {total}…',
		syncing: 'Sincronizando…',
		expired: 'La sesión ha caducado: pulsa Sincronizar',
		syncFailed: 'No se pudo sincronizar',
		synced: 'Sincronizado {when}',
		neverSynced: 'Sin sincronizar todavía',
		justNow: 'ahora mismo',
		minutesAgo: 'hace {n} min',
		hoursAgo: 'hace {n} h',
		failed: 'Algo ha fallado',
		signIn: 'Entrar con Google',
		signInShort: 'Entrar',
		yourAccount: 'Tu cuenta: {name}',
		syncNow: 'Sincronizar ahora',
		pending:
			'{n} foto aún no está en tu Drive. Si sales ahora, se borrarán de este navegador.|{n} fotos aún no están en tu Drive. Si sales ahora, se borrarán de este navegador.',
		leaveAnyway: 'Salir igualmente',
		saving: 'Guardando en Drive…',
		signOut: 'Cerrar sesión',
		savedNote: 'Tu álbum queda guardado en tu Google Drive.'
	},
	en: {
		signOutFailed: 'Could not sign out',
		syncingCount: 'Syncing {done} of {total}…',
		syncing: 'Syncing…',
		expired: 'Your session has expired: press Sync',
		syncFailed: 'Could not sync',
		synced: 'Synced {when}',
		neverSynced: 'Not synced yet',
		justNow: 'just now',
		minutesAgo: '{n} min ago',
		hoursAgo: '{n} h ago',
		failed: 'Something went wrong',
		signIn: 'Sign in with Google',
		signInShort: 'Sign in',
		yourAccount: 'Your account: {name}',
		syncNow: 'Sync now',
		pending:
			'{n} photo is not in your Drive yet. If you sign out now, it will be deleted from this browser.|{n} photos are not in your Drive yet. If you sign out now, they will be deleted from this browser.',
		leaveAnyway: 'Sign out anyway',
		saving: 'Saving to Drive…',
		signOut: 'Sign out',
		savedNote: 'Your album stays saved in your Google Drive.'
	},
	ca: {
		signOutFailed: "No s'ha pogut tancar la sessió",
		syncingCount: 'Sincronitzant {done} de {total}…',
		syncing: 'Sincronitzant…',
		expired: 'La sessió ha caducat: prem Sincronitzar',
		syncFailed: "No s'ha pogut sincronitzar",
		synced: 'Sincronitzat {when}',
		neverSynced: 'Encara sense sincronitzar',
		justNow: 'ara mateix',
		minutesAgo: 'fa {n} min',
		hoursAgo: 'fa {n} h',
		failed: 'Alguna cosa ha fallat',
		signIn: 'Inicia la sessió amb Google',
		signInShort: 'Entrar',
		yourAccount: 'El teu compte: {name}',
		syncNow: 'Sincronitzar ara',
		pending:
			"{n} foto encara no és al teu Drive. Si surts ara, s'esborrarà d'aquest navegador.|{n} fotos encara no són al teu Drive. Si surts ara, s'esborraran d'aquest navegador.",
		leaveAnyway: 'Sortir igualment',
		saving: 'Desant a Drive…',
		signOut: 'Tancar la sessió',
		savedNote: 'El teu àlbum queda desat al teu Google Drive.'
	}
});
