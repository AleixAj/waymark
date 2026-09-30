<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { afterNavigate, goto, replaceState } from '$app/navigation';
	// Only the Latin alphabets: Spanish plus names like Kraków, Þingvellir or Höfn
	import '@fontsource/geist/latin-400.css';
	import '@fontsource/geist/latin-ext-400.css';
	import '@fontsource/geist/latin-500.css';
	import '@fontsource/geist/latin-ext-500.css';
	import '@fontsource/geist/latin-600.css';
	import '@fontsource/geist/latin-ext-600.css';
	import '@fontsource/geist-mono/latin-400.css';
	import '@fontsource/geist-mono/latin-ext-400.css';
	import '@fontsource/geist-mono/latin-500.css';
	import '@fontsource/geist-mono/latin-600.css';
	import '@fontsource/instrument-serif/latin-400-italic.css';
	import '$lib/styles/global.css';
	import GlobeMap from '$lib/map/GlobeMap.svelte';
	import PhotoMarkers from '$lib/map/PhotoMarkers.svelte';
	import RouteLayer from '$lib/map/RouteLayer.svelte';
	import AreaLayer from '$lib/map/AreaLayer.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import NoWebGL from '$lib/components/NoWebGL.svelte';
	import ImportPanel from '$lib/components/ImportPanel.svelte';
	import ImportErrors from '$lib/components/ImportErrors.svelte';
	import Viewer from '$lib/components/viewer/Viewer.svelte';
	import Search from '$lib/components/Search.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import { library } from '$lib/state/library.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { droppedFiles, pickFiles } from '$lib/photos/pick';
	import ImportChooser from '$lib/components/ImportChooser.svelte';
	import DemoLoading from '$lib/components/DemoLoading.svelte';
	import ZonePanel from '$lib/components/ZonePanel.svelte';
	import TakeoutAlbums from '$lib/components/TakeoutAlbums.svelte';
	import { canImport, importFiles } from '$lib/state/importing';
	import { auth } from '$lib/google/auth.svelte';
	import { sync } from '$lib/sync/sync.svelte';
	import { demoMode } from '$lib/state/mode';
	import t from '$lib/i18n/messages/layout';
	import tc from '$lib/i18n/messages/common';

	let { children } = $props();

	// The street map covers the countries from about this zoom (see map/style.ts)
	const COUNTRY_CLICK_MAX_ZOOM = 7;

	settings.init();

	const onStats = $derived(page.url.pathname.startsWith('/estadisticas'));

	// The globe needs WebGL; very old or locked-down browsers get a flat map instead
	const hasWebGL = (() => {
		try {
			const canvas = document.createElement('canvas');
			const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
			// Browsers allow only a few WebGL contexts: give this test one back
			gl?.getExtension('WEBGL_lose_context')?.loseContext();
			return !!gl;
		} catch {
			return false;
		}
	})();
	ui.webgl = hasWebGL;
	// In demo mode the globe shows up at once while the sample photos load.
	// Without the Google account the album stays closed: photos left in this browser
	// from an old session come back (and are synced) when you sign in again.
	const welcome = $derived((library.isEmpty || !canImport()) && !demoMode);
	let fileDrag = $state(false);

	// Changes go to Drive, and photos from other devices come back into the library
	library.onChange = () => sync.schedule();
	sync.onPulled = () => library.reload();

	onMount(() => {
		auth.preload();
		library.load().then(() => {
			// The first time in demo mode the sample library is created
			if (demoMode && library.isEmpty) library.loadDemo();
			else sync.run(false);
		});
		countries.load().catch(() => {
			// Offline on the very first visit: names show as codes until the next load
		});
	});

	// With no album every page leads to the welcome screen (e.g. an old link to a trip)
	$effect(() => {
		if (library.loaded && welcome && page.url.pathname !== '/') goto('/', { replaceState: true });
	});

	// Pages visited inside the app, so "back" knows whether there is somewhere to go back to
	afterNavigate(({ type }) => {
		// A /?demo link did its job: the address stays clean (the router is ready here)
		if (type === 'enter' && page.url.searchParams.has('demo')) {
			const url = new URL(page.url);
			url.searchParams.delete('demo');
			replaceState(url, page.state);
		}
		if (type !== 'enter') ui.inAppNavigations++;
		ui.searchOpen = false;
		// The zone panel belongs to the map view it was opened on
		ui.zone = null;
	});

	function openCountry(iso3: string, lngLat: { lng: number; lat: number }) {
		if (welcome) return;
		// "Asignar ubicación" mode: the "Sin ubicación" page places the photos instead
		if (ui.placing) return;
		void lngLat;
		// While the colored countries are on the map they can be opened (small ones like
		// Vietnam need a closer zoom). Once the street map takes over, you are exploring
		// streets and a click must not jump to the country page.
		if (mapView.zoom < COUNTRY_CLICK_MAX_ZOOM) goto(`/pais/${iso3}`);
	}

	function onKeydown(event: KeyboardEvent) {
		const mod = event.metaKey || event.ctrlKey;
		// Shortcuts don't open things on top of the Settings dialog
		if (!mod || ui.settingsOpen) return;
		if (event.key.toLowerCase() === 'k') {
			event.preventDefault();
			ui.searchOpen = true;
		} else if (event.key.toLowerCase() === 'o') {
			event.preventDefault();
			if (importAllowed()) pickFiles().then((files) => library.import(files));
		}
	}

	// Photos dropped from the computer anywhere in the window are imported.
	// Photos dragged inside the app (from "Sin ubicación") are handled by that page.
	function isFileDrag(event: DragEvent) {
		return !ui.dragging && !!event.dataTransfer?.types.includes('Files');
	}

	/** Your photos go in your own album: not in the demo, and only with Google */
	function importAllowed() {
		if (demoMode) ui.importNote = t('demoImport');
		else if (!canImport()) ui.importNote = t('signInImport');
		else return true;
		return false;
	}

	function onDrop(event: DragEvent) {
		if (!isFileDrag(event)) return;
		event.preventDefault();
		fileDrag = false;
		if (!importAllowed()) return;
		// Folders are opened too, so dropping a DCIM folder imports its photos
		// A Google Takeout export (zip files) opens the album chooser
		if (event.dataTransfer) droppedFiles(event.dataTransfer).then(importFiles);
	}
