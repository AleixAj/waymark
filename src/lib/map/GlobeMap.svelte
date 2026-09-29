<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { MapLibreMap, setWorkerUrl } from 'maplibre-gl';
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { FeatureCollection } from 'geojson';
	import { settings } from '$lib/state/settings.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { library } from '$lib/state/library.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { readMapColors } from './colors';
	import { buildStyle, countryPaint, sky, vectorOpacity, visitedFilter } from './style';
	import { paletteColors } from './palette';
	import { mapView, zoomForGlobe } from './view.svelte';
	import GlobeShade from './GlobeShade.svelte';
	import { starfieldUrl } from './stars';

	interface Props {
		/** Slow spin on the welcome screen */
		spin?: boolean;
		/** Paint visited countries in amber */
		showVisited?: boolean;
		/** Click on a country (not on a photo marker) */
		onCountryClick?: (iso3: string, lngLat: { lng: number; lat: number }) => void;
		children?: Snippet;
	}

	let { spin = false, showVisited = true, onCountryClick, children }: Props = $props();

	// Stars behind the globe at night (dark theme); the flat map covers the whole screen
	const stars = $derived(
		settings.resolvedTheme === 'dark' && !ui.flat ? `url(${starfieldUrl()})` : 'none'
	);

	// Let Vite bundle MapLibre's worker (with its imports) and tell MapLibre where it is
	setWorkerUrl(workerUrl);

	let container: HTMLDivElement;
	let map = $state.raw<MapLibreMap>();
	/** True once the first style has loaded: children (markers, route) stay mounted after that */
	let loaded = $state(false);
	/** False while a new style is being applied; paint changes wait for it */
	let styleReady = $state(false);

	// Quality setting: fewer pixels to draw means smoother frames on slow machines
	const pixelRatio = {
		alta: devicePixelRatio,
		equilibrada: Math.min(devicePixelRatio, 1.5),
		ahorro: 1
	}[settings.quality];

	function currentStyle(countryData: FeatureCollection) {
		return buildStyle({
			colors: readMapColors(),
			countries: countryData,
			mapStyle: settings.mapStyle,
			borders: settings.borders,
			dark: settings.resolvedTheme === 'dark',
			palette: settings.palette,
			flat: ui.flat
		});
	}

	function markStyleReady() {
		styleReady = true;
		// Custom layers (the trip route) are added again after a new style
		mapView.styleVersion++;
	}

	onMount(() => {
		let instance: MapLibreMap | undefined;
		let cancelled = false;

		countries.load().then(() => {
			if (cancelled) return;
			// When the map is rebuilt (quality setting) the camera stays where it was
			const saved = mapView.savedCamera;
			instance = new MapLibreMap({
				container,
				style: currentStyle({ type: 'FeatureCollection', features: countries.mapFeatures }),
				center: saved?.center ?? (spin ? [-20, 18] : [-24, 36]),
				zoom: saved?.zoom ?? zoomForGlobe(spin ? 0.478 : 0.433, spin ? 18 : 36),
				minZoom: 1,
				maxPitch: 0,
				pixelRatio,
				attributionControl: { compact: true },
				fadeDuration: 0
			});
			instance.dragRotate.disable();
			instance.touchZoomRotate.disableRotation();
			instance.once('style.load', () => {
				loaded = true;
				markStyleReady();
			});
			instance.on('zoom', () => (mapView.zoom = instance!.getZoom()));
			instance.on('click', (event) => {
				if (!instance?.getLayer('country-fill')) return;
				const hit = instance.queryRenderedFeatures(event.point, { layers: ['country-fill'] })[0];
				const iso3 = hit?.properties?.iso3;
				if (iso3) onCountryClick?.(iso3, event.lngLat);
			});
			// If the graphics card resets, MapLibre drops the style until it recovers
			instance.on('webglcontextlost', () => (styleReady = false));
			instance.on('webglcontextrestored', () => instance?.once('idle', markStyleReady));
			map = instance;
			mapView.map = instance;
		});

		return () => {
			cancelled = true;
			if (instance) {
				const center = instance.getCenter();
				mapView.savedCamera = { center: [center.lng, center.lat], zoom: instance.getZoom() };
			}
			instance?.remove();
			// When the map is rebuilt, the new one may already be registered
			if (mapView.map === instance) mapView.map = null;
		};
	});

	// Theme, map style or borders changed: rebuild the style (sources are reused).
	// Each rebuild has a number: only the latest one may mark the style as ready.
	let firstStyle = true;
	let rebuild = 0;
	$effect(() => {
		// Read the settings here so the effect re-runs when they change
		const deps = [settings.resolvedTheme, settings.mapStyle, settings.borders];
		if (!map || !countries.mapFeatures.length || !deps) return;
		if (firstStyle) {
			firstStyle = false;
			return;
		}
		const current = ++rebuild;
		styleReady = false;
		// Wait one frame so the new CSS variables are applied before reading them
		const frame = requestAnimationFrame(() => {
			if (!map || current !== rebuild) return;
			untrack(() =>
				map!.setStyle(currentStyle({ type: 'FeatureCollection', features: countries.mapFeatures }))
			);
			// setStyle with diffing does not always fire style.load, idle always comes
			map.once('idle', () => {
				if (current === rebuild) markStyleReady();
			});
		});
		return () => cancelAnimationFrame(frame);
	});

	// Visited countries and the focused country
	$effect(() => {
		if (!map || !styleReady || !map.getLayer('country-fill')) return;
		const colors = readMapColors();
		const paint = countryPaint(
			colors,
			showVisited ? library.visited : [],
			mapView.focus,
			settings.palette
		);
		// Palette: the sea and the outline of the visited countries change too
		const palette = paletteColors(colors, settings.palette);
		map.setPaintProperty('ocean', 'background-color', palette.ocean);
		map.setPaintProperty('country-visited', 'line-color', palette.outline);
		map.setPaintProperty('country-fill', 'fill-color', paint.color);
		if (settings.mapStyle === 'sobrio') {
			map.setPaintProperty(
				'country-fill',
				'fill-opacity',
				mapView.focus ? paint.opacity : vectorOpacity('sobrio')
			);
		}
		map.setFilter('country-focus', ['==', ['get', 'iso3'], mapView.focus ?? '']);
		// In the country view only the focused country keeps its outline
		map.setFilter(
			'country-visited',
			visitedFilter(showVisited && !mapView.focus ? library.visited : [])
		);
		map.setSky(sky(colors));
	});

	// Panels opened or closed: keep the globe centered in the free space.
	// During a camera flight the change waits until the camera stops.
	let paddingSet = false;
	$effect(() => {
		// On phones the panels are bottom sheets: the globe stays above them
		const padding = mapView.cameraPadding;
		if (!map || spin) return;
		const apply = () => {
			const duration = paddingSet && !settings.reducedMotion ? 400 : 0;
			paddingSet = true;
			map!.easeTo({ padding, duration });
		};
		if (!map.isMoving()) {
			apply();
			return;
		}
		map.once('moveend', apply);
		return () => map?.off('moveend', apply);
	});

	// Globe or flat map
	$effect(() => {
		if (!map || !styleReady) return;
		map.setProjection({ type: ui.flat ? 'mercator' : 'globe' });
	});

	// Welcome screen: the planet turns slowly (skipped with reduced motion).
	// It pauses while the user drags or zooms, so it never fights their hands.
	$effect(() => {
		if (!map || !spin || settings.reducedMotion) return;
		const instance = map;
		let frame = 0;
		let last = performance.now();
		let paused = false;
		const pause = () => (paused = true);
		const resume = () => {
			paused = false;
			last = performance.now();
		};
		const turn = (now: number) => {
			// A tab in the background makes this gap huge: never jump more than 50 ms
			const dt = Math.min(now - last, 50);
			last = now;
			if (!paused) {
				const center = instance.getCenter();
				center.lng += (dt / 1000) * 4;
				instance.setCenter(center);
			}
			frame = requestAnimationFrame(turn);
		};
		instance.on('dragstart', pause);
		instance.on('zoomstart', pause);
		instance.on('dragend', resume);
		instance.on('zoomend', resume);
		frame = requestAnimationFrame(turn);
		return () => {
			cancelAnimationFrame(frame);
			instance.off('dragstart', pause);
			instance.off('zoomstart', pause);
			instance.off('dragend', resume);
			instance.off('zoomend', resume);
		};
	});
</script>

<div
	class="map"
	bind:this={container}
	style:background-image={stars}
	role="application"
	aria-label="Globo con tus fotos"
></div>
{#if map && loaded}
	<GlobeShade />
	{@render children?.()}
{/if}

<style>
	.map {
		position: absolute;
		inset: 0;
		background: var(--bg);
	}

	/* MapLibre controls restyled to match the app */
	.map :global(.maplibregl-ctrl-attrib) {
		background: transparent;
		color: var(--t3);
		font:
			400 10px/14px 'Geist Mono',
			monospace;
	}

	.map :global(.maplibregl-ctrl-attrib a) {
		color: var(--t2);
	}

	.map :global(.maplibregl-ctrl-bottom-right) {
		right: 0;
		bottom: 0;
	}
</style>
