<script lang="ts">
	import Thumb from '$lib/components/photos/Thumb.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import PlaceSearch from '$lib/components/PlaceSearch.svelte';
	import type { FoundPlace } from '$lib/geo/geocode';
	import { untrack } from 'svelte';
	import { sheet } from '$lib/components/ui/sheet';
	import { library } from '$lib/state/library.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { thumbUrl } from '$lib/state/thumbs.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { getCameras } from '$lib/photos/db';
	import { placeAt } from '$lib/photos/placeFinder';
	import { groupBy } from '$lib/library/trips';
	import { formatMonthLong, formatNumber, monthKey } from '$lib/library/format';

	// Photos from Google Takeout or folders are grouped by album first
	let groupMode = $state<'album' | 'fecha' | 'camara'>(
		untrack(() => (library.unlocated.some((p) => p.album) ? 'album' : 'fecha'))
	);
	let selected = $state<string[]>([]);
	// Albums start closed: a click opens one to see its photos
	let openAlbums = $state<string[]>([]);
	const collapsible = $derived(groupMode === 'album');

	function toggleAlbum(key: string) {
		openAlbums = openAlbums.includes(key)
			? openAlbums.filter((k) => k !== key)
			: [...openAlbums, key];
	}
	let cameras = $state<Map<string, string>>(new Map());
	let dropLabel = $state<{ x: number; y: number; text: string } | null>(null);
	let toast = $state<{ text: string; href: string } | null>(null);

	const photos = $derived(library.unlocated);
	const years = $derived.by(() => {
		if (!photos.length) return '';
		const first = new Date(photos[0].takenAt).getFullYear();
		const last = new Date(photos[photos.length - 1].takenAt).getFullYear();
		return first === last ? `${first}` : `${first} – ${last}`;
	});

	// Camera names are not in the light points, so we read them once for this view
	// (one database call; if the list changes meanwhile, the old answer is ignored)
	$effect(() => {
		const ids = photos.map((p) => p.id);
		let current = true;
		getCameras(ids).then((found) => {
			if (!current) return;
			cameras = new Map(ids.map((id) => [id, found.get(id) ?? 'Cámara desconocida']));
		});
		return () => (current = false);
	});

	const groups = $derived.by(() => {
		const newestFirst = [...photos].reverse();
		if (groupMode === 'album') {
			return [...groupBy(newestFirst, (p) => p.album ?? '').entries()]
				.map(([name, items]) => ({ key: name, title: name || 'Sin álbum', items }))
				.sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1));
		}
		if (groupMode === 'camara') {
			return [
				...groupBy(newestFirst, (p) => cameras.get(p.id) ?? 'Cámara desconocida').entries()
			].map(([name, items]) => ({ key: name, title: name, items }));
		}
		return [...groupBy(newestFirst, (p) => monthKey(p.takenAt)).values()].map((items) => ({
			key: monthKey(items[0].takenAt),
			title: formatMonthLong(items[0].takenAt),
			items
		}));
	});

	$effect(() => {
		mapView.focus = null;
		mapView.route = null;
		mapView.points = null;
		mapView.labels = true;
		mapView.padding = { top: 90, bottom: 40, left: 700, right: 70 };
	});

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
	}

	async function place(ids: string[], lat: number, lng: number, iso2?: string) {
		const spot = await placeAt(lat, lng, iso2);
		await library.assignLocation(ids, spot);
		selected = selected.filter((id) => !ids.includes(id));
		const where = [spot.city, countries.name(spot.country)].filter(Boolean).join(', ') || 'el mapa';
		toast = {
			text: `${ids.length === 1 ? '1 foto ubicada' : `${ids.length} fotos ubicadas`} en ${where}`,
			href: spot.country ? `/pais/${spot.country}` : '/'
		};
		setTimeout(() => (toast = null), 5000);
	}

	// Drag and drop onto the globe
	let dragImage: HTMLDivElement;

	function onDragStart(event: DragEvent, id: string) {
		const ids = selected.includes(id) ? selected : [id];
		ui.dragging = ids;
		event.dataTransfer?.setData('text/plain', ids.join(','));
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
		// Custom preview: stacked thumbnails with a counter, like the design
		event.dataTransfer?.setDragImage(dragImage, 20, 20);
	}

	// The map may not exist yet when the page opens from a link, so we wait for it
	$effect(() => {
		const map = mapView.map;
		if (!map) return;
		const container = map.getContainer();
		let lastLookup = 0;

		const over = (event: DragEvent) => {
			if (!ui.dragging) return;
			event.preventDefault();
			const rect = container.getBoundingClientRect();
			const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top];
			const lngLat = map.unproject(point);
			// Place names are looked up at most 10 times per second
			if (Date.now() - lastLookup < 100) {
				if (dropLabel) dropLabel = { ...dropLabel, x: event.clientX, y: event.clientY };
				return;
			}
			lastLookup = Date.now();
			placeAt(lngLat.lat, lngLat.lng).then((spot) => {
				// The drag may have ended while the name was being looked up
				if (!ui.dragging) return;
				mapView.focus = spot.country;
				const name = [countries.name(spot.country), spot.city].filter(Boolean).join(' · ');
				dropLabel = {
					x: event.clientX,
					y: event.clientY,
					text: name ? `Soltar en ${name}` : 'Soltar aquí'
				};
			});
		};

		const drop = (event: DragEvent) => {
			if (!ui.dragging) return;
			event.preventDefault();
			const rect = container.getBoundingClientRect();
			const lngLat = map.unproject([event.clientX - rect.left, event.clientY - rect.top]);
			place(ui.dragging, lngLat.lat, lngLat.lng);
			endDrag();
		};

		// "Asignar ubicación…": the next click on the map places the photos
		const click = (event: { lngLat: { lat: number; lng: number } }) => {
			if (!ui.placing) return;
			place(ui.placing, event.lngLat.lat, event.lngLat.lng);
			ui.placing = null;
		};

		// Leaving the map (back to the list) hides the "drop here" label
		const leave = (event: DragEvent) => {
			if (!container.contains(event.relatedTarget as Node)) {
				dropLabel = null;
				mapView.focus = null;
			}
		};

		container.addEventListener('dragover', over);
		container.addEventListener('dragleave', leave);
		container.addEventListener('drop', drop);
		map.on('click', click);
		return () => {
			container.removeEventListener('dragover', over);
			container.removeEventListener('dragleave', leave);
			container.removeEventListener('drop', drop);
			map.off('click', click);
			ui.placing = null;
			endDrag();
		};
	});

	function endDrag() {
		ui.dragging = null;
		dropLabel = null;
		mapView.focus = null;
	}

	/** A place chosen in the search: the camera goes there and the photos are placed */
	function placeFound(found: FoundPlace) {
		if (!ui.placing) return;
		place(ui.placing, found.lat, found.lng, found.country);
		ui.placing = null;
		mapView.flyTo([found.lng, found.lat], 9);
	}

	function photoCount(n: number) {
		return n === 1 ? '1 foto' : `${formatNumber(n)} fotos`;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && ui.placing) ui.placing = null;
	}

	const dragIds = $derived((ui.dragging ?? selected).slice(0, 3));
