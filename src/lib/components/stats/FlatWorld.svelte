<script lang="ts">
	import { geoNaturalEarth1, geoPath } from 'd3-geo';
	import { loadCountriesLight } from '$lib/geo/data';
	import { toCountryFeatures, type CountryFeature } from '$lib/geo/countries';

	interface Props {
		visited: string[];
		dots: { lat: number; lng: number }[];
	}

	let { visited, dots }: Props = $props();
	let width = $state(700);
	let height = $state(220);
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
</script>

<div class="world" bind:clientWidth={width} bind:clientHeight={height}>
	<svg {width} {height} role="img" aria-label="Mapa con {visited.length} países visitados">
		<path class="sphere" d={path({ type: 'Sphere' })} />
		{#each shapes as shape (shape.properties.iso3)}
			<path class="country" class:visited={visitedSet.has(shape.properties.iso3)} d={path(shape)} />
		{/each}
		{#each dots as dot, i (i)}
			{@const p = projection([dot.lng, dot.lat])}
			{#if p}<circle class="dot-mark" cx={p[0]} cy={p[1]} r="3.5" />{/if}
		{/each}
	</svg>
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
		fill: var(--acc);
		stroke: var(--bg);
		stroke-width: 1.5;
		filter: drop-shadow(0 0 4px var(--acc-glow));
	}
</style>
