<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import { ui } from '$lib/state/ui.svelte';

	let { items }: { items: { label: string; href?: string }[] } = $props();
</script>

<nav class="crumbs panel row" aria-label="Ruta">
	<button
		class="btn btn-ghost btn-icon btn-sm"
		aria-label={ui.sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}
		onclick={() => (ui.sidebarOpen = !ui.sidebarOpen)}
	>
		<Icon name="sidebar" />
	</button>
	<div class="sep"></div>
	{#each items as item, i (i)}
		{#if item.href}
			<a class="btn btn-ghost btn-sm" href={item.href}>{item.label}</a>
			<span class="t3 row"><Icon name="chevR" size={14} /></span>
		{:else}
			<span class="btn btn-sm current" aria-current="page">{item.label}</span>
		{/if}
	{/each}
</nav>

<style>
	.crumbs {
		position: absolute;
		top: 84px;
		left: 16px;
		height: 40px;
		padding: 0 6px 0 4px;
		gap: 2px;
		border-radius: 12px;
		z-index: 10;
		max-width: calc(100% - 490px);
		overflow: hidden;
	}

	.sep {
		margin: 10px 4px;
	}

	.current {
		color: var(--t1);
		cursor: default;
	}
</style>
