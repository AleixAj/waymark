<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import t from '$lib/i18n/messages/sidebar';

	let { items }: { items: { label: string; href?: string }[] } = $props();
</script>

<nav class="crumbs panel row" aria-label={t('path')}>
	{#each items as item, i (i)}
		{#if item.href}
			<a class="btn btn-ghost btn-sm" href={item.href}>{item.label}</a>
			<span class="t3 row" aria-hidden="true"><Icon name="chevR" size={14} /></span>
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
		padding: 0 6px;
		gap: 2px;
		border-radius: 12px;
		z-index: 10;
		max-width: calc(100% - 490px);
		overflow: hidden;
	}

	.current {
		color: var(--t1);
		cursor: default;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
		line-height: 28px;
	}

	/* Phones: the back button in the top bar replaces it */
	@media (max-width: 767px) {
		.crumbs {
			display: none;
		}
	}
</style>
