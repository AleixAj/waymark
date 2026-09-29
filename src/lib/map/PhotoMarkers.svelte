<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Marker } from 'maplibre-gl';
	import Supercluster from 'supercluster';
	import type { Feature, Point } from 'geojson';
	import type { LocatedPoint } from '$lib/photos/types';
	import { formatNumber, formatRange } from '$lib/library/format';
	import { ranked } from '$lib/library/trips';
	import { ui } from '$lib/state/ui.svelte';
	import { loadThumbUrl, thumbUrl } from '$lib/state/thumbs.svelte';
	import { mapView } from './view.svelte';

	interface Props {
		points: LocatedPoint[];
		/** Show city names under the clusters (country and trip views) */
		labels?: boolean;
		/** Photos the viewer should browse when a marker is opened */
		context?: string;
	}

	let { points, labels = true, context = '' }: Props = $props();

	type Props_ = { id: string; city: string | null; country: string | null; takenAt: number };
	type ClusterProps = { cluster: true; cluster_id: number; point_count: number };
	type ClusterItem = Feature<Point, ClusterProps>;
	type Item = Feature<Point, Props_> | ClusterItem;

	interface Entry {
		marker: Marker;
		el: HTMLElement;
		html: string;
		/** Latest data of this marker: event handlers read it here, never a stale copy */
		item: Item;
	}

	// Below this zoom photos are amber circles; above it they become thumbnails
	const PHOTO_ZOOM = 11;
	const LABEL_ZOOM = 3.5;
	// Seen from far away a place is just a dot: the number of photos appears closer
	const COUNT_ZOOM = 4;
	// Extra area around the view where markers are already created (share of the view)
	const MARGIN = 0.15;

	const map = mapView.map!;

	// Clustering index, rebuilt only when the list of photos changes
	const index = $derived.by(() => {
		const sc = new Supercluster<Props_>({ radius: 56, maxZoom: 16 });
		sc.load(
			points.map((p) => ({
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
				properties: { id: p.id, city: p.city, country: p.country, takenAt: p.takenAt }
			}))
		);
		return sc;
	});

	const markers = new Map<string, Entry>();
	// Label of each cluster doesn't change while the index is the same,
	// so it is computed once instead of on every animation frame
	let labelCache = new Map<string, string>();

	let preview = $state<{
		key: string;
		lng: number;
		lat: number;
		ids: string[];
		title: string;
		meta: string;
		count: number;
	} | null>(null);
	let tick = $state(0);

	function keyOf(item: Item) {
		return isCluster(item) ? `c${item.properties.cluster_id}` : `p${item.properties.id}`;
	}

	function isCluster(item: Item): item is ClusterItem {
		return 'cluster' in item.properties && item.properties.cluster === true;
	}

	function leaves(item: Item, limit = Infinity): Props_[] {
		if (!isCluster(item)) return [item.properties];
		return index.getLeaves(item.properties.cluster_id, limit).map((l) => l.properties);
	}

	function labelOf(item: Item, key: string) {
		let label = labelCache.get(key);
		if (label === undefined) {
			label = placeLabel(leaves(item));
			labelCache.set(key, label);
		}
		return label;
	}

	/** "Kioto · Osaka" when two cities share the cluster */
	function placeLabel(items: Props_[]) {
		const cities = ranked(items, (p) => p.city);
		if (cities.length === 0) return '';
		if (cities.length === 1) return cities[0];
		const second = items.filter((p) => p.city === cities[1]).length;
		return second / items.length > 0.25 ? `${cities[0]} · ${cities[1]}` : cities[0];
	}

	function clusterSize(count: number) {
		return Math.round(24 + Math.sqrt(count) * 0.72);
	}

	/** Dot for a place seen from far away: a bit bigger with more photos */
	function dotSize(count: number) {
		return Math.round(Math.min(26, 11 + Math.sqrt(count) * 0.9));
	}

	// Where the clusters were last asked for. While the camera stays close to it,
	// the same markers are still right (MapLibre moves them by itself), so the
	// clusters are only asked again for a new zoom level or after a long pan.
	let lastQuery: { zoom: number; center: [number, number]; mode: string } | null = null;
	// Measuring the canvas forces the browser to lay out the page: done on resize only
	let size = { width: map.getCanvas().clientWidth, height: map.getCanvas().clientHeight };

	function needsQuery(zoom: number, mode: string) {
		if (!lastQuery || lastQuery.zoom !== Math.floor(zoom) || lastQuery.mode !== mode) return true;
		// At low zoom every cluster of the world is asked at once
		if (zoom < 4) return false;
		const then = map.project(lastQuery.center);
		return (
			Math.abs(then.x - size.width / 2) > size.width * MARGIN * 0.66 ||
			Math.abs(then.y - size.height / 2) > size.height * MARGIN * 0.66
		);
	}

	function render(force = false) {
		const zoom = map.getZoom();
		const photoMode = zoom >= PHOTO_ZOOM;
		const showLabels = labels && zoom >= LABEL_ZOOM && !photoMode;
		const showCount = zoom >= COUNT_ZOOM;
		const mode = `${photoMode}${showLabels}${showCount}`;
		if (!force && !needsQuery(zoom, mode)) {
			tick++;
			return;
		}
		const center = map.getCenter();
		lastQuery = { zoom: Math.floor(zoom), center: [center.lng, center.lat], mode };

		const bounds = map.getBounds();
		// On the globe the visible area can wrap around, so at low zoom we ask for everything.
		// Closer, a small margin around the view, so a short pan finds markers ready
		// (a bigger one means many more markers for MapLibre to move every frame).
		const w = bounds.getEast() - bounds.getWest();
		const h = bounds.getNorth() - bounds.getSouth();
		const bbox: [number, number, number, number] =
			zoom < 4
				? [-180, -85, 180, 85]
				: [
						bounds.getWest() - w * MARGIN,
						Math.max(-85, bounds.getSouth() - h * MARGIN),
						bounds.getEast() + w * MARGIN,
						Math.min(85, bounds.getNorth() + h * MARGIN)
					];
		const items = index.getClusters(bbox, Math.floor(zoom)) as Item[];
		const seen = new Set<string>();

		for (const item of items) {
			const key = keyOf(item);
			seen.add(key);
			const count = isCluster(item) ? item.properties.point_count : 1;
			const [lng, lat] = item.geometry.coordinates;
			const firstId = photoMode ? (leaves(item, 1)[0]?.id ?? '') : '';
			const label = showLabels ? labelOf(item, key) : '';
			const html = markerHtml(count, photoMode, label, firstId, showCount);

			const existing = markers.get(key);
			if (existing) {
				existing.item = item;
				existing.marker.setLngLat([lng, lat]);
				if (existing.html !== html) {
					existing.el.innerHTML = html;
					existing.html = html;
					// The new HTML has an empty image: fill it again
					if (photoMode) showThumb(existing.el, firstId);
				}
				continue;
			}

			const el = document.createElement('button');
			el.className = 'wm-marker';
			el.innerHTML = html;
			el.setAttribute('aria-label', label ? `${label}, ${count} fotos` : `${count} fotos`);
			const entry: Entry = {
				el,
				html,
				item,
				marker: new Marker({ element: el, opacityWhenCovered: 0, subpixelPositioning: true })
					.setLngLat([lng, lat])
					.addTo(map)
			};
			el.addEventListener('click', (e) => {
				// Stop the click here, or the map would also open the country below
				e.stopPropagation();
				preview = null;
				open(entry.item);
			});
			el.addEventListener('mouseenter', () => showPreview(entry.item, key));
			el.addEventListener('mouseleave', () => (preview = null));
			markers.set(key, entry);
			if (photoMode) showThumb(el, firstId);
		}

		for (const [key, entry] of markers) {
			if (!seen.has(key)) {
				entry.marker.remove();
				markers.delete(key);
				// A marker removed under the mouse never gets its mouseleave
				if (preview?.key === key) preview = null;
			}
		}
		highlightHovered();
		tick++;
	}

	function markerHtml(
		count: number,
		photoMode: boolean,
		label: string,
		firstId: string,
		showCount: boolean
	) {
		const labelHtml = label ? `<span class="mk-label">${escapeHtml(label)}</span>` : '';
		if (photoMode) {
			const badge = count > 1 ? `<span class="badge">${formatNumber(count)}</span>` : '';
			return `<span class="pm" data-thumb="${escapeHtml(firstId)}"><img alt="" /></span>${badge}`;
		}
		if (count === 1) return `<span class="dot"></span>${labelHtml}`;
		if (!showCount) {
			const size = dotSize(count);
			return `<span class="place" style="width:${size}px;height:${size}px"></span>${labelHtml}`;
		}
		const size = clusterSize(count);
		const small = count > 999 ? ' big-number' : '';
		return `<span class="cluster${small}" style="width:${size}px;height:${size}px">${formatNumber(count)}</span>${labelHtml}`;
	}

	/** Puts the thumbnail in the marker, using the shared cache (no URL is created twice) */
	async function showThumb(el: HTMLElement, id: string) {
		if (!id) return;
		const url = thumbUrl(id) ?? (await loadThumbUrl(id));
		const img = el.querySelector<HTMLImageElement>(`[data-thumb="${CSS.escape(id)}"] img`);
		if (url && img) img.src = url;
	}

	function open(item: Item) {
		const zoom = map.getZoom();
		if (isCluster(item) && zoom < 15) {
			const target = Math.min(index.getClusterExpansionZoom(item.properties.cluster_id), 17);
			mapView.flyTo(item.geometry.coordinates as [number, number], target);
			return;
		}
		// Single photo, or photos taken at the same spot: open the viewer
		const ids = leaves(item).map((l) => l.id);
		ui.openViewer(ids, ids[0], context);
	}

	function showPreview(item: Item, key: string) {
		if (map.getZoom() >= PHOTO_ZOOM) return;
		const items = leaves(item).sort((a, b) => a.takenAt - b.takenAt);
		const places = new Set(items.map((p) => p.city)).size;
		const [lng, lat] = item.geometry.coordinates;
		// Three photos spread across the cluster make a nicer stack
		const pick = [0, Math.floor(items.length / 2), items.length - 1].map((i) => items[i].id);
		preview = {
			key,
			lng,
			lat,
			ids: [...new Set(pick)],
			title: placeLabel(items) || 'Fotos',
			count: items.length,
			meta: `${formatRange(items[0].takenAt, items[items.length - 1].takenAt)} · ${places} ${places === 1 ? 'lugar' : 'lugares'}`
		};
	}

	function escapeHtml(text: string) {
		return text.replace(
			/[&<>"]/g,
			(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!
		);
	}

	function highlightHovered() {
		const id = ui.hoveredPhoto;
		for (const { el } of markers.values()) {
			const pm = el.querySelector('.pm');
			pm?.classList.toggle('is-hover', !!id && pm.getAttribute('data-thumb') === id);
		}
	}

	// Re-render when the photos or the label setting change (import, timeline filter, page)
	$effect(() => {
		void index;
		void labels;
		labelCache = new Map();
		// render() also writes state (tick), so it must not become a dependency
		untrack(() => render(true));
	});

	// Highlight the marker of the photo hovered in a list
	$effect(() => {
		void ui.hoveredPhoto;
		untrack(highlightHovered);
	});

	onMount(() => {
		let frame = 0;
		const schedule = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => render());
		};
		const resize = () => {
			size = { width: map.getCanvas().clientWidth, height: map.getCanvas().clientHeight };
			render(true);
		};
		map.on('move', schedule);
		map.on('resize', resize);
		return () => {
			map.off('move', schedule);
			map.off('resize', resize);
			cancelAnimationFrame(frame);
			for (const { marker } of markers.values()) marker.remove();
			markers.clear();
		};
	});

	const previewPos = $derived.by(() => {
		void tick;
		if (!preview) return null;
		const p = map.project([preview.lng, preview.lat]);
		return { x: p.x, y: p.y };
	});
