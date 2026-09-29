// Keys of the Google Cloud project, from the .env file (see .env.example).
// Without a client id the app works as before: no account, photos only in this browser.
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
// The Drive picker also needs an API key and the project number
export const GOOGLE_API_KEY: string = import.meta.env.VITE_GOOGLE_API_KEY ?? '';
export const GOOGLE_APP_ID: string = import.meta.env.VITE_GOOGLE_APP_ID ?? '';

export const googleEnabled = GOOGLE_CLIENT_ID !== '';
export const drivePickerEnabled = googleEnabled && GOOGLE_API_KEY !== '' && GOOGLE_APP_ID !== '';
