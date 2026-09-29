<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { MapLibreMap, setWorkerUrl } from 'maplibre-gl';
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { FeatureCollection } from 'geojson';
	import { settings } from '$lib/state/settings.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { library } from '$lib/state/library.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { readMapColors } from './colors';
	import { buildStyle, countryPaint, sky } from './style';
	import { mapView, zoomForGlobe } from './view.svelte';
	import GlobeShade from './GlobeShade.svelte';

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

	// Let Vite bundle MapLibre's worker (with its imports) and tell MapLibre where it is
	setWorkerUrl(workerUrl);

	let container: HTMLDivElement;
	let map = $state.raw<MapLibreMap>();
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
			dark: settings.resolvedTheme === 'dark'
		});
	}

	onMount(() => {
		let instance: MapLibreMap | undefined;
		let cancelled = false;

		countries.load().then(() => {
			if (cancelled) return;
			instance = new MapLibreMap({
				container,
				style: currentStyle({ type: 'FeatureCollection', features: countries.mapFeatures }),
				center: spin ? [-20, 18] : [-24, 36],
				zoom: zoomForGlobe(spin ? 0.478 : 0.433, spin ? 18 : 36),
				minZoom: 1,
				maxPitch: 0,
				pixelRatio,
				attributionControl: { compact: true },
				fadeDuration: 0
			});
			instance.dragRotate.disable();
			instance.touchZoomRotate.disableRotation();
			instance.on('style.load', () => (styleReady = true));
			instance.on('zoom', () => (mapView.zoom = instance!.getZoom()));
			instance.on('click', (event) => {
				const hit = instance!.queryRenderedFeatures(event.point, { layers: ['country-fill'] })[0];
				const iso3 = hit?.properties?.iso3;
				if (iso3) onCountryClick?.(iso3, event.lngLat);
			});
			map = instance;
			mapView.map = instance;
			if (import.meta.env.DEV) Object.assign(window, { __map: instance });
		});

		return () => {
			cancelled = true;
			instance?.remove();
			mapView.map = null;
		};
	});

	// Theme, map style or borders changed: rebuild the style (sources are reused)
	let firstStyle = true;
	$effect(() => {
		// Read the settings here so the effect re-runs when they change
		const deps = [settings.resolvedTheme, settings.mapStyle, settings.borders];
		if (!map || !countries.mapFeatures.length || !deps) return;
		if (firstStyle) {
			firstStyle = false;
			return;
		}
		styleReady = false;
		// Wait one frame so the new CSS variables are applied before reading them
		requestAnimationFrame(() => {
			map?.setStyle(currentStyle({ type: 'FeatureCollection', features: countries.mapFeatures }));
			// setStyle with diffing does not always fire style.load, idle always comes
			map?.once('idle', () => (styleReady = true));
		});
	});

	// Visited countries and the focused country
	$effect(() => {
		if (!map || !styleReady) return;
		const colors = readMapColors();
		const paint = countryPaint(colors, showVisited ? library.visited : [], mapView.focus);
		map.setPaintProperty('country-fill', 'fill-color', paint.color);
		if (settings.mapStyle === 'sobrio') {
			map.setPaintProperty(
				'country-fill',
				'fill-opacity',
				mapView.focus ? paint.opacity : ['interpolate', ['linear'], ['zoom'], 5.5, 1, 7.5, 0]
			);
		}
		map.setFilter('country-focus', ['==', ['get', 'iso3'], mapView.focus ?? '']);
		map.setSky(sky(colors));
	});

	// Panels opened or closed: keep the globe centered in the free space
	let paddingSet = false;
	$effect(() => {
		const padding = mapView.padding;
		if (!map || spin) return;
		// The first time it jumps, later changes (sidebar toggled) glide
		const duration = paddingSet && !settings.reducedMotion ? 400 : 0;
		paddingSet = true;
		map.easeTo({ padding, duration });
	});

	// Globe or flat map
	$effect(() => {
		if (!map || !styleReady) return;
		map.setProjection({ type: ui.flat ? 'mercator' : 'globe' });
	});

	// Welcome screen: the planet turns slowly (skipped with reduced motion)
	$effect(() => {
		if (!map || !spin || settings.reducedMotion) return;
		let frame = 0;
		let last = performance.now();
		const turn = (now: number) => {
			const center = map!.getCenter();
			center.lng += ((now - last) / 1000) * 4;
			last = now;
			map!.setCenter(center);
			frame = requestAnimationFrame(turn);
		};
		frame = requestAnimationFrame(turn);
		return () => cancelAnimationFrame(frame);
	});
</script>

<div class="map" bind:this={container} role="application" aria-label="Globo con tus fotos"></div>
{#if map && styleReady}
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
