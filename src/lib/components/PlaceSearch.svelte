<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './ui/Icon.svelte';
	import { searchPlaces, type FoundPlace } from '$lib/geo/geocode';
	import t from '$lib/i18n/messages/search';

	let { onchoose }: { onchoose: (place: FoundPlace) => void } = $props();

	let text = $state('');
	let results = $state<FoundPlace[]>([]);
	let active = $state(0);
	let searching = $state(false);
	let input: HTMLInputElement;

	// Searches after a short pause in typing (OpenStreetMap allows one search per second)
	$effect(() => {
		const query = text;
		if (query.trim().length < 2) {
			results = [];
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			searching = true;
			try {
				results = await searchPlaces(query, controller.signal);
				active = 0;
			} catch {
				// Replaced by a newer search
			} finally {
				if (!controller.signal.aborted) searching = false;
			}
		}, 600);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	function onKey(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = Math.min(active + 1, results.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = Math.max(active - 1, 0);
		} else if (event.key === 'Enter' && results[active]) {
			event.preventDefault();
			onchoose(results[active]);
		}
	}

	onMount(() => input.focus());
</script>

<div class="place-search">
	<label class="row field">
		<Icon name="search" size={16} />
		<input
			bind:this={input}
			bind:value={text}
			onkeydown={onKey}
			placeholder={t('placePlaceholder')}
			aria-label={t('placeLabel')}
		/>
		{#if searching}<span class="spinner" aria-hidden="true"></span>{/if}
	</label>
	{#if results.length}
		<ul class="results panel" role="listbox" aria-label={t('found')}>
			{#each results as place, i (i)}
				<li role="option" aria-selected={i === active}>
					<button class:is-on={i === active} onclick={() => onchoose(place)}>
						<Icon name="pin" size={16} />
						<span class="col">
							<span class="name">{place.name}</span>
							<span class="t-small t3">{place.detail}</span>
						</span>
					</button>
				</li>
			{/each}
			<li class="credit t3">{t('credit')}</li>
		</ul>
	{/if}
</div>

<style>
	.place-search {
		position: relative;
		width: 100%;
	}

	.field {
		gap: 8px;
		height: 34px;
		padding: 0 10px;
		border-radius: 8px;
		background: var(--field);
		border: 1px solid var(--line-strong);
		color: var(--t3);
	}

	.field:focus-within {
		border-color: var(--acc);
	}

	input {
		flex: 1;
		min-width: 0;
		background: none;
		border: 0;
		outline: none;
		color: var(--t1);
		font: inherit;
		font-size: 13px;
	}

	.results {
		position: absolute;
		z-index: 5;
		left: 0;
		right: 0;
		top: calc(100% + 6px);
		margin: 0;
		padding: 4px;
		list-style: none;
		background: var(--glass-strong);
		max-height: 300px;
		overflow-y: auto;
	}

	.results button {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 7px 8px;
		border-radius: 6px;
		text-align: left;
		color: var(--t2);
	}

	.results button:hover,
	.results button.is-on {
		background: var(--hover);
		color: var(--t1);
	}

	.name {
		color: var(--t1);
		font-size: 13px;
	}

	.credit {
		padding: 6px 8px 2px;
		font-size: 10px;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid var(--line-strong);
		border-top-color: var(--acc);
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
