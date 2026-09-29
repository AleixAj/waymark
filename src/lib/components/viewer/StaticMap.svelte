<script lang="ts">
	// Small map made of 3x3 raster tiles around a point. Much lighter than a second
	// WebGL map, and enough to show where a photo was taken.
	const TILE_URL =
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile';

	interface Props {
		lat: number;
		lng: number;
		zoom?: number;
		/** Click on the map returns the clicked position (used by "Corregir") */
		onpick?: (lat: number, lng: number) => void;
	}

	let { lat, lng, zoom = 14, onpick }: Props = $props();
	let width = $state(318);
	let height = $state(168);

	// Position of the point in "tile units" at this zoom (web mercator)
	const tile = $derived.by(() => {
		const n = 2 ** zoom;
		const x = ((lng + 180) / 360) * n;
		const rad = (lat * Math.PI) / 180;
		const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
		return { x, y };
	});

	const tiles = $derived.by(() => {
		const list = [];
		const cx = Math.floor(tile.x);
		const cy = Math.floor(tile.y);
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				list.push({
					key: `${dx},${dy}`,
					url: `${TILE_URL}/${zoom}/${cy + dy}/${cx + dx}`,
					left: width / 2 + (cx + dx - tile.x) * 256,
					top: height / 2 + (cy + dy - tile.y) * 256
				});
			}
		}
		return list;
	});

	function pick(event: MouseEvent) {
		if (!onpick) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = tile.x + (event.clientX - rect.left - width / 2) / 256;
		const y = tile.y + (event.clientY - rect.top - height / 2) / 256;
		const n = 2 ** zoom;
		const newLng = (x / n) * 360 - 180;
		const newLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
		onpick(newLat, newLng);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	class="static-map"
	class:picking={!!onpick}
	bind:clientWidth={width}
	bind:clientHeight={height}
	onclick={pick}
>
	{#each tiles as t (t.key)}
		<img src={t.url} alt="" style:left="{t.left}px" style:top="{t.top}px" draggable="false" />
	{/each}
	<span class="pin"></span>
	<span class="attrib mono">Esri, HERE, Garmin, © OpenStreetMap</span>
</div>

<style>
	.static-map {
		position: relative;
		height: 168px;
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--line);
		background: var(--s2);
	}

	.picking {
		cursor: crosshair;
		box-shadow: 0 0 0 2px var(--acc);
	}

	img {
		position: absolute;
		width: 256px;
		height: 256px;
		filter: var(--tile-filter);
	}

	:global([data-theme='dark']) img {
		filter: brightness(0.55) contrast(1.12) saturate(1.15);
	}

	.pin {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 14px;
		height: 14px;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		background: var(--acc);
		border: 2px solid var(--s1);
		box-shadow:
			0 0 0 3px var(--acc-soft),
			0 0 12px var(--acc-glow);
	}

	.attrib {
		position: absolute;
		right: 6px;
		bottom: 4px;
		font-size: 9px;
		color: var(--t3);
	}
</style>
