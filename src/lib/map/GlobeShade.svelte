<script lang="ts">
	import { onMount } from 'svelte';
	import { mapView } from './view.svelte';
	import { outlineRadius, sphereRadius } from './globe';
	import { ui } from '$lib/state/ui.svelte';
	import { settings } from '$lib/state/settings.svelte';

	// Draws the blue halo, the ocean highlight and the edge shading of the design
	// on top of the map canvas. Only MapLibre knows where the globe is, so we
	// follow it on every frame (see globe.ts for the size math).
	//
	// The layer must sit between the canvas and the photo markers, inside MapLibre's
	// own container, so it is created here with plain DOM instead of the template.
	const map = mapView.map!;
	const layer = document.createElement('div');
	layer.className = 'globe-shade';
	layer.innerHTML =
		'<div class="halo"></div><div class="light"></div><div class="shadow"></div><div class="rim"></div>';

	function update() {
		const center = map.project(map.getCenter());
		const sphere = sphereRadius(map.getZoom(), map.getCenter().lat);
		const radius = outlineRadius(sphere, map.getCanvas().clientHeight);
		layer.style.setProperty('--x', `${center.x}px`);
		layer.style.setProperty('--y', `${center.y}px`);
		layer.style.setProperty('--r', `${radius}px`);
	}

	onMount(() => {
		map.getCanvasContainer().insertBefore(layer, map.getCanvas().nextSibling);
		update();
		map.on('move', update);
		map.on('resize', update);
		return () => {
			map.off('move', update);
			map.off('resize', update);
			layer.remove();
		};
	});

	// Once the globe fills the screen the effect is not needed
	$effect(() => {
		layer.classList.toggle('hidden', ui.flat || mapView.zoom >= 5.5);
		layer.classList.toggle('saver', settings.quality === 'ahorro');
	});
</script>

<style>
	:global(.globe-shade) {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		transition: opacity 0.3s;
	}

	:global(.globe-shade.hidden) {
		opacity: 0;
	}

	:global(.globe-shade > div) {
		position: absolute;
		left: var(--x);
		top: var(--y);
		border-radius: 50%;
		transform: translate(-50%, -50%);
		width: calc(var(--r) * 2);
		height: calc(var(--r) * 2);
	}

	/* Glow around the planet: strong at the edge, gone at 1.16 × radius */
	:global(.globe-shade .halo) {
		width: calc(var(--r) * 2.32);
		height: calc(var(--r) * 2.32);
		background: radial-gradient(
			circle closest-side,
			transparent 0 calc(100% / 1.16 - 0.5px),
			var(--halo) calc(100% / 1.16),
			color-mix(in oklab, var(--halo) 22%, transparent)
				calc(100% / 1.16 + 100% * 0.3 * (1 - 1 / 1.16)),
			transparent 100%
		);
	}

	/* Brighter ocean towards the top left, like light hitting the globe */
	:global(.globe-shade .light) {
		background: radial-gradient(
			circle at 38% 32%,
			color-mix(in oklab, var(--ocean-hi) 35%, transparent),
			transparent 70%
		);
		mix-blend-mode: screen;
		opacity: 0.7;
	}

	/* Darker edges make it look round */
	:global(.globe-shade .shadow) {
		background: radial-gradient(circle at 44% 40%, transparent 55%, var(--shade) 100%);
	}

	:global(.globe-shade .rim) {
		box-shadow: inset 0 0 0 1px var(--rim);
	}

	/* Battery saver: no halo and no shading */
	:global(.globe-shade.saver .halo),
	:global(.globe-shade.saver .shadow) {
		display: none;
	}
</style>
