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
	//
	// Performance: the circles are drawn once at a fixed size and only moved and
	// scaled with `transform`. The graphics card does that without painting the
	// gradients again, so dragging the globe doesn't cost a repaint every frame.
	const map = mapView.map!;
	const BASE_RADIUS = 500;
	const layer = document.createElement('div');
	layer.className = 'globe-shade';
	const disc = document.createElement('div');
	disc.className = 'disc';
	disc.innerHTML =
		'<div class="halo"></div><div class="light"></div><div class="shadow"></div><div class="rim"></div>';
	layer.append(disc);

	// Reading the canvas size forces the browser to measure the page: done on resize only
	let canvasHeight = 0;

	function update() {
		const center = map.project(map.getCenter());
		const sphere = sphereRadius(map.getZoom(), map.getCenter().lat);
		const radius = outlineRadius(sphere, canvasHeight);
		disc.style.transform = `translate3d(${center.x}px, ${center.y}px, 0) scale(${radius / BASE_RADIUS})`;
	}

	function resize() {
		canvasHeight = map.getCanvas().clientHeight;
		update();
	}

	onMount(() => {
		map.getCanvasContainer().insertBefore(layer, map.getCanvas().nextSibling);
		resize();
		map.on('move', update);
		map.on('resize', resize);
		return () => {
			map.off('move', update);
			map.off('resize', resize);
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
		visibility: hidden;
		transition:
			opacity 0.3s,
			visibility 0s 0.3s;
	}

	/* A 1000 px globe at the top left corner, moved and scaled into place */
	:global(.globe-shade .disc) {
		position: absolute;
		left: 0;
		top: 0;
		width: 0;
		height: 0;
		will-change: transform;
	}

	:global(.globe-shade .disc > div) {
		position: absolute;
		left: -500px;
		top: -500px;
		width: 1000px;
		height: 1000px;
		border-radius: 50%;
	}

	/* Glow around the planet: strong at the edge, gone at 1.16 × radius */
	:global(.globe-shade .disc > .halo) {
		left: -580px;
		top: -580px;
		width: 1160px;
		height: 1160px;
		background: radial-gradient(
			circle closest-side,
			transparent 0 calc(100% / 1.16 - 0.5px),
			var(--halo) calc(100% / 1.16),
			color-mix(in oklab, var(--halo) 22%, transparent)
				calc(100% / 1.16 + 100% * 0.3 * (1 - 1 / 1.16)),
			transparent 100%
		);
	}

	/* Brighter ocean towards the top left, like light hitting the globe.
	   Plain transparency instead of a blend mode: blending with the map canvas
	   would be recomputed on every frame. */
	:global(.globe-shade .light) {
		background: radial-gradient(
			circle at 38% 32%,
			color-mix(in oklab, var(--ocean-hi) 22%, transparent),
			transparent 70%
		);
	}

	/* Darker edges make it look round */
	:global(.globe-shade .shadow) {
		background: radial-gradient(circle at 44% 40%, transparent 55%, var(--shade) 100%);
	}

	:global(.globe-shade .rim) {
		box-shadow: inset 0 0 0 1.5px var(--rim);
	}

	/* Battery saver: no halo and no shading */
	:global(.globe-shade.saver .halo),
	:global(.globe-shade.saver .shadow) {
		display: none;
	}
</style>
