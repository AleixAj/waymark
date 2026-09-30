<script lang="ts">
	import Thumb from './Thumb.svelte';
	import { growingLimit } from './growing.svelte';
	import type { PhotoPoint } from '$lib/photos/types';
	import { dayKey, formatDay, formatNumber, formatRange } from '$lib/library/format';
	import { groupBy, ranked } from '$lib/library/trips';
	import { ui } from '$lib/state/ui.svelte';

	interface Props {
		photos: PhotoPoint[];
		columns?: number;
		/** Name for the viewer header, e.g. "Japón" */
		context?: string;
	}

	let { photos, columns = 4, context = '' }: Props = $props();

	// By place (the default): one section per city, the biggest first. When all the
	// photos are in one city its neighbourhoods are used instead. By date: one per day.
	const groups = $derived.by(() => {
		if (ui.photoOrder === 'date') {
			return [...groupBy(photos, (p) => dayKey(p.takenAt)).values()].map((items) => ({
				key: dayKey(items[0].takenAt),
				title: formatDay(items[0].takenAt),
				place: ranked(items, (p) => p.city)[0] ?? '',
				items
			}));
		}
		const oneCity = new Set(photos.map((p) => p.city)).size === 1;
		const placeOf = (p: PhotoPoint) => (oneCity ? (p.area ?? p.city) : p.city) ?? '';
		return [...groupBy(photos, placeOf).entries()]
			.map(([name, items]) => {
				const sorted = [...items].sort((a, b) => a.takenAt - b.takenAt);
				return {
					key: name || '-',
					title: name || 'Otros lugares',
					place: formatRange(sorted[0].takenAt, sorted[sorted.length - 1].takenAt),
					items: sorted
				};
			})
			.sort((a, b) => (a.key === '-' ? 1 : b.key === '-' ? -1 : b.items.length - a.items.length));
	});
	// The viewer goes through the photos in the same order as the list
	const ids = $derived(groups.flatMap((g) => g.items.map((p) => p.id)));

	// Long lists appear in steps (see growing.svelte.ts): whole days, until the limit
	const shown = growingLimit(() => photos.length);
	const shownDays = $derived.by(() => {
		let count = 0;
		const result = [];
		for (const day of groups) {
			if (count >= shown.value) break;
			result.push(day);
			count += day.items.length;
		}
		return result;
	});
</script>

<div class="row order">
	<span class="t-small t3">Ordenar</span>
	<div class="seg" role="radiogroup" aria-label="Ordenar fotos">
		<button
			role="radio"
			aria-checked={ui.photoOrder === 'place'}
			class:is-on={ui.photoOrder === 'place'}
			onclick={() => (ui.photoOrder = 'place')}>Por lugar</button
		>
		<button
			role="radio"
			aria-checked={ui.photoOrder === 'date'}
			class:is-on={ui.photoOrder === 'date'}
			onclick={() => (ui.photoOrder = 'date')}>Por fecha</button
		>
	</div>
</div>

{#each shownDays as day (day.key)}
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
	.order {
		justify-content: space-between;
		gap: 12px;
		padding: 12px 20px 4px;
	}

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

	@media (max-width: 767px) {
		.order {
			padding: 10px 16px 4px;
		}

		.pgrid {
			padding: 0 16px 12px;
			grid-template-columns: repeat(3, 1fr) !important;
			gap: 3px;
		}
	}
</style>
