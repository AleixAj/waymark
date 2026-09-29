<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import '@fontsource/geist/400.css';
	import '@fontsource/geist/500.css';
	import '@fontsource/geist/600.css';
	import '@fontsource/geist-mono/400.css';
	import '@fontsource/geist-mono/500.css';
	import '@fontsource/geist-mono/600.css';
	import '@fontsource/instrument-serif/400-italic.css';
	import '$lib/styles/global.css';
	import favicon from '$lib/assets/favicon.svg';
	import GlobeMap from '$lib/map/GlobeMap.svelte';
	import PhotoMarkers from '$lib/map/PhotoMarkers.svelte';
	import RouteLayer from '$lib/map/RouteLayer.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import ImportPanel from '$lib/components/ImportPanel.svelte';
	import ImportErrors from '$lib/components/ImportErrors.svelte';
	import Viewer from '$lib/components/viewer/Viewer.svelte';
	import Search from '$lib/components/Search.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import { library } from '$lib/state/library.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { pickFiles } from '$lib/photos/pick';

	let { children } = $props();

	settings.init();

	const onStats = $derived(page.url.pathname.startsWith('/estadisticas'));
	const welcome = $derived(library.isEmpty);
	let fileDrag = $state(false);

	onMount(() => {
		library.load();
		countries.load();
	});

	function openCountry(iso3: string, lngLat: { lng: number; lat: number }) {
		if (welcome) return;
		// "Asignar ubicación" mode: the click places the photos instead
		if (ui.placing) {
			ui.placeAt?.(lngLat);
			return;
		}
		// Only at country level: when zoomed in you are exploring streets, not countries
		if (mapView.zoom < 5) goto(`/pais/${iso3}`);
	}

	function onKeydown(event: KeyboardEvent) {
		const mod = event.metaKey || event.ctrlKey;
		if (mod && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			ui.searchOpen = true;
		} else if (mod && event.key.toLowerCase() === 'o') {
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
		library.import(Array.from(event.dataTransfer?.files ?? []));
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Waymark</title>
</svelte:head>

<svelte:window
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
			<!-- Changing the quality setting rebuilds the map with the new pixel ratio -->
			{#key settings.quality}
				<GlobeMap spin={welcome} showVisited={!welcome} onCountryClick={openCountry}>
					{#if !welcome}
						<PhotoMarkers points={mapView.points ?? library.visible} labels={mapView.labels} />
						<RouteLayer />
					{/if}
				</GlobeMap>
			{/key}
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
