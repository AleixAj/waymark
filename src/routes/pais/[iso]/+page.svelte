<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import PhotoDays from '$lib/components/photos/PhotoDays.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { sheet } from '$lib/components/ui/sheet';
	import Flag from '$lib/components/ui/Flag.svelte';
	import { library } from '$lib/state/library.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { countryDetail } from '$lib/library/stats';
	import { formatNumber, formatRange } from '$lib/library/format';
	import t from '$lib/i18n/messages/country';
	import tc from '$lib/i18n/messages/common';

	const iso = $derived(page.params.iso ?? '');
	const info = $derived(countries.info(iso));
	// In the user's language (the code itself for an unknown country)
	const name = $derived(countries.name(iso));
	const detail = $derived(countryDetail(library.located, iso, library.trips));
	let city = $state<string | null>(null);

	const photos = $derived(
		detail ? (city ? detail.photos.filter((p) => p.city === city) : detail.photos) : []
	);

	// "/pais/esp" works too: codes are always upper case
	$effect(() => {
		if (iso && iso !== iso.toUpperCase())
			goto(`/pais/${iso.toUpperCase()}`, { replaceState: true });
	});

	// A code that no country has (an old or mistyped link)
	const unknown = $derived(countries.list.length > 0 && !info && !detail);

	// Changing country resets the city filter
	$effect(() => {
		void iso;
		city = null;
	});

	// Highlight the country, show city names and leave room for the panel
	$effect(() => {
		mapView.focus = iso;
		mapView.route = null;
		mapView.points = null;
		mapView.labels = true;
		mapView.padding = { top: 140, bottom: 110, left: 40, right: 470 };
	});

	// Fly to the country, or to the photos of the chosen city
	// (only when the country or the city changes, not on every library update)
	$effect(() => {
		const target = { iso, city };
		// Re-frame when the panel size changes (bottom sheet on phones)
		void mapView.cameraPadding;
		if (!mapView.map || !countries.list.length) return;
		untrack(() => {
			if (target.city && photos.length) mapView.fitPoints(photos, 13);
			else mapView.fitCountry(target.iso);
		});
	});

	$effect(() => () => {
		mapView.focus = null;
	});

	const unit = $derived(settings.units);
</script>

<svelte:head><title>{info ? name : t('country')} · Waymark</title></svelte:head>

<Breadcrumb items={[{ label: tc('world'), href: '/' }, { label: name }]} />
<MapControls style="right: 452px" />
{#if detail}
	<Timeline style="right: 452px" />
{/if}

<aside use:sheet={'half'} class="rpanel panel" aria-label={info ? name : undefined}>
	<div class="head">
		<div class="row between">
			{#if info?.iso2}
				<Flag iso2={info.iso2} {name} />
			{:else}
				<span class="code">{iso}</span>
			{/if}
			<div class="row tools">
				<button
					class="btn btn-ghost btn-icon btn-sm"
					aria-label={tc('centerMap')}
					onclick={() => mapView.fitCountry(iso)}
				>
					<Icon name="target" />
				</button>
				<button
					class="btn btn-ghost btn-icon btn-sm"
					aria-label={tc('close')}
					onclick={() => goto('/')}
				>
					<Icon name="x" />
				</button>
			</div>
		</div>
		<h1 class="t-h1 title">{name}</h1>

		{#if detail}
			<p class="mono t2 sub">
				{formatRange(detail.first, detail.last)} · {t('visits', { n: detail.visits || 1 })}
			</p>
			<div class="row stats">
				<div class="col">
					<span class="mono num">{formatNumber(detail.count)}</span><span class="t-small t3"
						>{tc('photosWord', { n: detail.count })}</span
					>
				</div>
				<div class="col">
					<span class="mono num">{detail.cities.length}</span><span class="t-small t3"
						>{tc('citiesWord', { n: detail.cities.length })}</span
					>
				</div>
				<div class="col">
					<span class="mono num">{detail.days}</span><span class="t-small t3"
						>{tc('daysWord', { n: detail.days })}</span
					>
				</div>
				<div class="col">
					<span class="mono num">{formatNumber(settings.distance(detail.km))}</span><span
						class="t-small t3">{unit}</span
					>
				</div>
			</div>
			<div class="row chips">
				<button class="chip" class:is-on={!city} onclick={() => (city = null)}>{t('all')}</button>
				{#each detail.cities.slice(0, 12) as c (c.city)}
					<button class="chip" class:is-on={city === c.city} onclick={() => (city = c.city)}>
						{c.city} <span class="mono">{formatNumber(c.count)}</span>
					</button>
				{/each}
			</div>
			{#if city}
				<a class="btn btn-secondary btn-sm explore" href="/lugar/{iso}/{encodeURIComponent(city)}">
					<Icon name="pin" />{t('explore', { city })}
				</a>
			{/if}
		{:else}
			<p class="mono t3 sub">{t('noVisits')}</p>
		{/if}
	</div>

	{#if detail}
		<div class="hr"></div>
		<div class="scroll">
			<PhotoDays {photos} context={city ?? (info ? name : '')} />
		</div>
	{:else}
		<div class="empty none">
			<svg class="ill" viewBox="0 0 72 72" aria-hidden="true">
				<circle cx="36" cy="36" r="22" /><ellipse cx="36" cy="36" rx="9" ry="22" /><path
					d="M14 36h44"
				/>
				<circle class="a" cx="52" cy="18" r="4" stroke-dasharray="2.5 2.5" />
			</svg>
			{#if unknown}
				<h3>{t('notFound')}</h3>
			{:else}
				<h3>{t('noPhotos', { country: name })}</h3>
			{/if}
			<p>{t('noGps')}</p>
			<a class="btn btn-secondary btn-sm" href="/sin-ubicacion">
				{t('review')} <span class="mono t3">{library.unlocated.length}</span>
			</a>
		</div>
	{/if}
</aside>

<style>
	.head {
		padding: 20px 20px 16px;
	}

	.between {
		justify-content: space-between;
	}

	.tools {
		gap: 2px;
		margin-right: -6px;
	}

	.title {
		margin-top: 12px;
	}

	.sub {
		margin-top: 6px;
	}

	.stats {
		gap: 20px;
		margin-top: 16px;
	}

	.num {
		font-size: 16px;
		line-height: 22px;
		color: var(--t1);
	}

	.chips {
		gap: 6px;
		margin-top: 16px;
		flex-wrap: wrap;
	}

	.explore {
		margin-top: 12px;
	}

	.none {
		margin: auto 20px;
		gap: 0;
	}

	.none .btn {
		margin-top: 18px;
	}
</style>