</script>

<svelte:head>
	<title>Waymark</title>
</svelte:head>

<svelte:window
	bind:innerWidth={ui.viewportWidth}
	onkeydown={onKeydown}
	ondragover={(e) => {
		if (!isFileDrag(e)) return;
		e.preventDefault();
		fileDrag = true;
	}}
	ondragleave={(e) => {
		if (!e.relatedTarget) fileDrag = false;
	}}
	ondrop={onDrop}
/>

<div class="app">
	{#if library.loaded}
		<!-- Keyboard and screen reader order: top bar, then the page panels, then the map -->
		{#if !welcome}
			<TopBar />
		{/if}
		{@render children()}
		{#if ui.zone && !welcome}<ZonePanel zone={ui.zone} />{/if}

		<div class="globe" class:hidden={onStats}>
			{#if !hasWebGL}
				<NoWebGL />
			{:else}
				<!-- Changing the quality setting rebuilds the map with the new pixel ratio -->
				{#key settings.quality}
					<GlobeMap spin={welcome} showVisited={!welcome} onCountryClick={openCountry}>
						{#if !welcome}
							<PhotoMarkers points={mapView.points ?? library.visible} labels={mapView.labels} />
							<RouteLayer />
							<AreaLayer />
						{/if}
					</GlobeMap>
				{/key}
			{/if}
		</div>

		{#if library.demoStatus}
			<DemoLoading status={library.demoStatus} />
		{:else if library.progress}
			<ImportPanel />
		{:else if library.errors.length}
			<ImportErrors />
		{/if}
		{#if ui.viewer}<Viewer />{/if}
		{#if ui.searchOpen}<Search />{/if}
		{#if ui.settingsOpen}<Settings />{/if}
		{#if ui.importOpen}<ImportChooser />{/if}
		{#if ui.takeout}<TakeoutAlbums albums={ui.takeout} />{/if}
		{#if ui.importNote}
			<div class="row note panel" role="status">
				<span class="t-small">{ui.importNote}</span>
				<button
					class="btn btn-ghost btn-icon btn-sm"
					aria-label={tc('close')}
					onclick={() => (ui.importNote = null)}>×</button
				>
			</div>
		{/if}
	{/if}

	{#if fileDrag && !demoMode && canImport()}
		<div class="file-drop">
			<div class="col">
				<span class="t-h3">{t('dropTitle')}</span>
				<span class="t-small t2">{t('dropLead')}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.app {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: var(--bg);
	}

	/* The map comes last in the page but is painted under every panel */
	.globe {
		position: absolute;
		inset: 0;
		z-index: -1;
	}

	.note {
		position: absolute;
		left: 50%;
		bottom: 24px;
		transform: translateX(-50%);
		z-index: 60;
		gap: 10px;
		padding: 8px 8px 8px 16px;
		max-width: calc(100% - 32px);
		background: var(--glass-strong);
	}

	.globe.hidden {
		visibility: hidden;
	}

	.file-drop {
		position: absolute;
		inset: 12px;
		z-index: 100;
		display: grid;
		place-items: center;
		text-align: center;
		border: 2px dashed var(--acc);
		border-radius: 16px;
		background: color-mix(in oklab, var(--bg) 60%, transparent);
		pointer-events: none;
	}

	.file-drop .col {
		gap: 4px;
	}
</style>
