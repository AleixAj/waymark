<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import Thumb from '$lib/components/photos/Thumb.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { sheet } from '$lib/components/ui/sheet';
	import { library } from '$lib/state/library.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { fullImageUrl } from '$lib/photos/image';
	import { formatDay, formatNumber } from '$lib/library/format';
	import { downloadText, tripToGpx } from '$lib/library/gpx';

	const trip = $derived(library.trips.find((t) => t.id === page.params.id));
	let cover = $state<string | null>(null);
	let playing = $state(false);
	let scroller = $state<HTMLDivElement>();

	$effect(() => {
		const id = trip?.coverId;
		cover = null;
		if (id) fullImageUrl(id).then((url) => (cover = url));
	});

	// Only the route and its stops on the map
	$effect(() => {
		mapView.focus = null;
		mapView.points = [];
		mapView.labels = false;
		mapView.route = trip?.stops ?? null;
		mapView.padding = { top: 140, bottom: 60, left: 60, right: 480 };
	});

	$effect(() => {
		const stops = trip?.stops;
		// Re-frame when the panel size changes (bottom sheet on phones)
		void mapView.cameraPadding;
		if (!mapView.map || !stops) return;
		untrack(() => mapView.fitPoints(stops, 11));
	});

	onMount(() => () => {
		playing = false;
		mapView.route = null;
		mapView.points = null;
		mapView.activeStop = null;
	});

	// Clicking a stop on the map scrolls its photos into view
	$effect(() => {
		const active = mapView.activeStop;
		if (!active || !scroller) return;
		scroller.querySelector(`[data-stop="${active}"]`)?.scrollIntoView({
			behavior: settings.reducedMotion ? 'auto' : 'smooth',
			block: 'start'
		});
	});

	const byId = $derived(library.byId);

	/** Flies from stop to stop, like a slideshow of the route */
	async function play() {
		if (!trip || !mapView.map) return;
		if (playing) {
			playing = false;
			return;
		}
		playing = true;
		for (const stop of trip.stops) {
			if (!playing) break;
			mapView.activeStop = stop.index;
			mapView.flyTo([stop.lng, stop.lat], 11);
			await new Promise((resolve) => setTimeout(resolve, settings.reducedMotion ? 1200 : 2600));
		}
		if (playing) mapView.fitPoints(trip.stops, 11);
		playing = false;
	}

	function rename(event: Event) {
		const text = (event.target as HTMLElement).textContent?.trim();
		if (trip && text && text !== trip.title) library.renameTrip(trip.id, text);
	}

	function titleKeys(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(event.target as HTMLElement).blur();
		}
	}

	function range() {
		if (!trip) return '';
		const end = formatDay(trip.end);
		const year = new Date(trip.end).getFullYear();
		return `${formatDay(trip.start)} – ${end} ${year} · ${trip.days} días`;
	}
</script>

<svelte:head><title>{trip?.title ?? 'Viaje'} · Waymark</title></svelte:head>

<Breadcrumb items={[{ label: 'Viajes', href: '/' }, { label: trip?.title ?? 'Viaje' }]} />
<MapControls projection={false} style="right: 452px; bottom: 16px" />

