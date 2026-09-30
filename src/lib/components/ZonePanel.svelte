<script lang="ts">
	import PhotoDays from './photos/PhotoDays.svelte';
	import Icon from './ui/Icon.svelte';
	import { sheet } from './ui/sheet';
	import { library } from '$lib/state/library.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { groupBy } from '$lib/library/trips';
	import { formatNumber, formatRange } from '$lib/library/format';
	import tc from '$lib/i18n/messages/common';
	import t from '$lib/i18n/messages/zone';

	let { zone }: { zone: { ids: string[]; title: string } } = $props();

	const photos = $derived.by(() => {
		const ids = new Set(zone.ids);
		return library.located.filter((p) => ids.has(p.id));
	});
	// A city chip narrows the list without zooming the map again
	let city = $state<string | null>(null);
	const cities = $derived(
		[...groupBy(photos, (p) => p.city ?? '').entries()]
			.filter(([name]) => name)
			.map(([name, items]) => ({ name, country: items[0].country, count: items.length }))
			.sort((a, b) => b.count - a.count)
	);
	const shown = $derived(city ? photos.filter((p) => p.city === city) : photos);
	const countryList = $derived([...new Set(photos.map((p) => p.country).filter(Boolean))]);
	const range = $derived.by(() => {
		if (!photos.length) return '';
		const times = photos.map((p) => p.takenAt);
		return formatRange(Math.min(...times), Math.max(...times));
	});
	const selected = $derived(cities.find((c) => c.name === city));

	// A new circle on the map starts with all its photos
	$effect(() => {
		void zone;
		city = null;
	});

	function close() {
		ui.zone = null;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && !ui.viewer && !ui.searchOpen && !ui.settingsOpen) close();
	}
</script>

<svelte:window onkeydown={onKey} />

<aside use:sheet={'half'} class="rpanel panel zone" aria-label={t('label')}>
	<div class="head">
		<div class="row between">
			<span class="t-label">
				{countryList.map((iso) => countries.name(iso!)).join(' · ') || t('zone')}
			</span>
			<div class="row tools">
				<button
					class="btn btn-ghost btn-icon btn-sm"
					aria-label={tc('centerMap')}
					onclick={() => mapView.fitPoints(shown, 15)}
				>
					<Icon name="target" />
				</button>
				<button class="btn btn-ghost btn-icon btn-sm" aria-label={tc('close')} onclick={close}>
					<Icon name="x" />
				</button>
			</div>
		</div>
		{#key zone}<h1 class="t-h1 title">{zone.title}</h1>{/key}
		<p class="mono t2 sub">
			{range} · {tc('photos', { n: photos.length })}
		</p>

		{#if cities.length > 1}
			<div class="row chips" role="group" aria-label={t('cities')}>
				<button class="chip" class:is-on={!city} aria-pressed={!city} onclick={() => (city = null)}
					>{t('all')} <span class="mono">{formatNumber(photos.length)}</span></button
				>
				{#each cities.slice(0, 12) as c (c.name)}
					<button
						class="chip"
						class:is-on={city === c.name}
						aria-pressed={city === c.name}
						onclick={() => (city = city === c.name ? null : c.name)}
					>
						{c.name} <span class="mono">{formatNumber(c.count)}</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if selected?.country || cities.length === 1}
			{@const target = selected ?? cities[0]}
			<a
				class="btn btn-secondary btn-sm explore"
				href="/lugar/{target.country}/{encodeURIComponent(target.name)}"
			>
				<Icon name="pin" />{t('explore', { name: target.name })}
			</a>
		{:else}
			<p class="row t-small t3 hint">
				<Icon name="info" size={14} />{t('hint')}
			</p>
		{/if}
	</div>
	<div class="hr"></div>
	<div class="scroll">
		<!-- A smaller circle clicked on the map: its photos come in fresh -->
		{#key zone}
			<div class="list">
				<PhotoDays photos={shown} context={city ?? zone.title} />
			</div>
		{/key}
	</div>
</aside>

<style>
	/* Over the page's own panel (country, trip...): closing it shows that one again */
	.zone {
		z-index: 12;
	}

	@media (max-width: 767px) {
		.zone {
			z-index: 16;
		}
	}

	.head {
		padding: 20px 20px 16px;
	}

	.between {
		justify-content: space-between;
		gap: 12px;
	}

	.tools {
		gap: 2px;
		margin-right: -6px;
		flex: none;
	}

	.title {
		margin-top: 10px;
		font-size: 32px;
		line-height: 38px;
		text-wrap: balance;
	}

	.sub {
		margin-top: 6px;
	}

	.chips {
		gap: 6px;
		margin-top: 16px;
		flex-wrap: wrap;
	}

	.explore {
		margin-top: 14px;
	}

	.hint {
		gap: 6px;
		margin-top: 14px;
	}

	.title,
	.list {
		animation: item-in var(--dur-slow) var(--ease-out);
	}
</style>
