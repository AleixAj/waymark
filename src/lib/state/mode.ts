// Demo mode: the sample library lives in its own browser database, so it never
// mixes with the user's photos nor goes up to their Google Drive.
// It is kept for the tab (sessionStorage) and can be opened with a link: /?demo
const KEY = 'waymark-demo';

function detect() {
	if (typeof window === 'undefined') return false;
	try {
		if (new URL(location.href).searchParams.has('demo')) {
			sessionStorage.setItem(KEY, '1');
			return true;
		}
		return sessionStorage.getItem(KEY) === '1';
	} catch {
		return false;
	}
}

export const demoMode = detect();

/** Opens the sample library (the page reloads with the other database) */
export function enterDemo() {
	location.assign('/?demo');
}

/** Back to the user's own photos */
export function exitDemo() {
	try {
		sessionStorage.removeItem(KEY);
	} catch {
		// Blocked storage: nothing was saved either
	}
	location.assign('/');
}
