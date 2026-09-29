<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { afterNavigate, goto } from '$app/navigation';
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
	import favicon from '$lib/assets/favicon.svg';
	import GlobeMap from '$lib/map/GlobeMap.svelte';
	import PhotoMarkers from '$lib/map/PhotoMarkers.svelte';
	import RouteLayer from '$lib/map/RouteLayer.svelte';
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

	let { children } = $props();

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
	const welcome = $derived(library.isEmpty);
	let fileDrag = $state(false);

	onMount(() => {
		library.load();
		countries.load().catch(() => {
			// Offline on the very first visit: names show as codes until the next load
		});
	});

	// With no photos every page leads to the welcome screen (e.g. an old link to a trip)
	$effect(() => {
		if (library.isEmpty && page.url.pathname !== '/') goto('/', { replaceState: true });
	});

	// Pages visited inside the app, so "back" knows whether there is somewhere to go back to
	afterNavigate(({ type }) => {
		if (type !== 'enter') ui.inAppNavigations++;
		ui.searchOpen = false;
	});

	function openCountry(iso3: string, lngLat: { lng: number; lat: number }) {
		if (welcome) return;
		// "Asignar ubicación" mode: the "Sin ubicación" page places the photos instead
		if (ui.placing) return;
		void lngLat;
		// Only at country level: when zoomed in you are exploring streets, not countries
		if (mapView.zoom < 5) goto(`/pais/${iso3}`);
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
			pickFiles().then((files) => library.import(files));
		}
	}

	// Photos dropped from the computer anywhere in the window are imported.
	// Photos dragged inside the app (from "Sin ubicación") are handled by that page.
	function isFileDrag(event: DragEvent) {
		return !ui.dragging && !!event.dataTransfer?.types.includes('Files');
	}

	function onDrop(event: DragEvent) {
		if (!isFileDrag(event)) return;
		event.preventDefault();
		fileDrag = false;
		// Folders are opened too, so dropping a DCIM folder imports its photos
		if (event.dataTransfer) droppedFiles(event.dataTransfer).then((files) => library.import(files));
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
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
						{/if}
					</GlobeMap>
				{/key}
			{/if}
		</div>

		{#if !welcome}
			<TopBar />
		{/if}
		{@render children()}

		{#if library.progress}
			<ImportPanel />
		{:else if library.errors.length}
			<ImportErrors />
		{/if}
		{#if ui.viewer}<Viewer />{/if}
		{#if ui.searchOpen}<Search />{/if}
		{#if ui.settingsOpen}<Settings />{/if}
	{/if}

	{#if fileDrag}
		<div class="file-drop">
			<div class="col">
				<span class="t-h3">Suelta las fotos para colocarlas en el globo</span>
				<span class="t-small t2">Leemos la ubicación de cada una en este navegador</span>
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

	.globe {
		position: absolute;
		inset: 0;
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