</script>

<svelte:head><title>Sin ubicación · Waymark</title></svelte:head>
<svelte:window onkeydown={onKey} ondragend={endDrag} />

<section class="unlocated panel" aria-label="Fotos sin ubicación" use:sheet={'half'}>
	<div class="head">
		<div class="row between top">
			<div>
				<h1 class="t-h2">Fotos sin ubicación</h1>
				<p class="mono t3 sub">{photoCount(photos.length)}{years ? ` · ${years}` : ''}</p>
			</div>
			<div class="seg" role="radiogroup" aria-label="Agrupar">
				<button
					class:is-on={groupMode === 'album'}
					role="radio"
					aria-checked={groupMode === 'album'}
					onclick={() => (groupMode = 'album')}>Por álbum</button
				>
				<button
					class:is-on={groupMode === 'fecha'}
					role="radio"
					aria-checked={groupMode === 'fecha'}
					onclick={() => (groupMode = 'fecha')}>Por fecha</button
				>
				<button
					class:is-on={groupMode === 'camara'}
					role="radio"
					aria-checked={groupMode === 'camara'}
					onclick={() => (groupMode = 'camara')}>Por cámara</button
				>
			</div>
		</div>
		<div class="row note">
			<span class="t2 note-icon"><Icon name="info" /></span>
			<p class="t2">
				Estas fotos no guardan datos GPS, y tampoco hay fotos con GPS de la misma hora para
				estimarlo. Es normal en fotos de WhatsApp o de cámaras con la ubicación desactivada. Usa
				<b>Ubicar todas</b> en un álbum, o arrastra las fotos al globo.
			</p>
		</div>
	</div>

	{#if selected.length}
		<div class="row selection">
			<span class="row count"><span class="mono acc">{selected.length}</span>seleccionadas</span>
			<div class="row sel-actions">
				<button class="btn btn-ghost btn-sm" onclick={() => (selected = [])}>Deseleccionar</button>
				<button class="btn btn-secondary btn-sm" onclick={() => (ui.placing = [...selected])}>
					<Icon name="pin" />Asignar ubicación…
				</button>
			</div>
		</div>
	{/if}

	<div class="scroll list">
		{#each groups as group (group.key)}
			{@const open = !collapsible || openAlbums.includes(group.key)}
			<section class="group" class:closed={!open}>
				<div class="day-h">
					{#if collapsible}
						<button
							class="row album-toggle"
							aria-expanded={open}
							onclick={() => toggleAlbum(group.key)}
						>
							<span class="chev" class:open><Icon name="chevR" size={16} /></span>
							<b>{group.title}</b>
							<span class="mono count-label">{photoCount(group.items.length)}</span>
							{#if !open}
								<span class="row peek" aria-hidden="true">
									{#each group.items.slice(0, 3) as photo (photo.id)}
										<span
											class="peek-thumb"
											style:background-image={thumbUrl(photo.id)
												? `url(${thumbUrl(photo.id)})`
												: undefined}
										></span>
									{/each}
								</span>
							{/if}
						</button>
					{:else}
						<b>{group.title}</b><span class="mono">{photoCount(group.items.length)}</span>
					{/if}
					<button
						class="btn btn-ghost btn-sm place-all"
						onclick={() => (ui.placing = group.items.map((p) => p.id))}
						><Icon name="pin" />Ubicar todas</button
					>
				</div>
				{#if open}
					<div class="pgrid">
						{#each group.items as photo (photo.id)}
							<Thumb
								id={photo.id}
								checkable
								selected={selected.includes(photo.id)}
								label="Seleccionar foto"
								onclick={() => toggle(photo.id)}
								ondragstart={(e) => onDragStart(e, photo.id)}
							/>
						{/each}
					</div>
				{/if}
			</section>
		{:else}
			<div class="empty done">
				<svg class="ill" viewBox="0 0 72 72" aria-hidden="true">
					<circle cx="36" cy="36" r="22" /><path class="a" d="M26 36l7 7 13-14" />
				</svg>
				<h3>Todas tus fotos tienen ubicación</h3>
				<p>Cuando importes fotos sin GPS aparecerán aquí para que las coloques en el globo.</p>
			</div>
		{/each}
	</div>
</section>

<MapControls style="bottom: 16px" />

{#if ui.placing}
	<div class="placing panel col" role="status">
		<div class="row placing-head">
			<span class="dot sm ringed"></span>
			<span class="placing-text"
				>Busca dónde se hicieron {ui.placing.length === 1
					? 'la foto'
					: `las ${ui.placing.length} fotos`}, o haz clic en el globo</span
			>
			<button class="btn btn-ghost btn-sm" onclick={() => (ui.placing = null)}
				>Cancelar <span class="kbd">Esc</span></button
			>
		</div>
		<PlaceSearch onchoose={placeFound} />
	</div>
{/if}

{#if dropLabel}
	<div class="tip drop-tip" style:left="{dropLabel.x - 60}px" style:top="{dropLabel.y - 76}px">
		<Icon name="pin" size={16} />{dropLabel.text}
	</div>
{/if}

{#if toast}
	<div class="toast" role="status">
		<span class="ok"><Icon name="checkCircle" /></span>
		{toast.text}
		<a class="btn btn-ghost btn-sm" href={toast.href}>Ver</a>
	</div>
{/if}

<!-- Hidden element used as the drag preview -->
<div class="drag-image" bind:this={dragImage} aria-hidden="true">
	{#each dragIds as id, i (id)}
		<span class="d d{i}" style:background-image={thumbUrl(id) ? `url(${thumbUrl(id)})` : undefined}
		></span>
	{/each}
	<span class="badge">{(ui.dragging ?? selected).length || 1}</span>
</div>

<style>
	.head {
		padding: 20px 20px 16px;
	}

	.between {
		justify-content: space-between;
	}

	.top {
		align-items: flex-start;
	}

	.sub {
		margin-top: 4px;
	}

	.note {
		gap: 12px;
		margin-top: 16px;
		padding: 12px 14px;
		border-radius: 10px;
		background: var(--field);
		border: 1px solid var(--line);
		align-items: flex-start;
	}

	.note-icon {
		margin-top: 1px;
	}

	.note p {
		font-size: 13px;
		line-height: 19px;
		text-wrap: pretty;
	}

	.note b {
		font-weight: 500;
		color: var(--t1);
	}

	.selection {
		justify-content: space-between;
		padding: 8px 12px 8px 20px;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
		background: var(--acc-soft);
	}

	.count {
		gap: 10px;
		font-size: 13px;
	}

	.count .mono {
		font-size: 13px;
	}

	.sel-actions {
		gap: 4px;
	}

	.list {
		padding-bottom: 16px;
	}

	.pgrid {
		padding: 0 20px 14px;
		grid-template-columns: repeat(6, 1fr);
	}

	.done {
		padding: 60px 20px;
	}

	.placing {
		position: absolute;
		top: 84px;
		left: calc(50% + 180px);
		transform: translateX(-50%);
		z-index: 20;
		gap: 10px;
		width: min(460px, calc(100% - 32px));
		padding: 8px 8px 10px 14px;
		font-size: 13px;
		border-radius: 12px;
	}

	.placing-head {
		gap: 10px;
	}

	.placing-text {
		flex: 1;
	}

	/* Title and count together, the button on the right */
	.group .day-h {
		justify-content: flex-start;
		align-items: center;
		gap: 10px;
	}

	.album-toggle {
		flex: 1;
		min-width: 0;
		gap: 10px;
		padding: 0;
		text-align: left;
		color: var(--t1);
	}

	.album-toggle b {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count-label {
		flex: none;
		color: var(--acc-text);
	}

	.chev {
		display: inline-flex;
		color: var(--t3);
		transition: transform 0.15s;
	}

	.chev.open {
		transform: rotate(90deg);
	}

	/* Three small photos so a closed album is recognised at a glance */
	.peek {
		flex: none;
		margin-left: 4px;
	}

	.peek-thumb {
		width: 26px;
		height: 26px;
		border-radius: 5px;
		background: var(--s3) center / cover;
		border: 2px solid var(--s1);
	}

	.peek-thumb + .peek-thumb {
		margin-left: -8px;
	}

	.group.closed {
		border-bottom: 1px solid var(--line);
	}

	.place-all {
		margin-left: auto;
		height: 26px;
	}

	.drop-tip {
		position: fixed;
		z-index: 80;
		pointer-events: none;
		background: var(--acc);
		color: var(--on-acc);
		padding: 8px 10px;
	}

	.toast {
		position: absolute;
		left: calc(50% + 180px);
		bottom: 24px;
		transform: translateX(-50%);
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 8px 8px 14px;
		border-radius: 12px;
		background: var(--s2);
		border: 1px solid var(--line);
		box-shadow: var(--shadow);
		font-size: 13px;
	}

	.ok {
		color: var(--ok);
		display: flex;
	}

	.drag-image {
		position: fixed;
		left: -1000px;
		top: 0;
		width: 90px;
		height: 90px;
	}

	.d {
		position: absolute;
		left: 8px;
		top: 8px;
		width: 72px;
		height: 72px;
		border-radius: 8px;
		background: var(--s3) center / cover;
		box-shadow: 0 6px 16px #0008;
	}

	.d0 {
		border: 2px solid var(--pm-border);
		z-index: 3;
	}

	.d1 {
		transform: rotate(5deg);
		z-index: 2;
	}

	.d2 {
		transform: rotate(-8deg) translate(-4px, 4px);
	}

	.drag-image .badge {
		top: 0;
		right: 2px;
		z-index: 4;
	}

	@media (max-width: 1100px) {
		.pgrid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
