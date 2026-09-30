import { GOOGLE_CLIENT_ID, googleEnabled } from './config';
import { loadScript } from './script';
import t from '$lib/i18n/messages/sync';

// Google Identity Services: the sign-in popup and the access tokens
const GIS_SRC = 'https://accounts.google.com/gsi/client';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
// drive.file only lets Waymark see the files it creates or the ones you pick
const SCOPES = `openid email profile ${DRIVE_SCOPE}`;
const STORAGE_KEY = 'waymark-google';
// Tokens last one hour; one that ends in less than this is not used
const MARGIN_MS = 60_000;

export interface Account {
	name: string;
	email: string;
	picture: string | null;
}

interface Saved {
	account: Account;
	token: string;
	expiresAt: number;
}

interface TokenResponse {
	access_token?: string;
	expires_in?: number;
	error?: string;
}

// The small part of the Google Identity Services API that we use
interface TokenClient {
	requestAccessToken(options?: { prompt?: string; login_hint?: string }): void;
}
interface OAuth2Api {
	initTokenClient(config: {
		client_id: string;
		scope: string;
		callback: (response: TokenResponse) => void;
		error_callback?: (error: { type: string }) => void;
	}): TokenClient;
	hasGrantedAllScopes(response: TokenResponse, ...scopes: string[]): boolean;
	revoke(token: string, done?: () => void): void;
}

function oauth2() {
	return (window as unknown as { google: { accounts: { oauth2: OAuth2Api } } }).google.accounts
		.oauth2;
}

export class AuthError extends Error {}

/**
 * The Google account. There is no server: the browser asks Google for a token
 * and uses it to talk to Drive directly. The token lasts one hour; getting a new
 * one opens a popup, which browsers only allow right after a click.
 */
class Auth {
	account = $state<Account | null>(null);
	private token = $state<string | null>(null);
	private expiresAt = $state(0);

	constructor() {
		if (typeof localStorage === 'undefined' || !googleEnabled) return;
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Saved | null;
			if (saved?.account) {
				this.account = saved.account;
				this.token = saved.token;
				this.expiresAt = saved.expiresAt;
			}
		} catch {
			// Nothing saved, or blocked storage
		}
	}

	get signedIn() {
		return this.account !== null;
	}

	/** A token that still works, without opening anything */
	get validToken() {
		return this.token && Date.now() < this.expiresAt - MARGIN_MS ? this.token : null;
	}

	/** Loads the Google script ahead, so the popup opens right when clicking */
	preload() {
		if (googleEnabled) loadScript(GIS_SRC).catch(() => {});
	}

	async signIn() {
		const token = await this.requestToken('consent');
		const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!response.ok) throw new AuthError(t('accountFailed'));
		const info = (await response.json()) as { name?: string; email?: string; picture?: string };
		this.account = {
			name: info.name ?? info.email ?? t('yourAccount'),
			email: info.email ?? '',
			picture: info.picture ?? null
		};
		this.save();
	}

	/**
	 * A token for Drive. With `interactive` it may open the Google popup
	 * (only from a click); without it, null when the saved one expired.
	 */
	async getToken(interactive: boolean): Promise<string | null> {
		if (this.validToken) return this.validToken;
		if (!interactive || !this.account) return null;
		return this.requestToken('');
	}

	/** Forgets the token after Drive said it no longer works */
	expire() {
		this.expiresAt = 0;
	}

	signOut() {
		const token = this.token;
		this.account = null;
		this.token = null;
		this.expiresAt = 0;
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// Blocked storage
		}
		// Tells Google to forget this token too
		if (token) {
			try {
				oauth2().revoke(token);
			} catch {
				// The Google script didn't load: the token ends by itself within the hour
			}
		}
	}

	private async requestToken(prompt: '' | 'consent'): Promise<string> {
		await loadScript(GIS_SRC);
		const api = oauth2();
		return new Promise((resolve, reject) => {
			const client = api.initTokenClient({
				client_id: GOOGLE_CLIENT_ID,
				scope: SCOPES,
				callback: (response) => {
					if (response.error || !response.access_token) {
						reject(new AuthError(t('noPermission')));
						return;
					}
					// The user can untick Drive in the permission screen
					if (!api.hasGrantedAllScopes(response, DRIVE_SCOPE)) {
						reject(new AuthError(t('drivePermission')));
						return;
					}
					this.token = response.access_token;
					this.expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000;
					this.save();
					resolve(response.access_token);
				},
				error_callback: (error) =>
					reject(new AuthError(error.type === 'popup_closed' ? t('popupClosed') : t('popupFailed')))
			});
			client.requestAccessToken({ prompt, login_hint: this.account?.email });
		});
	}

	private save() {
		if (!this.account || !this.token) return;
		try {
			const saved: Saved = { account: this.account, token: this.token, expiresAt: this.expiresAt };
			localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		} catch {
			// Blocked storage: the session lasts until the page is closed
		}
	}
}

export const auth = new Auth();
