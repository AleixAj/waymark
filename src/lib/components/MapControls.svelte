<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import PalettePicker from './PalettePicker.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import tc from '$lib/i18n/messages/common';
	import t from '$lib/i18n/messages/map';

	let { projection = true, style = '' }: { projection?: boolean; style?: string } = $props();
</script>

{#if ui.webgl}
	<div class="mapctl" {style} style:--sheet="{ui.sheetHeight}px">
		<!-- Phones: the timeline hides behind this button -->
		<div class="ctl panel phone-only">
			<button
				class="btn btn-ghost"
				class:on={ui.timelineOpen}
				aria-label={t('timeline')}
				aria-pressed={ui.timelineOpen}
				onclick={() => (ui.timelineOpen = !ui.timelineOpen)}
			>
				<Icon name="calendar" />
			</button>
		</div>
		<div class="ctl panel zoom">
			<button class="btn btn-ghost" aria-label={t('zoomIn')} onclick={() => mapView.zoomBy(1)}>
				<Icon name="plus" />
			</button>
			<div class="hr"></div>
			<button class="btn btn-ghost" aria-label={t('zoomOut')} onclick={() => mapView.zoomBy(-1)}>
				<Icon name="minus" />
			</button>
		</div>
		<div class="ctl panel">
			<button class="btn btn-ghost" aria-label={t('worldView')} onclick={() => mapView.world()}>
				<Icon name="target" />
			</button>
		</div>
		<PalettePicker />
		{#if projection}
			<div class="ctl panel projection">
				<button
					class="btn btn-ghost"
					class:on={!ui.flat}
					aria-label={tc('globe')}
					aria-pressed={!ui.flat}
					onclick={() => (ui.flat = false)}
				>
					<Icon name="globe" />
				</button>
				<button
					class="btn btn-ghost"
					class:on={ui.flat}
					aria-label={t('flat')}
					aria-pressed={ui.flat}
					onclick={() => (ui.flat = true)}
				>
					<Icon name="map" />
				</button>
			</div>
		{/if}
	</div>
{/if}

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

	.phone-only {
		display: none;
	}

	/* Phones: bigger touch targets right above the bottom sheet */
	@media (max-width: 767px) {
		.mapctl {
			right: 12px !important;
			bottom: calc(var(--sheet) + 12px) !important;
		}

		.phone-only {
			display: flex;
		}

		.zoom,
		.projection {
			display: none;
		}

		.ctl .btn {
			width: 36px;
			height: 36px;
		}
	}
</style>
