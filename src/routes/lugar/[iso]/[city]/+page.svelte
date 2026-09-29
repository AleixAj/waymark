<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import PhotoDays from '$lib/components/photos/PhotoDays.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { library } from '$lib/state/library.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { centroid } from '$lib/library/trips';
	import { formatNumber } from '$lib/library/format';
	import type { LocatedPoint } from '$lib/photos/types';

	const iso = $derived(page.params.iso ?? '');
	const city = $derived(decodeURIComponent(page.params.city ?? ''));
	const countryName = $derived(countries.name(iso));
	const cityPhotos = $derived(library.located.filter((p) => p.country === iso && p.city === city));
	const center = $derived(cityPhotos.length ? centroid(cityPhotos) : null);

	// Photos inside the visible part of the map, updated when the map stops moving
	let inView = $state.raw<LocatedPoint[]>([]);

	function updateInView() {
		const map = mapView.map;
		if (!map) return;
		const bounds = map.getBounds();
		inView = library.located.filter((p) => bounds.contains([p.lng, p.lat]));
	}

	$effect(() => {
		mapView.focus = null;
		mapView.route = null;
		mapView.points = null;
		mapView.labels = true;
		mapView.padding = { top: 140, bottom: 40, left: 40, right: 470 };
	});

	$effect(() => {
		const photos = cityPhotos;
		if (!mapView.map || !photos.length) return;
		untrack(() => mapView.fitPoints(photos, 14.5));
	});

	// The map may not exist yet when the page opens from a link, so we wait for it
	$effect(() => {
		const map = mapView.map;
		if (!map) return;
		map.on('moveend', updateInView);
		updateInView();
		return () => map.off('moveend', updateInView);
	});

	function coords(lat: number, lng: number) {
		return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'O'}`;
	}
</script>

<svelte:head><title>{city} · Waymark</title></svelte:head>

<Breadcrumb
	items={[
		{ label: 'Mundo', href: '/' },
		{ label: countryName, href: `/pais/${iso}` },
		{ label: city }
	]}
/>
<MapControls style="right: 452px; bottom: 16px" />

<aside class="rpanel panel" aria-label="Fotos en esta zona">
	<div class="head">
		<div class="row between">
			<span class="t-label">{city}, {countryName}</span>
			<button
				class="btn btn-ghost btn-icon btn-sm close"
				aria-label="Cerrar"
				onclick={() => goto(`/pais/${iso}`)}
			>
				<Icon name="x" />
			</button>
		</div>
		<h1 class="t-h1 title">{city}</h1>
		{#if center}<p class="mono t2 sub">{coords(center.lat, center.lng)}</p>{/if}
		<div class="row zone">
			<span class="row t-small t2 zone-label"
				><span class="dot sm"></span>Mostrando fotos en esta zona</span
			>
			<span class="mono count">{formatNumber(inView.length)}</span>
		</div>
	</div>
	<div class="scroll">
		{#if inView.length}
			<PhotoDays photos={inView} context={city} />
		{:else}
			<div class="empty nothing">
				<h3>No hay fotos en esta zona</h3>
				<p>Mueve el mapa o aleja el zoom para ver más.</p>
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
