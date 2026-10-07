<script lang="ts">
	import { crossfade } from './ui/reveal';
	import LocaleFlag from './ui/LocaleFlag.svelte';
	import Icon from './ui/Icon.svelte';
	import { i18n, LOCALES, translator, type Locale } from '$lib/i18n/i18n.svelte';

	const t = translator({
		es: { label: 'Idioma: {name}', choose: 'Elegir idioma' },
		en: { label: 'Language: {name}', choose: 'Choose language' },
		ca: { label: 'Idioma: {name}', choose: 'Triar idioma' }
	});

	let open = $state(false);
	let wrap = $state<HTMLDivElement>();
	const current = $derived(LOCALES.find((l) => l.id === i18n.locale) ?? LOCALES[0]);

	function choose(locale: Locale) {
		crossfade(() => i18n.set(locale));
		open = false;
	}

	function closeOnOutside(event: PointerEvent) {
		if (open && !wrap?.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window
	onpointerdown={closeOnOutside}
	onkeydown={(e) => {
		if (e.key === 'Escape') open = false;
	}}
/>

<div class="wrap" bind:this={wrap}>
	<button
		class="btn btn-ghost current"
		aria-label={t('label', { name: current.name })}
		aria-haspopup="menu"
		aria-expanded={open}
		title={t('choose')}
		onclick={() => (open = !open)}
	>
		<LocaleFlag locale={current.id} /><span class="short">{current.short}</span>
	</button>

	{#if open}
		<div class="menu panel" role="menu" aria-label={t('choose')}>
			{#each LOCALES as locale (locale.id)}
				<button
					class="menu-item option"
					class:is-on={locale.id === i18n.locale}
					role="menuitemradio"
					aria-checked={locale.id === i18n.locale}
					lang={locale.id}
					onclick={() => choose(locale.id)}
				>
					<LocaleFlag locale={locale.id} />
					<span class="name">{locale.name}</span>
					{#if locale.id === i18n.locale}<Icon name="check" size={16} />{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
	}

	.current {
		gap: 7px;
		padding: 0 10px;
	}

	.short {
		font:
			600 12px/1 'Geist Mono',
			monospace;
		letter-spacing: 0.02em;
	}

	.menu {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 40;
		width: 180px;
		background: var(--glass-strong);
	}

	.option {
		height: 36px;
	}

	.option .name {
		flex: 1;
		text-align: left;
	}

	/* The chosen language, outlined in amber like the language pills of the README */
	.option.is-on {
		background: var(--acc-soft);
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--acc) 45%, transparent);
	}

	.option :global(.i) {
		color: var(--acc-text);
	}
</style>
