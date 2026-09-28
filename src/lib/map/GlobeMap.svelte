<script lang="ts">
	import { onMount } from 'svelte';
	import {
		MapLibreMap,
		NavigationControl,
		type GeoJSONSource,
		setWorkerUrl,
		type MapLayerMouseEvent
	} from 'maplibre-gl';
	import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { INITIAL_VIEW, MAP_STYLE_URL, PHOTO_SOURCE, SKY } from './config';
	import { CLICKABLE_LAYERS, PHOTO_LAYERS } from './layers';
	import { toFeatureCollection } from '$lib/photos/geojson';
	import type { PhotoPoint } from '$lib/photos/types';

	interface Props {
		points: PhotoPoint[];
		onPhotoSelect?: (id: string) => void;
	}

	let { points, onPhotoSelect }: Props = $props();

	let container: HTMLDivElement;
	let map = $state<MapLibreMap>();
	let ready = $state(false);

	// Let Vite bundle MapLibre's worker (with its imports) and tell MapLibre where it is
	setWorkerUrl(workerUrl);

	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

	onMount(() => {
		const instance = new MapLibreMap({
			container,
			style: MAP_STYLE_URL,
			...INITIAL_VIEW,
			attributionControl: { compact: true },
			maxPitch: 60
		});
		instance.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

		instance.on('style.load', () => {
			instance.setProjection({ type: 'globe' });
			instance.setSky(SKY);
		});

		instance.on('load', () => {
			instance.addSource(PHOTO_SOURCE, {
				type: 'geojson',
				data: toFeatureCollection([]),
				// Clustering runs inside MapLibre's web worker
				cluster: true,
				clusterRadius: 48,
				clusterMaxZoom: 16
			});
			for (const layer of PHOTO_LAYERS) instance.addLayer(layer);

			instance.on('click', 'photo-clusters', zoomIntoCluster);
			instance.on('click', 'photo-single', (event: MapLayerMouseEvent) => {
				const id = event.features?.[0]?.properties?.id;
				if (id) onPhotoSelect?.(id);
			});
			for (const layer of CLICKABLE_LAYERS) {
				instance.on('mouseenter', layer, () => (instance.getCanvas().style.cursor = 'pointer'));
				instance.on('mouseleave', layer, () => (instance.getCanvas().style.cursor = ''));
			}
			ready = true;
		});

		map = instance;
		return () => instance.remove();
	});

	// Push new photos to the map whenever the list changes
	$effect(() => {
		if (!map || !ready) return;
		map.getSource<GeoJSONSource>(PHOTO_SOURCE)?.setData(toFeatureCollection(points));
	});

	async function zoomIntoCluster(event: MapLayerMouseEvent) {
		const feature = event.features?.[0];
		if (!map || !feature || feature.geometry.type !== 'Point') return;

		const source = map.getSource<GeoJSONSource>(PHOTO_SOURCE);
		const zoom = await source?.getClusterExpansionZoom(feature.properties.cluster_id);
		const center = feature.geometry.coordinates as [number, number];

		if (reducedMotion) map.jumpTo({ center, zoom });
		else map.flyTo({ center, zoom, duration: 1200 });
	}
</script>

<div class="map" bind:this={container} role="application" aria-label="Globo con tus fotos"></div>

<style>
	.map {
		position: absolute;
		inset: 0;
		background: var(--bg);
	}
</style>
