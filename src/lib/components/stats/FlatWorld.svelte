<script lang="ts">
	import { geoNaturalEarth1, geoPath } from 'd3-geo';
	import { loadCountriesLight } from '$lib/geo/data';
	import { toCountryFeatures, type CountryFeature } from '$lib/geo/countries';
	import t from '$lib/i18n/messages/stats';

	interface Props {
		visited: string[];
		dots: { lat: number; lng: number }[];
	}

	let { visited, dots }: Props = $props();
	// 0 until the box is measured: drawing 241 countries at a guessed size and
	// again at the real one would do the work twice
	let width = $state(0);
	let height = $state(0);
	let shapes = $state.raw<CountryFeature[]>([]);

	loadCountriesLight().then((topology) => (shapes = toCountryFeatures(topology)));

	const projection = $derived(
		geoNaturalEarth1().fitExtent(
			[
				[0, 4],
				[width, height - 4]
			],
			{ type: 'Sphere' }
		)
	);
	const path = $derived(geoPath(projection));
	const visitedSet = $derived(new Set(visited));
	// The shapes only change with the size; marking visited countries doesn't redraw them
	const outlines = $derived(
		width ? shapes.map((shape) => ({ iso3: shape.properties.iso3, d: path(shape) ?? '' })) : []
	);
</script>

<div class="world" bind:clientWidth={width} bind:clientHeight={height}>
	{#if width && height}
		<svg {width} {height} role="img" aria-label={t('mapLabel', { n: visited.length })}>
			<path class="sphere" d={path({ type: 'Sphere' })} />
			{#each outlines as outline (outline.iso3)}
				<path class="country" class:visited={visitedSet.has(outline.iso3)} d={outline.d} />
			{/each}
			{#each dots as dot, i (i)}
				{@const p = projection([dot.lng, dot.lat])}
				{#if p}<circle class="dot-mark" cx={p[0]} cy={p[1]} r="3.5" />{/if}
			{/each}
		</svg>
	{/if}
</div>

<style>
	.world {
		position: relative;
		flex: 1;
		margin: 4px -8px -8px;
		min-height: 0;
	}

	svg {
		position: absolute;
		inset: 0;
	}

	.sphere {
		fill: var(--ocean);
		opacity: 0.55;
	}

	.country {
		fill: var(--s3);
		stroke: color-mix(in oklab, var(--s1) 70%, transparent);
		stroke-width: 0.5;
	}

	.country.visited {
		fill: var(--acc);
	}

	.dot-mark {
		fill: var(--pin);
		stroke: var(--pin-border);
		stroke-width: 1.5;
	}
</style>
