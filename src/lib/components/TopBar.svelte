<script lang="ts">
	import { revealTheme } from './ui/reveal';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Icon from './ui/Icon.svelte';
	import Logo from './Logo.svelte';
	import { library } from '$lib/state/library.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import AccountButton from './AccountButton.svelte';
	import LanguagePicker from './LanguagePicker.svelte';
	import { demoMode, enterDemo, exitDemo } from '$lib/state/mode';
	import { canImport } from '$lib/state/importing';
	import { signIn } from '$lib/sync/sync.svelte';
	import t from '$lib/i18n/messages/topbar';
	import tc from '$lib/i18n/messages/common';

	const path = $derived(page.url.pathname);
	const tab = $derived(
		path.startsWith('/sin-ubicacion') ? 'sin' : path.startsWith('/estadisticas') ? 'stats' : 'globo'
	);
	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
	const modKey = isMac ? '⌘' : 'Ctrl';

	let menuOpen = $state(false);
	let menuWrap = $state<HTMLDivElement>();

	// The menu closes when the page changes
	$effect(() => {
		void path;
		menuOpen = false;
	});

	/** Back inside the app; opened from a link there is no "back", so go to the globe */
	function goBack() {
		if (ui.inAppNavigations > 0) history.back();
		else goto('/');
	}

	function closeOnOutside(event: PointerEvent) {
		if (menuOpen && !menuWrap?.contains(event.target as Node)) menuOpen = false;
	}

	// Importing needs the Google account: signing in comes first when there is none
	async function importPhotos() {
		menuOpen = false;
		if (!canImport()) {
			try {
				await signIn();
			} catch {
				return;
			}
		}
		ui.openImport();
	}
</script>

<svelte:window
	onpointerdown={closeOnOutside}
	onkeydown={(e) => {
		if (e.key === 'Escape') menuOpen = false;
	}}
/>

