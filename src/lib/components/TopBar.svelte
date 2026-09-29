<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Icon from './ui/Icon.svelte';
	import Logo from './Logo.svelte';
	import { library } from '$lib/state/library.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { pickFiles } from '$lib/photos/pick';

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

	async function importPhotos() {
		menuOpen = false;
		const files = await pickFiles();
		library.import(files);
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
			<button class="btn btn-ghost btn-icon phone-only" aria-label="Volver" onclick={goBack}>
				<Icon name="arrowL" />
			</button>
		{/if}
		<a class="logo" href="/" aria-label="Waymark, ir al globo"
			><Logo /><span class="name">Waymark</span></a
		>
		<nav class="tabs" aria-label="Secciones">
			<a class="btn btn-ghost btn-sm" class:is-on={tab === 'globo'} href="/">
				<Icon name="globe" />Globo
			</a>
			<a class="btn btn-ghost btn-sm" class:is-on={tab === 'sin'} href="/sin-ubicacion">
				<Icon name="imageOff" />Sin ubicación <span class="mono">{library.unlocated.length}</span>
			</a>
			<a class="btn btn-ghost btn-sm" class:is-on={tab === 'stats'} href="/estadisticas">
				<Icon name="chart" />Estadísticas
			</a>
		</nav>
	</div>

	<button class="search" onclick={() => (ui.searchOpen = true)} aria-label="Buscar ({modKey} K)">
		<Icon name="search" size={16} />
		<span class="placeholder">Buscar país, ciudad o viaje…</span>
		<span class="kbds"><span class="kbd">{modKey}</span><span class="kbd">K</span></span>
	</button>

	<div class="row actions">
		<button
			class="btn btn-ghost btn-icon"
			aria-label="Cambiar tema"
			onclick={() => settings.toggleTheme()}
		>
			<Icon name={settings.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
		</button>
		<button
			class="btn btn-ghost btn-icon"
			class:is-on={ui.settingsOpen}
			aria-label="Ajustes"
			onclick={() => (ui.settingsOpen = true)}
		>
			<Icon name="sliders" />
		</button>
		<button class="btn btn-secondary" onclick={importPhotos}><Icon name="upload" />Importar</button>
	</div>

	<!-- Phones: the sections and actions move into a menu -->
	<div class="phone-only menu-wrap" bind:this={menuWrap}>
		<button
			class="btn btn-ghost btn-icon"
			aria-label="Menú"
			aria-expanded={menuOpen}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<Icon name="more" />
		</button>
		{#if menuOpen}
			<div class="menu panel" role="menu">
				<a class="menu-item" role="menuitem" href="/" onclick={() => (menuOpen = false)}>
					<Icon name="globe" />Globo
				</a>
				<a
					class="menu-item"
					role="menuitem"
					href="/sin-ubicacion"
					onclick={() => (menuOpen = false)}
				>
					<Icon name="imageOff" />Sin ubicación
					<span class="mono t3 count">{library.unlocated.length}</span>
				</a>
				<a
					class="menu-item"
					role="menuitem"
					href="/estadisticas"
					onclick={() => (menuOpen = false)}
				>
					<Icon name="chart" />Estadísticas
				</a>
				<div class="hr"></div>
				<button class="menu-item" role="menuitem" onclick={importPhotos}
					><Icon name="upload" />Importar fotos</button
				>
				<button
					class="menu-item"
					role="menuitem"
					onclick={() => {
						menuOpen = false;
						ui.settingsOpen = true;
					}}><Icon name="sliders" />Ajustes</button
				>
				<button class="menu-item" role="menuitem" onclick={() => settings.toggleTheme()}>
					<Icon name={settings.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
					{settings.resolvedTheme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
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

	.placeholder {
		flex: 1;
	}

	.actions {
		justify-content: flex-end;
		gap: 6px;
	}

	@media (max-width: 1280px) {
		.search {
			width: 300px;
		}
	}

	.phone-only {
		display: none;
	}

	.menu-wrap {
		position: relative;
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

	@media (min-width: 768px) and (max-width: 1080px) {
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
