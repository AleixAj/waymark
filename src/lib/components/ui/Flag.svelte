<script lang="ts">
	// Every flag is its own small file; Vite only downloads the ones we show
	const flags = import.meta.glob('/node_modules/country-flag-icons/3x2/*.svg', {
		query: '?url',
		import: 'default'
	}) as Record<string, () => Promise<string>>;

	let { iso2, name = '', width = 28 }: { iso2: string; name?: string; width?: number } = $props();

	let url = $state<string>();
	$effect(() => {
		const load = flags[`/node_modules/country-flag-icons/3x2/${iso2.toUpperCase()}.svg`];
		url = undefined;
		load?.().then((u) => (url = u));
	});
</script>

<span class="flag" style:width="{width}px" style:height="{(width * 2) / 3}px">
	{#if url}<img src={url} alt={name ? `Bandera de ${name}` : ''} />{/if}
</span>

<style>
	.flag {
		display: inline-block;
		flex: none;
		border-radius: 3px;
		overflow: hidden;
		background: var(--s3);
		box-shadow: 0 0 0 1px var(--line-strong);
	}

	img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}
</style>