{#if trip}
	<aside use:sheet={'half'} class="rpanel panel" aria-label="Viaje">
		<div class="scroll" bind:this={scroller}>
			<div class="cover-wrap">
				<div class="cover" style:background-image={cover ? `url(${cover})` : undefined}></div>
			</div>
			<div class="head">
				<div class="row title-row">
					<h1
						class="t-h2 title"
						contenteditable="true"
						spellcheck="false"
						aria-label="Nombre del viaje (editable)"
						onblur={rename}
						onkeydown={titleKeys}
					>
						{trip.title}
					</h1>
					<span class="t3"><Icon name="edit" size={16} /></span>
				</div>
				<p class="mono t2 sub">{range()}</p>
				<div class="grid-stats">
					<div class="col">
						<span class="mono num">{formatNumber(settings.distance(trip.km))}</span><span
							class="t-small t3">{settings.units}</span
						>
					</div>
					<div class="col">
						<span class="mono num">{trip.stops.length}</span><span class="t-small t3">etapas</span>
					</div>
					<div class="col">
						<span class="mono num">{trip.countries.length}</span><span class="t-small t3"
							>{trip.countries.length === 1 ? 'país' : 'países'}</span
						>
					</div>
					<div class="col">
						<span class="mono num">{formatNumber(trip.photoIds.length)}</span><span
							class="t-small t3">fotos</span
						>
					</div>
				</div>
				<div class="row actions">
					<button class="btn btn-primary grow" onclick={play}>
						<Icon name={playing ? 'pause' : 'play'} />{playing ? 'Pausar' : 'Reproducir viaje'}
					</button>
					<button
						class="btn btn-secondary btn-icon"
						aria-label="Exportar la ruta (GPX)"
						title="Exportar la ruta (GPX)"
						onclick={() =>
							downloadText(`${trip!.title}.gpx`, tripToGpx(trip!), 'application/gpx+xml')}
					>
						<Icon name="download" />
					</button>
					<button
						class="btn btn-secondary btn-icon"
						aria-label="Ver todas las fotos"
						title="Ver todas las fotos"
						onclick={() => ui.openViewer(trip!.photoIds, trip!.photoIds[0], trip!.title)}
					>
						<Icon name="expand" />
					</button>
				</div>
			</div>
			<div class="hr"></div>

			{#each trip.stops as stop, i (stop.index)}
				<section data-stop={stop.index}>
					<div class="day-h stage">
						<button
							class="stop small"
							class:is-on={mapView.activeStop === stop.index}
							onclick={() => {
								mapView.activeStop = stop.index;
								mapView.flyTo([stop.lng, stop.lat], 11);
							}}
							aria-label="Ver la etapa {stop.index} en el mapa">{stop.index}</button
						>
						<div class="col grow">
							<b>{i > 0 ? `${trip.stops[i - 1].city} → ` : ''}{stop.city}</b>
							<span class="mono t3 meta">
								{formatDay(stop.start)}{i > 0
									? ` · ${formatNumber(settings.distance(stop.km))} ${settings.units}`
									: ''}
							</span>
						</div>
						<span class="mono t3">{stop.photoIds.length}</span>
					</div>
					<div class="pgrid">
						{#each stop.photoIds as id (id)}
							<Thumb
								{id}
								favorite={byId.get(id)?.favorite}
								onclick={() => ui.openViewer(trip!.photoIds, id, trip!.title)}
							/>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</aside>
{:else if library.loaded}
	<aside use:sheet={'half'} class="rpanel panel">
		<div class="empty missing">
			<h3>Este viaje ya no existe</h3>
			<p>Puede que hayas borrado sus fotos o cambiado sus fechas.</p>
			<a class="btn btn-secondary btn-sm" href="/">Volver al globo</a>
		</div>
	</aside>
{/if}

<style>
	.cover-wrap {
		padding: 12px 12px 0;
	}

	.cover {
		height: 150px;
		border-radius: 10px;
		background: var(--s3) center / cover;
	}

	.head {
		padding: 16px 20px 18px;
	}

	.title-row {
		gap: 8px;
	}

	.title {
		font-size: 26px;
		line-height: 32px;
		padding: 2px 6px;
		margin: 0 -6px;
		border-radius: 6px;
		outline: none;
		transition: background-color 0.15s;
	}

	.title:hover,
	.title:focus {
		background: var(--hover);
		box-shadow: inset 0 -1px 0 var(--line-strong);
	}

	.sub {
		margin-top: 6px;
	}

	.grid-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		margin-top: 16px;
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--line);
		background: var(--line);
	}

	.grid-stats .col {
		padding: 10px 12px;
		background: var(--s1);
	}

	.num {
		font-size: 15px;
		line-height: 20px;
		color: var(--t1);
	}

	.actions {
		gap: 8px;
		margin-top: 14px;
	}

	.grow {
		flex: 1;
		min-width: 0;
	}

	.stage {
		align-items: center;
		gap: 12px;
		justify-content: flex-start;
	}

	.stop.small {
		width: 22px;
		height: 22px;
		font-size: 10px;
		box-shadow: none;
		flex: none;
	}

	.meta {
		font-size: 11px;
	}

	.pgrid {
		padding: 2px 20px 18px;
		grid-template-columns: repeat(5, 1fr);
	}

	.missing {
		margin: auto 20px;
	}

	.missing .btn {
		margin-top: 18px;
	}
</style>
