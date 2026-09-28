<script lang="ts">
	import { onMount } from 'svelte';
	import GlobeMap from '$lib/map/GlobeMap.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import ImportProgress from '$lib/components/ImportProgress.svelte';
	import { library } from '$lib/photos/library.svelte';

	const format = new Intl.NumberFormat('es-ES');

	onMount(() => {
		library.load();
	});
</script>

<main>
	<GlobeMap points={library.points} />

	<header class="topbar">
		<strong class="logo">Waymark</strong>
		{#if library.loaded}
			<span class="count">{format.format(library.points.length)} fotos</span>
		{/if}
		<DropZone onFiles={(files) => library.import(files)} />
	</header>

	{#if library.progress}
		<ImportProgress progress={library.progress} />
	{/if}
</main>

<style>
	main {
		position: fixed;
		inset: 0;
		overflow: hidden;
	}

	.topbar {
		position: absolute;
		top: 16px;
		left: 16px;
		right: 16px;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px 8px 8px 16px;
		border: 1px solid var(--border);
		border-radius: var(--radius-panel);
		background: var(--surface);
		backdrop-filter: blur(16px);
	}

	.logo {
		font-size: 16px;
		letter-spacing: -0.01em;
	}

	.count {
		margin-right: auto;
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--text-muted);
	}
</style>