</script>

{#if preview && previewPos}
	<div class="preview panel" style:left="{previewPos.x - 106}px" style:top="{previewPos.y - 178}px">
		<div class="stack">
			{#each preview.ids as id, i (id)}
				<span
					class="ph s{i}"
					style:background-image={thumbUrl(id) ? `url(${thumbUrl(id)})` : undefined}
				></span>
			{/each}
		</div>
		<div class="row between">
			<span class="title">{preview.title}</span>
			<span class="mono t3 small">{formatNumber(preview.count)} fotos</span>
		</div>
		<div class="mono t3 small">{preview.meta}</div>
	</div>
{/if}

<style>
	/* Markers are created by hand (not by Svelte), so their styles are global */
	/* No `position` here: MapLibre positions the marker element itself */
	:global(.wm-marker) {
		display: grid;
		place-items: center;
		padding: 0;
		background: none;
		border: 0;
		cursor: pointer;
	}

	:global(.wm-marker .cluster) {
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--pin);
		color: var(--on-pin);
		border: 2px solid var(--pin-border);
		font:
			600 12px/1 'Geist Mono',
			monospace;
		letter-spacing: -0.02em;
		box-shadow:
			0 0 0 4px var(--pin-soft),
			0 6px 18px -6px var(--pin-glow);
		transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	/* A single photo: same look as the groups, just small */
	:global(.wm-marker .dot) {
		width: 12px;
		height: 12px;
		background: var(--pin);
		border: 2px solid var(--pin-border);
		box-shadow:
			0 0 0 3px var(--pin-soft),
			0 2px 8px var(--pin-glow);
	}

	/* A place seen from the whole world: amber dot with a soft ring, no number */
	:global(.wm-marker .place) {
		display: block;
		border-radius: 50%;
		background: var(--pin);
		border: 2px solid var(--pin-border);
		box-shadow:
			0 0 0 3px var(--pin-soft),
			0 2px 10px var(--pin-glow);
		transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	:global(.wm-marker:hover .place),
	:global(.wm-marker:focus-visible .place) {
		transform: scale(1.25);
	}

	:global(.wm-marker .cluster.big-number) {
		font-size: 11px;
	}

	:global(.wm-marker:hover .cluster),
	:global(.wm-marker:focus-visible .cluster) {
		transform: scale(1.12);
		box-shadow:
			0 0 0 5px var(--pin-soft),
			0 0 0 10px color-mix(in oklab, var(--pin) 8%, transparent),
			0 0 28px var(--pin-glow);
	}

	:global(.wm-marker .mk-label) {
		position: absolute;
		left: 50%;
		top: 100%;
		margin-top: 8px;
		transform: translateX(-50%);
		font-size: 12px;
		font-weight: 500;
		color: var(--t1);
		white-space: nowrap;
		pointer-events: none;
		text-shadow:
			0 1px 3px var(--bg),
			0 0 8px var(--bg);
	}

	:global(.wm-marker .pm) {
		display: block;
		width: 44px;
		height: 44px;
		border-radius: 10px;
		border: 2px solid var(--pm-border);
		overflow: hidden;
		box-shadow: 0 6px 16px -4px oklch(0 0 0 / 0.5);
		background: var(--s2);
		transition:
			transform 0.18s,
			border-color 0.18s;
	}

	:global(.wm-marker .pm img:not([src])) {
		visibility: hidden;
	}

	:global(.wm-marker .pm img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	:global(.wm-marker:hover .pm),
	:global(.wm-marker .pm.is-hover) {
		transform: scale(1.08);
		border-color: var(--pin);
	}

	.preview {
		position: absolute;
		z-index: 5;
		width: 212px;
		padding: 10px;
		border-radius: 12px;
		pointer-events: none;
	}

	.stack {
		position: relative;
		height: 96px;
	}

	.stack .ph {
		position: absolute;
		top: 10px;
		width: 88px;
		height: 80px;
		border-radius: 8px;
		background: var(--s3) center / cover;
		box-shadow: 0 4px 12px #0006;
	}

	.stack .s0 {
		left: 56px;
		top: 4px;
		width: 96px;
		height: 86px;
		z-index: 2;
		border: 1.5px solid var(--pm-border);
	}

	.stack .s1 {
		left: 22px;
		transform: rotate(-7deg);
	}

	.stack .s2 {
		left: 96px;
		transform: rotate(6deg);
	}

	.between {
		justify-content: space-between;
		margin-top: 8px;
		padding: 0 2px;
	}

	.title {
		font-size: 13px;
		font-weight: 550;
	}

	.small {
		font-size: 11px;
		padding: 0 2px;
	}
</style>
