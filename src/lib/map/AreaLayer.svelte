<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Marker, type GeoJSONSource } from 'maplibre-gl';
	import type { FeatureCollection, Polygon } from 'geojson';
	import { circle, type Area } from '$lib/library/areas';
	import { formatNumber } from '$lib/library/format';
	import { readMapColors } from './colors';
	import { mapView } from './view.svelte';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import t from '$lib/i18n/messages/map';

	const map = mapView.map!;
	const SOURCE = 'city-areas';

	function shapes(areas: Area[], active: string | null): FeatureCollection<Polygon> {
		return {
			type: 'FeatureCollection',
			features: areas.map((area) => ({
				type: 'Feature',
				properties: {
					active: area.name === active ? 1 : 0,
					dimmed: active && area.name !== active ? 1 : 0
				},
				geometry: { type: 'Polygon', coordinates: [circle(area.lat, area.lng, area.radiusKm)] }
			}))
		};
	}

	function ensureLayers() {
		if (map.getSource(SOURCE)) return;
		const colors = readMapColors();
		map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
		map.addLayer({
			id: 'area-fill',
			type: 'fill',
			source: SOURCE,
			paint: {
				'fill-color': colors.acc,
				'fill-opacity': [
					'case',
					['==', ['get', 'active'], 1],
					0.12,
					['==', ['get', 'dimmed'], 1],
					0.03,
					0.07
				]
			}
		});
		map.addLayer({
			id: 'area-line',
			type: 'line',
			source: SOURCE,
			paint: {
				'line-color': colors.acc,
				'line-width': ['case', ['==', ['get', 'active'], 1], 2, 1.2],
				'line-opacity': ['case', ['==', ['get', 'dimmed'], 1], 0.25, 0.7],
				'line-dasharray': [3, 2]
			}
		});
	}

	let labels: Marker[] = [];

	/** Name of each area above its circle; clicking it selects the area */
	function drawLabels(areas: Area[]) {
		for (const m of labels) m.remove();
		labels = areas.map((area) => {
			const el = document.createElement('button');
			el.className = 'wm-area';
			// textContent, never innerHTML: place names are data, not markup
			const name = document.createElement('span');
			name.textContent = area.name;
			const count = document.createElement('span');
			count.className = 'n';
			count.textContent = formatNumber(area.photoIds.length);
			el.append(name, count);
			el.setAttribute('aria-label', t('marker', { place: area.name, n: area.photoIds.length }));
			el.addEventListener('click', (event) => {
				event.stopPropagation();
				mapView.activeArea = mapView.activeArea === area.name ? null : area.name;
			});
			// Top edge of the circle, so the label never covers the photos
			const top = area.lat + area.radiusKm / 111.32;
			return new Marker({ element: el, anchor: 'bottom', opacityWhenCovered: 0 })
				.setLngLat([area.lng, top])
				.addTo(map);
		});
		highlight(mapView.activeArea);
	}

	function highlight(active: string | null) {
		const areas = mapView.areas ?? [];
		labels.forEach((m, i) => {
			const el = m.getElement();
			el.classList.toggle('is-on', areas[i]?.name === active);
			el.classList.toggle('is-dim', !!active && areas[i]?.name !== active);
		});
	}

	// Circles: drawn again when the areas, the selection or the map style change
	$effect(() => {
		const areas = mapView.areas ?? [];
		const active = mapView.activeArea;
		void mapView.styleVersion;
		untrack(() => {
			ensureLayers();
			map.getSource<GeoJSONSource>(SOURCE)?.setData(shapes(areas, active));
		});
	});

	$effect(() => {
		const areas = mapView.areas ?? [];
		// Also on a language change, for the labels read by screen readers
		void i18n.locale;
		untrack(() => drawLabels(areas));
	});

	$effect(() => {
		highlight(mapView.activeArea);
	});

	onMount(() => () => {
		for (const m of labels) m.remove();
		if (map.getLayer('area-line')) map.removeLayer('area-line');
		if (map.getLayer('area-fill')) map.removeLayer('area-fill');
		if (map.getSource(SOURCE)) map.removeSource(SOURCE);
	});
</script>

<style>
	:global(.wm-area) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
		padding: 3px 9px;
		border-radius: 999px;
		border: 1px solid var(--line-strong);
		background: var(--glass-strong);
		color: var(--t1);
		font-family: 'Geist', system-ui, sans-serif;
		font-size: 12px;
		font-weight: 500;
		line-height: 16px;
		white-space: nowrap;
		cursor: pointer;
		transition:
			opacity 0.15s,
			border-color 0.15s;
	}

	:global(.wm-area .n) {
		color: var(--t3);
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
	}

	:global(.wm-area:hover),
	:global(.wm-area.is-on) {
		border-color: var(--acc);
	}

	:global(.wm-area.is-on .n) {
		color: var(--acc-text);
	}

	:global(.wm-area.is-dim) {
		opacity: 0.55;
	}
</style>
