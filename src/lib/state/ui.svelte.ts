/** Small bits of UI state shared between the layout, the pages and the map */
class Ui {
	sidebarOpen = $state(true);
	searchOpen = $state(false);
	settingsOpen = $state(false);
	/** Flat map instead of the globe */
	flat = $state(false);
	/** False on browsers that can't draw the globe (the flat SVG map is shown instead) */
	webgl = $state(true);
	/** Window width, kept in state so layouts react when the window is resized */
	viewportWidth = $state(typeof window === 'undefined' ? 1440 : window.innerWidth);
	/** Phones: height of the bottom sheet (0 on bigger screens) */
	sheetHeight = $state(0);
	/** Phones: the timeline is hidden behind a button */
	timelineOpen = $state(false);
	/** Photo hovered in a list: its marker lights up on the map (and the other way round) */
	hoveredPhoto = $state<string | null>(null);

	/** Photo viewer: the list it navigates and the current position */
	viewer = $state<{ ids: string[]; index: number; context: string } | null>(null);

	/** Photos being dragged from "Sin ubicación" onto the globe */
	dragging = $state<string[] | null>(null);

	/** "Asignar ubicación": next click on the map places these photos */
	placing = $state<string[] | null>(null);
	/** Pages opened inside the app; 0 means the app was opened from a link */
	inAppNavigations = $state(0);

	openViewer(ids: string[], id: string, context = '') {
		// A photo that is not in the list is shown on its own instead of opening another one
		const index = ids.indexOf(id);
		this.viewer = index === -1 ? { ids: [id], index: 0, context } : { ids, index, context };
	}

	closeViewer() {
		this.viewer = null;
	}
}

export const ui = new Ui();
