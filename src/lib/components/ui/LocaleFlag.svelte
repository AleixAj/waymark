<script lang="ts">
	import Flag from './Flag.svelte';
	import type { Locale } from '$lib/i18n/i18n.svelte';

	let { locale }: { locale: Locale } = $props();

	// Spain and the United Kingdom; Catalan is drawn below
	const COUNTRY: Record<Exclude<Locale, 'ca'>, string> = { es: 'ES', en: 'GB' };
</script>

{#if locale === 'ca'}
	<!-- The Catalan flag is not a country flag: four red stripes on yellow -->
	<svg class="senyera" viewBox="0 0 9 6" aria-hidden="true">
		<rect width="9" height="6" fill="#FCDD09" />
		<path d="M0 .667h9M0 2h9M0 3.333h9M0 4.667h9" stroke="#DA121A" stroke-width=".667" />
	</svg>
{:else}
	<Flag iso2={COUNTRY[locale]} width={20} />
{/if}

<style>
	.senyera {
		width: 20px;
		height: 13.33px;
		flex: none;
		border-radius: 3px;
		box-shadow: 0 0 0 1px var(--line-strong);
	}
</style>