<header class="topbar panel">
	<div class="row">
		{#if path !== '/'}
			<button class="btn btn-ghost btn-icon phone-only" aria-label={tc('back')} onclick={goBack}>
				<Icon name="arrowL" />
			</button>
		{/if}
		<a class="logo" href="/" aria-label={t('home')}><Logo /><span class="name">Waymark</span></a>
		<nav class="tabs" aria-label={t('sections')}>
			<a
				class="btn btn-ghost btn-sm"
				class:is-on={tab === 'globo'}
				aria-current={tab === 'globo' ? 'page' : undefined}
				href="/"
				title={tc('globe')}
			>
				<Icon name="globe" /><span class="label">{tc('globe')}</span>
			</a>
			<a
				class="btn btn-ghost btn-sm"
				class:is-on={tab === 'sin'}
				aria-current={tab === 'sin' ? 'page' : undefined}
				href="/sin-ubicacion"
				title={tc('unlocated')}
			>
				<Icon name="imageOff" /><span class="label">{tc('unlocated')}</span>
				<span class="mono">{library.unlocated.length}</span>
			</a>
			<a
				class="btn btn-ghost btn-sm"
				class:is-on={tab === 'stats'}
				aria-current={tab === 'stats' ? 'page' : undefined}
				href="/estadisticas"
				title={tc('stats')}
			>
				<Icon name="chart" /><span class="label">{tc('stats')}</span>
			</a>
		</nav>
	</div>

	<button
		class="search"
		onclick={() => (ui.searchOpen = true)}
		aria-label={t('search', { key: modKey })}
	>
		<Icon name="search" size={16} />
		<span class="placeholder">{t('searchPlaceholder')}</span>
		<span class="kbds"><span class="kbd">{modKey}</span><span class="kbd">K</span></span>
	</button>

	<div class="row actions">
		<LanguagePicker />
		<button
			class="btn btn-ghost btn-icon"
			aria-label={t('theme')}
			onclick={(e) => revealTheme(() => settings.toggleTheme(), e)}
		>
			<Icon name={settings.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
		</button>
		<button
			class="btn btn-ghost btn-icon"
			class:is-on={ui.settingsOpen}
			aria-label={t('settings')}
			onclick={() => (ui.settingsOpen = true)}
		>
			<Icon name="sliders" />
		</button>
		{#if demoMode}
			<button class="demo-pill" onclick={exitDemo} title={t('demoNote')} aria-label={t('exitDemo')}
				>{tc('demo')}<Icon name="x" size={14} /></button
			>
		{:else}
			<button class="btn btn-ghost demo-btn" onclick={enterDemo} title={t('seeDemoTitle')}
				><Icon name="play" /><span class="label">{t('seeDemo')}</span></button
			>
		{/if}
		<!-- The demo is only for looking: your own photos go in your own album -->
		{#if !demoMode}
			<button class="btn btn-secondary" onclick={importPhotos} title={t('importPhotos')}
				><Icon name="upload" /><span class="label">{t('import')}</span></button
			>
		{/if}
		<AccountButton />
	</div>

	<!-- Phones: the sections and actions move into a menu -->
	<div class="phone-only menu-wrap" bind:this={menuWrap}>
		<AccountButton />
		<button
			class="btn btn-ghost btn-icon"
			aria-label={t('menu')}
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<Icon name="more" />
		</button>
		{#if menuOpen}
			<div class="menu panel" role="menu">
				<a class="menu-item" role="menuitem" href="/" onclick={() => (menuOpen = false)}>
					<Icon name="globe" />{tc('globe')}
				</a>
				<a
					class="menu-item"
					role="menuitem"
					href="/sin-ubicacion"
					onclick={() => (menuOpen = false)}
				>
					<Icon name="imageOff" />{tc('unlocated')}
					<span class="mono t3 count">{library.unlocated.length}</span>
				</a>
				<a
					class="menu-item"
					role="menuitem"
					href="/estadisticas"
					onclick={() => (menuOpen = false)}
				>
					<Icon name="chart" />{tc('stats')}
				</a>
				<div class="hr"></div>
				{#if !demoMode}
					<button class="menu-item" role="menuitem" onclick={importPhotos}
						><Icon name="upload" />{t('importPhotos')}</button
					>
				{/if}
				<button class="menu-item" role="menuitem" onclick={demoMode ? exitDemo : enterDemo}
					><Icon name="play" />{demoMode ? t('exitDemo') : t('seeDemo')}</button
				>
				<button
					class="menu-item"
					role="menuitem"
					onclick={() => {
						menuOpen = false;
						ui.settingsOpen = true;
					}}><Icon name="sliders" />{t('settings')}</button
				>
				<button
					class="menu-item"
					role="menuitem"
					onclick={(e) => revealTheme(() => settings.toggleTheme(), e)}
				>
					<Icon name={settings.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
					{settings.resolvedTheme === 'dark' ? t('lightTheme') : t('darkTheme')}
				</button>
			</div>
		{/if}
	</div>
</header>

<style>
	.topbar {
		position: absolute;
		top: 16px;
		left: 16px;
		right: 16px;
		height: 56px;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 12px;
		padding: 0 10px 0 14px;
		z-index: 20;
		border-radius: 14px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 9px;
		font-family: 'Instrument Serif', Georgia, serif;
		font-style: italic;
		font-size: 24px;
		line-height: 1;
		letter-spacing: -0.01em;
		color: var(--t1);
		text-decoration: none;
	}

	.tabs {
		display: flex;
		gap: 2px;
		margin-left: 20px;
	}

	.tabs .btn {
		height: 32px;
		padding: 0 10px;
	}

	.tabs .btn .mono {
		font-size: 11px;
		color: var(--t3);
	}

	.tabs .btn.is-on {
		color: var(--acc-text);
		background: var(--acc-soft);
	}

	.tabs .btn.is-on .mono {
		color: var(--acc-text);
	}

	.search {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 440px;
		height: 36px;
		padding: 0 6px 0 12px;
		border-radius: 8px;
		background: var(--field);
		border: 1px solid var(--line);
		color: var(--t3);
		font-size: 13px;
		text-align: left;
		transition: border-color 0.15s;
	}

	.search:hover {
		border-color: var(--line-strong);
	}

	/* Always one line: longer languages end in "…" instead of wrapping */
	.placeholder {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: left;
	}

	.actions {
		justify-content: flex-end;
		gap: 6px;
	}

	@media (max-width: 1400px) {
		.search {
			width: 300px;
		}
	}

	.phone-only {
		display: none;
	}

	.menu-wrap {
		position: relative;
		align-items: center;
		gap: 4px;
	}

	.menu {
		position: absolute;
		top: 44px;
		right: 0;
		z-index: 30;
		background: var(--glass-strong);
	}

	.menu a.menu-item {
		text-decoration: none;
	}

	.count {
		margin-left: auto;
	}

	/* Always clear that these are sample photos, not the user's */
	.demo-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 8px 0 12px;
		cursor: pointer;
		border-radius: 999px;
		background: var(--acc-soft);
		border: 1px solid color-mix(in oklab, var(--acc) 45%, transparent);
		color: var(--acc-text);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.demo-pill:hover {
		background: color-mix(in oklab, var(--acc) 25%, transparent);
	}

	/* Tablets: tabs and buttons keep only their icons */
	@media (min-width: 768px) and (max-width: 1000px) {
		.tabs .label,
		.actions .label {
			display: none;
		}

		.tabs {
			margin-left: 8px;
		}
	}

	/* Medium screens: the demo button keeps only its icon */
	@media (max-width: 1360px) {
		.demo-btn .label {
			display: none;
		}
	}

	/* Phones: back button, logo mark, search and a menu */
	@media (max-width: 767px) {
		.topbar {
			top: 8px;
			left: 8px;
			right: 8px;
			height: 52px;
			grid-template-columns: auto 1fr auto;
			padding: 0 6px 0 8px;
		}

		.tabs,
		.actions,
		.logo .name {
			display: none;
		}

		.phone-only {
			display: inline-flex;
		}

		.search {
			width: 100%;
		}

		.search .placeholder {
			display: block;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.search .kbds {
			display: none;
		}
	}

	@media (min-width: 768px) and (max-width: 1200px) {
		.search .placeholder,
		.search .kbds {
			display: none;
		}

		.search {
			width: 36px;
			padding: 0 9px;
		}
	}
</style>
