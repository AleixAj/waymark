/** Small bits of UI state shared between the layout, the pages and the map */
class Ui {
	sidebarOpen = $state(true);
	searchOpen = $state(false);
	settingsOpen = $state(false);
	/** Flat map instead of the globe */
	flat = $state(false);
	/** Photo hovered in a list: its marker lights up on the map (and the other way round) */
	hoveredPhoto = $state<string | null>(null);

	/** Photo viewer: the list it navigates and the current position */
	viewer = $state<{ ids: string[]; index: number; context: string } | null>(null);

	/** Photos being dragged from "Sin ubicación" onto the globe */
	dragging = $state<string[] | null>(null);

	/** "Asignar ubicación": next click on the map places these photos */
	placing = $state<string[] | null>(null);
	/** Set by the "Sin ubicación" page: what to do with a click while placing */
	placeAt: ((lngLat: { lng: number; lat: number }) => void) | null = null;

	openViewer(ids: string[], id: string, context = '') {
		const index = Math.max(0, ids.indexOf(id));
		this.viewer = { ids, index, context };
	}

	closeViewer() {
		this.viewer = null;
	}
}

export const ui = new Ui();

if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __ui: ui });
