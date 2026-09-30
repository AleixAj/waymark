import { SvelteSet } from 'svelte/reactivity';
import type { TakeoutAlbum } from '$lib/photos/takeout';

/** Small bits of UI state shared between the layout, the pages and the map */
class Ui {
	sidebarOpen = $state(true);
	searchOpen = $state(false);
	settingsOpen = $state(false);
	/** "Importar" window with the three ways to add photos */
	importOpen = $state(false);
	/** Opened from the "Google Fotos" button: only the Takeout steps */
	importOnly = $state<'takeout' | null>(null);
	/** Albums of a Google Takeout export, waiting for the user to choose */
	takeout = $state.raw<TakeoutAlbum[] | null>(null);
	/** Reading a Takeout export, or a short message about the last import */
	importNote = $state<string | null>(null);
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
	// Photo hovered in a list: its marker lights up on the map (and the other way round).
	// Kept in a set so a tile asks "is it me?" and only the two tiles that change update,
	// not every tile of a list of hundreds on each mouse move.
	private hovered = new SvelteSet<string>();

	get hoveredPhoto(): string | null {
		for (const id of this.hovered) return id;
		return null;
	}

	set hoveredPhoto(id: string | null) {
		if (id !== null && this.hovered.has(id)) return;
		this.hovered.clear();
		if (id !== null) this.hovered.add(id);
	}

	isHovered(id: string) {
		return this.hovered.has(id);
	}

	/** Photo viewer: the list it navigates and the current position */
	viewer = $state<{ ids: string[]; index: number; context: string } | null>(null);

	/** Photos being dragged from "Sin ubicación" onto the globe */
	dragging = $state<string[] | null>(null);

	/** Photo lists of a place: grouped by city (or neighbourhood) or by day */
	photoOrder = $state<'place' | 'date'>('place');
	/** Photos of the circle clicked on the map, listed in the zone panel */
	zone = $state.raw<{ ids: string[]; title: string } | null>(null);

	/** "Asignar ubicación": next click on the map places these photos */
	placing = $state<string[] | null>(null);
	/** Pages opened inside the app; 0 means the app was opened from a link */
	inAppNavigations = $state(0);

	openImport(only: 'takeout' | null = null) {
		this.importOnly = only;
		this.importOpen = true;
	}

	closeImport() {
		this.importOpen = false;
		this.importOnly = null;
	}

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
