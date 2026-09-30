<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import PhotoDays from '$lib/components/photos/PhotoDays.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { sheet } from '$lib/components/ui/sheet';
	import { library } from '$lib/state/library.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { centroid } from '$lib/library/trips';
	import { circle, cityAreas } from '$lib/library/areas';
	import { formatLat, formatLng, formatNumber } from '$lib/library/format';
	import t from '$lib/i18n/messages/place';
	import tc from '$lib/i18n/messages/common';
	import type { LngLatBounds } from 'maplibre-gl';

	const iso = $derived(page.params.iso ?? '');
	// SvelteKit already decodes route parameters
	const city = $derived(page.params.city ?? '');
	const countryName = $derived(countries.name(iso));
	const cityPhotos = $derived(library.located.filter((p) => p.country === iso && p.city === city));
	const center = $derived(cityPhotos.length ? centroid(cityPhotos) : null);
	// Neighbourhoods are shown only when the photos are in more than one
	const areas = $derived(cityAreas(cityPhotos, city));
	const hasAreas = $derived(areas.length > 1);
	const active = $derived(hasAreas ? mapView.activeArea : null);
	const areaPhotos = $derived(
		active ? cityPhotos.filter((p) => (p.area ?? city) === active) : null
	);

	// Photos inside the visible part of the map, updated when the map stops moving.
	// Until the camera arrives (or without a map at all) the city's photos are shown.
	let bounds = $state.raw<LngLatBounds | null>(null);
	const inView = $derived(
		bounds ? library.located.filter((p) => bounds!.contains([p.lng, p.lat])) : cityPhotos
	);

	// Another city: start again from its own photos (or the area in the link)
	$effect(() => {
		void city;
		bounds = null;
		mapView.activeArea = untrack(() => page.url.searchParams.get('zona'));
	});

	$effect(() => {
		mapView.areas = hasAreas ? areas : null;
	});

	// Old links to a neighbourhood (".../Kópavogur") open its city with the area selected
	$effect(() => {
		if (!library.loaded || cityPhotos.length) return;
		const inArea = library.located.find((p) => p.country === iso && p.area === city);
		if (inArea?.city) {
			goto(`/lugar/${iso}/${encodeURIComponent(inArea.city)}?zona=${encodeURIComponent(city)}`, {
				replaceState: true
			});
		}
	});

	function chooseArea(name: string | null) {
		mapView.activeArea = mapView.activeArea === name ? null : name;
	}

	function updateInView() {
		const map = mapView.map;
		if (map && !map.isMoving()) bounds = map.getBounds();
	}

	$effect(() => {
		mapView.focus = null;
		mapView.route = null;
		mapView.points = null;
		mapView.labels = true;
		mapView.padding = { top: 140, bottom: 40, left: 40, right: 470 };
		return () => {
			mapView.areas = null;
			mapView.activeArea = null;
		};
	});

	$effect(() => {
		// The whole circle of the selected neighbourhood, or all the city's photos
		const area = active ? areas.find((a) => a.name === active) : null;
		const photos = area
			? circle(area.lat, area.lng, area.radiusKm, 16).map(([lng, lat]) => ({ lat, lng }))
			: cityPhotos;
		// Re-frame when the panel size changes (bottom sheet on phones)
		void mapView.cameraPadding;
		if (!mapView.map || !photos.length) return;
		untrack(() => mapView.fitPoints(photos, 15.5));
	});

	// A selected neighbourhood shows its photos; otherwise, what the map shows
	const shown = $derived(areaPhotos ?? inView);

	// The map may not exist yet when the page opens from a link, so we wait for it
	$effect(() => {
		const map = mapView.map;
		if (!map) return;
		map.on('moveend', updateInView);
		return () => map.off('moveend', updateInView);
	});

	function coords(lat: number, lng: number) {
		return `${formatLat(lat)} · ${formatLng(lng)}`;
	}
</script>

<svelte:head><title>{city} · Waymark</title></svelte:head>

<Breadcrumb
	items={[
		{ label: tc('world'), href: '/' },
		{ label: countryName, href: `/pais/${iso}` },
		{ label: city }
	]}
/>
<MapControls style="right: 452px; bottom: 16px" />

<aside use:sheet={'half'} class="rpanel panel" aria-label={t('inThisArea')}>
	<div class="head">
		<div class="row between">
			<span class="t-label">{city}, {countryName}</span>
			<button
				class="btn btn-ghost btn-icon btn-sm close"
				aria-label={tc('close')}
				onclick={() => goto(`/pais/${iso}`)}
			>
				<Icon name="x" />
			</button>
		</div>
		<h1 class="t-h1 title">{city}</h1>
		{#if center}<p class="mono t2 sub">{coords(center.lat, center.lng)}</p>{/if}
		{#if hasAreas}
			<div class="areas" role="group" aria-label={t('areasOf', { city })}>
				<button class="chip" class:is-on={!active} onclick={() => chooseArea(null)}>
					{t('wholeCity')} <span class="mono">{formatNumber(cityPhotos.length)}</span>
				</button>
				{#each areas as area (area.name)}
					<button
						class="chip"
						class:is-on={active === area.name}
						aria-pressed={active === area.name}
						onclick={() => chooseArea(area.name)}
					>
						{area.name} <span class="mono">{formatNumber(area.photoIds.length)}</span>
					</button>
				{/each}
			</div>
		{/if}
		<div class="row zone">
			<span class="row t-small t2 zone-label"
				><span class="dot sm"></span>{active ? t('photosIn', { area: active }) : t('showing')}</span
			>
			<span class="mono count">{formatNumber(shown.length)}</span>
		</div>
	</div>
	<div class="scroll">
		{#if shown.length}
			<PhotoDays photos={shown} context={active ?? city} />
		{:else}
			<div class="empty nothing">
				<h3>{t('empty')}</h3>
				<p>{t('emptyText')}</p>
			</div>
		{/if}
	</div>
</aside>

<style>
	.head {
		padding: 20px 20px 14px;
	}

	.between {
		justify-content: space-between;
	}

	.close {
		margin-right: -6px;
	}

	.title {
		margin-top: 6px;
		font-size: 34px;
		line-height: 40px;
	}

	.sub {
		margin-top: 6px;
	}

	.areas {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 16px;
	}

	.zone {
		justify-content: space-between;
		margin-top: 18px;
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--field);
		border: 1px solid var(--line);
	}

	.zone-label {
		gap: 8px;
	}

	.count {
		color: var(--t1);
	}

	.nothing {
		padding: 40px 20px;
	}
</style>
