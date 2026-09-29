<script lang="ts">
	import Icon from '../ui/Icon.svelte';
	import StaticMap from './StaticMap.svelte';
	import { focusTrap } from '../ui/focusTrap';
	import { ui } from '$lib/state/ui.svelte';
	import { library } from '$lib/state/library.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { thumbUrl } from '$lib/state/thumbs.svelte';
	import { getPhoto } from '$lib/photos/db';
	import { fullImageUrl } from '$lib/photos/image';
	import { placeAt } from '$lib/photos/placeFinder';
	import type { Photo } from '$lib/photos/types';
	import {
		formatCoords,
		formatDayLong,
		formatDecimal,
		formatExposure,
		formatNumber,
		formatTime
	} from '$lib/library/format';

	const viewer = $derived(ui.viewer!);
	const id = $derived(viewer.ids[viewer.index]);
	const point = $derived(library.byId.get(id));

	let photo = $state.raw<Photo | null>(null);
	let image = $state<string | null>(null);
	// On phones the info starts hidden, the photo comes first
	let showInfo = $state(typeof window !== 'undefined' && window.innerWidth > 900);
	let fixing = $state(false);
	let copied = $state(false);

	// Load metadata and the big image of the current photo
	$effect(() => {
		const current = id;
		photo = null;
		image = null;
		fixing = false;
		getPhoto(current).then((p) => {
			if (current === id) photo = p ?? null;
		});
		fullImageUrl(current).then((url) => {
			if (current === id) image = url;
		});
		// Preload the next one so moving forward feels instant
		const next = viewer.ids[viewer.index + 1];
		if (next) fullImageUrl(next);
	});

	// Index photo -> trip: no need to search every trip for every photo
	const trips = $derived(library.tripByPhoto.get(id) ? [library.tripByPhoto.get(id)!] : []);
	const title = $derived(
		[point?.area, point?.city, point?.country ? countries.name(point.country) : null]
			.filter(Boolean)
			.join(', ') ||
			photo?.name ||
			'Foto'
	);

	// A window of thumbnails around the current photo
	const strip = $derived.by(() => {
		const from = Math.max(0, Math.min(viewer.index - 6, viewer.ids.length - 13));
		return viewer.ids.slice(from, from + 13).map((sid, i) => ({ id: sid, index: from + i }));
	});

	function go(step: number) {
		const index = viewer.index + step;
		if (index >= 0 && index < viewer.ids.length) ui.viewer = { ...viewer, index };
	}

	function onKey(event: KeyboardEvent) {
		// Another dialog on top handles its own keys; Ctrl+F or Ctrl+I belong to the browser
		if (ui.searchOpen || ui.settingsOpen || event.defaultPrevented) return;
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		if ((event.target as HTMLElement).isContentEditable) return;
		if (event.key === 'ArrowRight') go(1);
		else if (event.key === 'ArrowLeft') go(-1);
		else if (event.key === 'Escape') {
			// Escape first cancels "Corregir", a second one closes the viewer
			if (fixing) fixing = false;
			else ui.closeViewer();
		} else if (event.key.toLowerCase() === 'i') showInfo = !showInfo;
		else if (event.key.toLowerCase() === 'f') library.toggleFavorite(id);
	}

	function download() {
		if (!image || !photo) return;
		const link = document.createElement('a');
		link.href = image;
		link.download = photo.demo ? `${photo.name.replace(/\.\w+$/, '')}.webp` : photo.name;
		link.click();
	}

	async function copyCoords() {
		if (point?.lat == null || point.lng == null) return;
		await navigator.clipboard.writeText(`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	async function fixLocation(lat: number, lng: number) {
		await library.assignLocation([id], await placeAt(lat, lng));
		photo = (await getPhoto(id)) ?? null;
		fixing = false;
	}

	function megapixels(p: Photo) {
		return formatDecimal((p.width * p.height) / 1e6);
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="viewer"
	role="dialog"
	aria-modal="true"
	aria-label="Visor de fotos"
	tabindex="-1"
	use:focusTrap
>
	<div class="stage">
		<header class="row top">
			<div class="row left">
				<button
					class="btn btn-ghost btn-icon"
					aria-label="Cerrar (Esc)"
					onclick={() => ui.closeViewer()}
				>
					<Icon name="x" />
				</button>
				<div class="col">
					<span class="name">{title}</span>
					<span class="mono counter">
						{formatNumber(viewer.index + 1)} / {formatNumber(viewer.ids.length)}{viewer.context
							? ` · ${viewer.context}`
							: ''}
					</span>
				</div>
			</div>
			<div class="row tools">
				<button
					class="btn btn-ghost btn-icon"
					class:fav={point?.favorite}
					aria-label={point?.favorite ? 'Quitar de favoritos (F)' : 'Añadir a favoritos (F)'}
					aria-pressed={point?.favorite}
					onclick={() => library.toggleFavorite(id)}
				>
					<Icon name="heart" filled={point?.favorite} />
				</button>
				{#if trips[0]}
					<button
						class="btn btn-ghost btn-icon"
						aria-label="Usar como portada de «{trips[0].title}»"
						title="Usar como portada del viaje"
						onclick={() => library.setTripCover(trips[0], id)}
					>
						<Icon name="folderPlus" />
					</button>
				{/if}
				<button
					class="btn btn-ghost btn-icon"
					aria-label="Corregir ubicación"
					title="Corregir ubicación"
					onclick={() => {
						showInfo = true;
						fixing = true;
					}}
				>
					<Icon name="pinEdit" />
				</button>
				<button
					class="btn btn-ghost btn-icon"
					aria-label="Descargar"
					title="Descargar"
					onclick={download}
				>
					<Icon name="download" />
				</button>
				<div class="sep"></div>
				<button
					class="btn btn-ghost btn-icon"
					class:pressed={showInfo}
					aria-label="Información (I)"
					aria-pressed={showInfo}
					onclick={() => (showInfo = !showInfo)}
				>
					<Icon name="info" />
				</button>
			</div>
		</header>

		<div class="picture">
			{#if photo && photo.previewable === false}
				<div class="cannot-show empty">
					<h3>Este navegador no puede mostrar esta foto</h3>
					<p>
						Es un formato que solo abren algunos navegadores (HEIC, o un RAW sin vista previa). Su
						ubicación y sus datos sí están guardados, y puedes descargarla.
					</p>
				</div>
			{:else if image}
				<img src={image} alt={title} />
			{:else if thumbUrl(id)}
				<img src={thumbUrl(id)} alt="" class="loading" />
			{/if}
		</div>

		<button
			class="nav prev"
			aria-label="Anterior (←)"
			disabled={viewer.index === 0}
			onclick={() => go(-1)}
		>
			<Icon name="chevL" />
		</button>
		<button
			class="nav next"
			aria-label="Siguiente (→)"
			disabled={viewer.index === viewer.ids.length - 1}
			onclick={() => go(1)}
		>
			<Icon name="chevR" />
		</button>

		<!-- Phones: the main actions live in a bar at the bottom -->
		<div class="row phone-actions">
			<button class:fav={point?.favorite} onclick={() => library.toggleFavorite(id)}>
				<Icon name="heart" filled={point?.favorite} />Favorito
			</button>
			{#if trips[0]}
				<button onclick={() => library.setTripCover(trips[0], id)}>
					<Icon name="folderPlus" />Portada
				</button>
			{/if}
			<button
				onclick={() => {
					showInfo = true;
					fixing = true;
				}}
			>
				<Icon name="pinEdit" />Ubicación
			</button>
			<button onclick={download}><Icon name="download" />Descargar</button>
		</div>

		<div class="row mono hints">
			<span class="row"><span class="kbd">←</span><span class="kbd">→</span> navegar</span>
			<span class="row"><span class="kbd">I</span> información</span>
			<span class="row"><span class="kbd">Esc</span> cerrar</span>
		</div>
		<div class="row strip">
			{#each strip as item (item.id)}
				<button
					class="mini"
					class:on={item.index === viewer.index}
					style:background-image={thumbUrl(item.id) ? `url(${thumbUrl(item.id)})` : undefined}
					aria-label="Foto {item.index + 1}"
					onclick={() => (ui.viewer = { ...viewer, index: item.index })}
				></button>
			{/each}
		</div>
	</div>

	{#if showInfo}
		<aside class="info solid" aria-label="Información">
			<div class="row info-head">
				<span class="t-h3">Información</span>
				<button
					class="btn btn-ghost btn-icon btn-sm"
					aria-label="Ocultar información"
					onclick={() => (showInfo = false)}
				>
					<Icon name="sidebar" />
				</button>
			</div>
			{#if photo}
				<div class="scroll col body">
					<div class="kv">
						<Icon name="calendar" size={16} />
						<div class="col">
							<span class="v">{formatDayLong(photo.takenAt)}</span>
							<span class="mono t3">
								{formatTime(photo.takenAt)}{photo.offset ? ` · GMT${photo.offset}` : ''}
							</span>
						</div>
					</div>
					{#if photo.camera}
						<div class="kv">
							<Icon name="camera" size={16} />
							<div class="col">
								<span class="v">{photo.camera}</span>
								{#if photo.lens}<span class="t-small t3">{photo.lens}</span>{/if}
							</div>
						</div>
					{/if}
					{#if photo.aperture || photo.exposure || photo.iso || photo.focal}
						<div class="settings">
							<div class="col">
								<span class="mono s">{photo.aperture ? `f/${photo.aperture}` : '—'}</span>
								<span class="t-small t3">apertura</span>
							</div>
							<div class="col">
								<span class="mono s">{photo.exposure ? formatExposure(photo.exposure) : '—'}</span>
								<span class="t-small t3">velocidad</span>
							</div>
							<div class="col">
								<span class="mono s">{photo.iso ?? '—'}</span><span class="t-small t3">ISO</span>
							</div>
							<div class="col">
								<span class="mono s">{photo.focal ? Math.round(photo.focal) : '—'}</span>
								<span class="t-small t3">mm</span>
							</div>
						</div>
					{/if}
					<div class="kv">
						<Icon name="image" size={16} />
						<div class="col">
							<span class="mono s">{photo.name}</span>
							<span class="mono t3">
								{photo.width} × {photo.height} · {megapixels(photo)} MP · {formatDecimal(
									photo.size / 1e6
								)} MB
							</span>
						</div>
					</div>

					<div class="hr"></div>

					<div class="col section">
						<div class="row between">
							<span class="t-label">Ubicación</span>
							<button
								class="btn btn-ghost btn-sm corregir"
								class:is-on={fixing}
								onclick={() => (fixing = !fixing)}
							>
								<Icon name="pinEdit" />{fixing ? 'Cancelar' : 'Corregir'}
							</button>
						</div>
						{#if point?.lat != null && point.lng != null}
							<StaticMap
								lat={point.lat}
								lng={point.lng}
								onpick={fixing ? fixLocation : undefined}
							/>
							{#if fixing}<p class="t-small acc">Haz clic en el mapa donde se hizo la foto.</p>{/if}
							<div class="kv">
								<Icon name="pin" size={16} />
								<div class="col">
									<span class="v">{point.area ?? point.city ?? 'Lugar sin nombre'}</span>
									<span class="t-small t3"
										>{point.area && point.city
											? `${point.city}, ${countries.name(point.country)}`
											: countries.name(point.country)}</span
									>
									{#if point.estimated}
										<span class="t-small estimated"
											>Ubicación estimada con tus fotos de la misma hora</span
										>
									{/if}
								</div>
							</div>
							<div class="row coords">
								<span class="mono">{formatCoords(point.lat, point.lng)}</span>
								<button
									class="btn btn-ghost btn-icon btn-sm"
									aria-label="Copiar coordenadas"
									onclick={copyCoords}
								>
									<Icon name={copied ? 'check' : 'copy'} />
								</button>
							</div>
							{#if photo.altitude != null}
								<span class="mono t3 alt">
									Altitud {formatNumber(
										settings.units === 'km' ? photo.altitude : photo.altitude * 3.281
									)}
									{settings.units === 'km' ? 'm' : 'ft'}
								</span>
							{/if}
						{:else}
							<p class="t-small t2">
								Esta foto no tiene ubicación. Puedes colocarla desde
								<a href="/sin-ubicacion" onclick={() => ui.closeViewer()}>Sin ubicación</a>.
							</p>
						{/if}
					</div>

					{#if trips.length}
						<div class="hr"></div>
						<div class="col section">
							<span class="t-label">En viajes</span>
							<div class="row chips">
								{#each trips as trip (trip.id)}
									<a class="chip is-on" href="/viaje/{trip.id}" onclick={() => ui.closeViewer()}>
										{trip.title}
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</aside>
	{/if}
</div>

<style>
	.viewer {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: var(--scrim);
		display: flex;
		outline: none;
		animation: fade-in 0.18s ease-out;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	.stage {
		position: relative;
		flex: 1;
		min-width: 0;
	}

	/* The photo area is always dark, whatever the theme */
	.stage .btn-ghost {
		color: oklch(0.8 0.01 255);
	}

	.stage .btn-ghost:hover {
		color: #fff;
		background: oklch(1 0 0 / 0.08);
	}

	.top {
		position: absolute;
		top: 16px;
		left: 16px;
		right: 16px;
		height: 44px;
		justify-content: space-between;
		z-index: 2;
	}

	.left {
		gap: 12px;
		min-width: 0;
	}

	.name {
		font-size: 13px;
		font-weight: 500;
		color: oklch(0.96 0.005 255);
	}

	.counter {
		font-size: 11px;
		color: oklch(0.68 0.012 255);
	}

	.tools {
		gap: 2px;
	}

	.tools .sep {
		margin: 10px 6px;
		background: oklch(1 0 0 / 0.12);
	}

	.stage .fav,
	.stage .fav:hover {
		color: var(--acc);
	}

	.stage .pressed {
		background: oklch(1 0 0 / 0.1);
		color: #fff;
	}

	.picture {
		position: absolute;
		top: 84px;
		left: 96px;
		right: 96px;
		bottom: 150px;
		display: grid;
		place-items: center;
	}

	.picture img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: 4px;
		box-shadow: 0 30px 80px -20px #000;
	}

	.cannot-show {
		max-width: 420px;
		color: oklch(0.96 0.005 255);
	}

	.cannot-show p {
		color: oklch(0.75 0.012 255);
	}

	.picture img.loading {
		width: 100%;
		height: 100%;
		filter: blur(12px);
		opacity: 0.6;
	}

	.nav {
		position: absolute;
		top: calc(50% - 50px);
		width: 44px;
		height: 44px;
		border-radius: 22px;
		display: grid;
		place-items: center;
		background: oklch(0.24 0.018 258 / 0.8);
		border: 1px solid oklch(1 0 0 / 0.08);
		color: #fff;
		transition: background-color 0.15s;
	}

	.nav:hover {
		background: oklch(0.3 0.018 258 / 0.95);
	}

	.nav:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.prev {
		left: 32px;
	}

	.next {
		right: 32px;
	}

	.hints {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 112px;
		justify-content: center;
		gap: 16px;
		font-size: 11px;
		color: oklch(0.62 0.012 255);
	}

	.hints .row {
		gap: 6px;
	}

	.strip {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 28px;
		justify-content: center;
		align-items: center;
		gap: 4px;
	}

	.mini {
		width: 48px;
		height: 48px;
		border-radius: 6px;
		flex: none;
		background: var(--s3) center / cover;
		opacity: 0.55;
		transition: opacity 0.15s;
	}

	.mini:hover {
		opacity: 0.85;
	}

	.mini.on {
		width: 64px;
		height: 64px;
		opacity: 1;
		outline: 2px solid var(--acc);
		outline-offset: 2px;
	}

	.info {
		margin: 16px 16px 16px 0;
		width: 360px;
		flex: none;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.info-head {
		justify-content: space-between;
		padding: 16px 16px 8px 20px;
	}

	.info-head .t-h3 {
		font-size: 14px;
	}

	.body {
		padding: 8px 20px 20px;
		gap: 20px;
	}

	.kv {
		display: grid;
		grid-template-columns: 20px 1fr;
		gap: 2px 12px;
		align-items: start;
		color: var(--t3);
	}

	.kv :global(.i) {
		margin-top: 2px;
	}

	.v {
		font-size: 14px;
		color: var(--t1);
	}

	.s {
		font-size: 13px;
		color: var(--t1);
	}

	.settings {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--line);
		background: var(--line);
	}

	.settings .col {
		padding: 8px 10px;
		background: var(--s2);
	}

	.section {
		gap: 10px;
	}

	.between {
		justify-content: space-between;
	}

	.corregir {
		margin-right: -8px;
	}

	.coords {
		justify-content: space-between;
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--field);
		border: 1px solid var(--line);
		color: var(--t1);
	}

	.alt {
		padding-left: 2px;
	}

	.chips {
		gap: 6px;
		flex-wrap: wrap;
	}

	.chips a {
		text-decoration: none;
	}

	.phone-actions {
		display: none;
	}

	@media (max-width: 900px) {
		.tools > :not(:last-child) {
			display: none;
		}

		.picture {
			top: 76px;
			bottom: 190px;
		}

		.strip {
			bottom: 104px;
		}

		.mini {
			width: 36px;
			height: 36px;
		}

		.mini.on {
			width: 44px;
			height: 44px;
		}

		.phone-actions {
			display: flex;
			position: absolute;
			left: 0;
			right: 0;
			bottom: 16px;
			height: 72px;
			justify-content: space-around;
			padding: 0 12px;
			border-top: 1px solid oklch(1 0 0 / 0.08);
		}

		.phone-actions button {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 4px;
			min-width: 72px;
			min-height: 44px;
			font-size: 11px;
			color: oklch(0.85 0.01 255);
		}

		.phone-actions .fav {
			color: var(--acc);
		}

		.info {
			position: absolute;
			inset: auto 0 0 0;
			width: auto;
			max-height: 60%;
			margin: 0;
			border-radius: 16px 16px 0 0;
			z-index: 3;
		}

		.picture {
			left: 0;
			right: 0;
		}

		.hints,
		.nav {
			display: none;
		}
	}
	.estimated {
		margin-top: 4px;
		color: var(--warn);
	}
</style>
