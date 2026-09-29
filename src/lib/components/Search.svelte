<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Icon from './ui/Icon.svelte';
	import { focusTrap } from './ui/focusTrap';
	import { library } from '$lib/state/library.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { formatNumber, formatRange } from '$lib/library/format';

	interface Result {
		group: string;
		label: string;
		detail: string;
		icon: 'route' | 'globe' | 'pin';
		run: () => void;
	}

	let query = $state('');
	let active = $state(0);
	let input: HTMLInputElement;
	let showAllCountries = $state(false);

	/** Accents and case don't matter: "japon" finds "Japón" */
	function normalize(text: string) {
		return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
	}

	// "34.99, 135.78" pasted in the search box
	const coords = $derived.by(() => {
		const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/);
		if (!match) return null;
		const lat = Number(match[1]);
		const lng = Number(match[2]);
		return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
	});

	const results = $derived.by((): Result[] => {
		const q = normalize(query.trim());
		const list: Result[] = [];
		if (coords) {
			list.push({
				group: 'Coordenadas',
				label: `${coords.lat}, ${coords.lng}`,
				detail: 'Ir a este punto',
				icon: 'pin',
				run: () => {
					goto('/');
					setTimeout(() => mapView.flyTo([coords.lng, coords.lat], 12), 50);
				}
			});
			return list;
		}

		const visitedCount = new Map(library.countryList.map((c) => [c.iso3, c.count]));
		const trips = library.trips
			.filter((t) => !q || normalize(t.title).includes(q))
			.slice(0, q ? 6 : 4);
		for (const trip of trips) {
			list.push({
				group: 'Viajes',
				label: trip.title,
				detail: `${formatRange(trip.start, trip.end)} · ${formatNumber(trip.photoIds.length)} fotos`,
				icon: 'route',
				run: () => goto(`/viaje/${trip.id}`)
			});
		}

		const countryMatches = countries.list
			.filter((c) =>
				q
					? normalize(c.name).includes(q) || c.iso3.toLowerCase() === q
					: showAllCountries || visitedCount.has(c.iso3)
			)
			.sort(
				(a, b) =>
					(visitedCount.get(b.iso3) ?? 0) - (visitedCount.get(a.iso3) ?? 0) ||
					a.name.localeCompare(b.name)
			)
			.slice(0, showAllCountries ? 300 : 6);
		for (const c of countryMatches) {
			const count = visitedCount.get(c.iso3);
			list.push({
				group: 'Países',
				label: c.name,
				detail: count ? `${formatNumber(count)} fotos` : 'Sin fotos',
				icon: 'globe',
				run: () => goto(`/pais/${c.iso3}`)
			});
		}

		if (q) {
			const cities = library.cityList.filter((c) => normalize(c.city).includes(q)).slice(0, 6);
			for (const c of cities) {
				list.push({
					group: 'Ciudades',
					label: c.city,
					detail: `${countries.name(c.country)} · ${formatNumber(c.count)} fotos`,
					icon: 'pin',
					run: () => goto(`/lugar/${c.country}/${encodeURIComponent(c.city)}`)
				});
			}
		}
		return list;
	});

	// Keep the highlighted row inside the list when it changes
	$effect(() => {
		void results;
		active = 0;
	});

	function choose(result: Result) {
		ui.searchOpen = false;
		ui.closeViewer();
		result.run();
	}

	function onKey(event: KeyboardEvent) {
		// Keys used here must not reach the viewer or other dialogs underneath
		if (['Escape', 'ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) event.stopPropagation();
		if (event.isComposing) return;
		if (event.key === 'Escape') {
			ui.searchOpen = false;
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = Math.min(results.length - 1, active + 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = Math.max(0, active - 1);
		} else if (event.key === 'Enter' && results[active]) {
			choose(results[active]);
		}
	}

	onMount(() => requestAnimationFrame(() => input.focus()));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={() => (ui.searchOpen = false)}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="palette panel"
		role="dialog"
		use:focusTrap
		tabindex="-1"
		aria-modal="true"
		aria-label="Buscar"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="row field">
			<span class="t3"><Icon name="search" /></span>
			<input
				bind:this={input}
				bind:value={query}
				onkeydown={onKey}
				placeholder="Buscar país, ciudad o viaje…"
				aria-label="Buscar"
				role="combobox"
				aria-expanded={results.length > 0}
				aria-controls="search-results"
				aria-activedescendant={results.length ? `result-${active}` : undefined}
			/>
			<span class="kbd">Esc</span>
		</div>

		{#if results.length}
			<ul class="scroll results" id="search-results" role="listbox">
				{#each results as result, i (result.group + result.label)}
					{#if i === 0 || results[i - 1].group !== result.group}
						<li class="group t-label" role="presentation">{result.group}</li>
					{/if}
					<li
						id="result-{i}"
						class="row item"
						class:on={i === active}
						role="option"
						aria-selected={i === active}
						onmouseenter={() => (active = i)}
						onclick={() => choose(result)}
					>
						<span class="icon"><Icon name={result.icon} size={16} /></span>
						<span class="label">{result.label}</span>
						<span class="mono t3 detail">{result.detail}</span>
					</li>
				{/each}
			</ul>
			<div class="row foot mono t3">
				<span class="row"><span class="kbd">↑</span><span class="kbd">↓</span> moverse</span>
				<span class="row"><span class="kbd">↵</span> abrir</span>
			</div>
		{:else}
			<div class="empty none">
				<svg class="ill" viewBox="0 0 72 72" aria-hidden="true">
					<circle cx="32" cy="32" r="18" /><path d="M45 45l14 14" /><path class="a" d="M25 32h14" />
				</svg>
				<h3>Ningún lugar coincide con «{query}»</h3>
				<p>Busca por país, ciudad o nombre de viaje. También puedes pegar unas coordenadas.</p>
				<div class="row buttons">
					<button
						class="btn btn-secondary btn-sm"
						onclick={() => {
							query = '';
							showAllCountries = true;
						}}>Ver todos los países</button
					>
					<button class="btn btn-ghost btn-sm" onclick={() => (query = '')}>Borrar búsqueda</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 70;
		background: oklch(0.1 0.02 258 / 0.35);
		animation: fade 0.12s ease-out;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.palette {
		position: absolute;
		left: 50%;
		top: 84px;
		transform: translateX(-50%);
		width: min(560px, calc(100% - 32px));
		max-height: min(560px, calc(100% - 120px));
		display: flex;
		flex-direction: column;
		border-radius: 14px;
		overflow: hidden;
		background: var(--glass-strong);
	}

	.field {
		gap: 10px;
		padding: 0 12px;
		height: 52px;
		border-bottom: 1px solid var(--line);
		flex: none;
	}

	.field input {
		flex: 1;
		font-size: 15px;
		caret-color: var(--acc);
	}

	.results {
		list-style: none;
		padding: 6px;
	}

	.group {
		padding: 10px 8px 4px;
	}

	.item {
		gap: 10px;
		height: 38px;
		padding: 0 8px;
		border-radius: 8px;
		cursor: pointer;
	}

	.item.on {
		background: var(--acc-soft);
	}

	.icon {
		color: var(--t3);
	}

	.item.on .icon {
		color: var(--acc-text);
	}

	.label {
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.detail {
		margin-left: auto;
		font-size: 11px;
		white-space: nowrap;
	}

	.foot {
		gap: 16px;
		padding: 8px 14px;
		border-top: 1px solid var(--line);
		font-size: 11px;
		flex: none;
	}

	.foot .row {
		gap: 6px;
	}

	.none {
		padding: 28px 32px;
	}

	.buttons {
		gap: 8px;
		margin-top: 18px;
	}
</style>
