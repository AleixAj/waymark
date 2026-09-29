<script lang="ts">
	import { page } from '$app/state';
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

	async function importPhotos() {
		const files = await pickFiles();
		library.import(files);
	}
</script>

<header class="topbar panel">
	<div class="row">
		<a class="logo" href="/" aria-label="Waymark, ir al globo"><Logo />Waymark</a>
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

	@media (max-width: 1080px) {
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
