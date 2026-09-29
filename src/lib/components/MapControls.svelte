<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { ui } from '$lib/state/ui.svelte';

	let { projection = true, style = '' }: { projection?: boolean; style?: string } = $props();
</script>

<div class="mapctl" {style}>
	<div class="ctl panel">
		<button class="btn btn-ghost" aria-label="Acercar" onclick={() => mapView.zoomBy(1)}>
			<Icon name="plus" />
		</button>
		<div class="hr"></div>
		<button class="btn btn-ghost" aria-label="Alejar" onclick={() => mapView.zoomBy(-1)}>
			<Icon name="minus" />
		</button>
	</div>
	<div class="ctl panel">
		<button class="btn btn-ghost" aria-label="Vista global" onclick={() => mapView.world()}>
			<Icon name="target" />
		</button>
	</div>
	{#if projection}
		<div class="ctl panel">
			<button
				class="btn btn-ghost"
				class:on={!ui.flat}
				aria-label="Globo"
				aria-pressed={!ui.flat}
				onclick={() => (ui.flat = false)}
			>
				<Icon name="globe" />
			</button>
			<button
				class="btn btn-ghost"
				class:on={ui.flat}
				aria-label="Mapa plano"
				aria-pressed={ui.flat}
				onclick={() => (ui.flat = true)}
			>
				<Icon name="map" />
			</button>
		</div>
	{/if}
</div>

<style>
	.mapctl {
		position: absolute;
		right: 16px;
		bottom: 112px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		z-index: 10;
	}

	.ctl {
		display: flex;
		flex-direction: column;
		padding: 4px;
		gap: 2px;
		border-radius: 12px;
	}

	.ctl .btn {
		width: 32px;
		height: 32px;
		padding: 0;
	}

	.ctl .hr {
		margin: 2px 4px;
	}

	.on {
		background: var(--hover);
		color: var(--acc-text);
	}
</style>
