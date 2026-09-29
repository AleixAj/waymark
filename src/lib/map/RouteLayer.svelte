<script lang="ts">
	import { onMount } from 'svelte';
	import { Marker, type GeoJSONSource } from 'maplibre-gl';
	import type { Feature, LineString } from 'geojson';
	import type { Stop } from '$lib/library/trips';
	import { readMapColors } from './colors';
	import { mapView } from './view.svelte';

	const map = mapView.map!;
	const SOURCE = 'trip-route';

	/** Smooth curve through the stops (Catmull-Rom), like the route in the design */
	function curve(stops: Stop[], segments = 14): [number, number][] {
		const pts = stops.map((s) => [s.lng, s.lat] as [number, number]);
		if (pts.length < 3) return pts;
		const out: [number, number][] = [];
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[i - 1] ?? pts[i];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[i + 2] ?? p2;
			for (let t = 0; t < 1; t += 1 / segments) {
				const t2 = t * t;
				const t3 = t2 * t;
				const point = [0, 1].map(
					(k) =>
						0.5 *
						(2 * p1[k] +
							(-p0[k] + p2[k]) * t +
							(2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
							(-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
				) as [number, number];
				out.push(point);
			}
		}
		out.push(pts[pts.length - 1]);
		return out;
	}

	function line(stops: Stop[]): Feature<LineString> {
		return {
			type: 'Feature',
			properties: {},
			geometry: { type: 'LineString', coordinates: curve(stops) }
		};
	}

	let markers: Marker[] = [];

	function drawStops(stops: Stop[]) {
		for (const m of markers) m.remove();
		// Labels on the first, last and a few stops in between so they don't overlap
		const labelEvery = Math.max(1, Math.ceil(stops.length / 4));
		markers = stops.map((stop, i) => {
			const el = document.createElement('button');
			el.className = 'wm-stop';
			const showLabel = i === 0 || i === stops.length - 1 || i % labelEvery === 0;
			el.innerHTML = `<span class="stop">${stop.index}</span>${showLabel ? `<span class="mk-label">${stop.city}</span>` : ''}`;
			el.setAttribute('aria-label', `${stop.index}. ${stop.city}`);
			el.addEventListener('click', () => (mapView.activeStop = stop.index));
			return new Marker({ element: el, opacityWhenCovered: 0 })
				.setLngLat([stop.lng, stop.lat])
				.addTo(map);
		});
	}

	function ensureLayers() {
		if (map.getSource(SOURCE)) return;
		const colors = readMapColors();
		map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
		map.addLayer({
			id: 'route-glow',
			type: 'line',
			source: SOURCE,
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': colors.acc, 'line-opacity': 0.2, 'line-width': 9 }
		});
		map.addLayer({
			id: 'route-line',
			type: 'line',
			source: SOURCE,
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': colors.acc, 'line-width': 2.2 }
		});
	}

	$effect(() => {
		const stops = mapView.route;
		ensureLayers();
		const source = map.getSource<GeoJSONSource>(SOURCE);
		source?.setData(
			stops && stops.length > 1 ? line(stops) : { type: 'FeatureCollection', features: [] }
		);
		drawStops(stops ?? []);
	});

	// Highlight the active stop
	$effect(() => {
		const active = mapView.activeStop;
		markers.forEach((m, i) => {
			m.getElement()
				.querySelector('.stop')
				?.classList.toggle('is-on', active === i + 1);
			m.getElement().style.zIndex = active === i + 1 ? '2' : '1';
		});
	});

	onMount(() => () => {
		for (const m of markers) m.remove();
		if (map.getLayer('route-line')) map.removeLayer('route-line');
		if (map.getLayer('route-glow')) map.removeLayer('route-glow');
		if (map.getSource(SOURCE)) map.removeSource(SOURCE);
	});
</script>

<style>
	:global(.wm-stop) {
		padding: 0;
		background: none;
		border: 0;
		cursor: pointer;
	}

	:global(.wm-stop .mk-label) {
		position: absolute;
		left: 50%;
		top: 100%;
		margin-top: 6px;
		transform: translateX(-50%);
		font-size: 12px;
		font-weight: 500;
		color: var(--t1);
		white-space: nowrap;
		pointer-events: none;
		text-shadow:
			0 1px 3px var(--bg),
			0 0 8px var(--bg);
	}
</style>
