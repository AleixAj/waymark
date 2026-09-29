<script lang="ts">
	import Thumb from './Thumb.svelte';
	import type { PhotoPoint } from '$lib/photos/types';
	import { dayKey, formatDay, formatNumber } from '$lib/library/format';
	import { groupBy, ranked } from '$lib/library/trips';
	import { ui } from '$lib/state/ui.svelte';

	interface Props {
		photos: PhotoPoint[];
		columns?: number;
		/** Name for the viewer header, e.g. "Japón" */
		context?: string;
	}

	let { photos, columns = 4, context = '' }: Props = $props();

	// One section per day, with the main city of that day as subtitle
	const days = $derived(
		[...groupBy(photos, (p) => dayKey(p.takenAt)).values()].map((items) => ({
			key: dayKey(items[0].takenAt),
			title: formatDay(items[0].takenAt),
			place: ranked(items, (p) => p.city)[0] ?? '',
			items
		}))
	);
	const ids = $derived(photos.map((p) => p.id));
</script>

{#each days as day (day.key)}
	<section
		class="day"
		style:contain-intrinsic-size="auto {Math.ceil(day.items.length / columns) * 96 + 48}px"
	>
		<div class="day-h">
			<b
				>{day.title}
				{#if day.place}<span class="t3 light">· {day.place}</span>{/if}</b
			>
			<span class="mono">{formatNumber(day.items.length)} fotos</span>
		</div>
		<div class="pgrid" style:grid-template-columns="repeat({columns}, 1fr)">
			{#each day.items as photo (photo.id)}
				<Thumb
					id={photo.id}
					favorite={photo.favorite}
					onclick={() => ui.openViewer(ids, photo.id, context)}
				/>
			{/each}
		</div>
	</section>
{/each}

<style>
	/* Sections far from the screen are skipped by the browser until needed */
	.day {
		content-visibility: auto;
	}

	.pgrid {
		padding: 0 20px 16px;
	}

	.light {
		font-weight: 400;
	}
</style>
