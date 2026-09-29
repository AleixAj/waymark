<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import Logo from './Logo.svelte';
	import { library } from '$lib/state/library.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import AccountButton from './AccountButton.svelte';
	import ServiceMark from './ui/ServiceMark.svelte';
	import { importFromDevice, importFromDrive } from '$lib/state/importing';
	import { ui } from '$lib/state/ui.svelte';
	import { auth } from '$lib/google/auth.svelte';
	import { drivePickerEnabled, googleEnabled } from '$lib/google/config';
	import { signIn } from '$lib/sync/sync.svelte';

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

	let busy = $state(false);
	let error = $state<string | null>(null);

	function choose(folder: boolean) {
		importFromDevice(folder);
	}

	/** Drive needs the Google account: signing in comes first when there is none */
	async function fromDrive() {
		error = null;
		busy = true;
		try {
			if (!auth.signedIn) await signIn();
			await importFromDrive();
		} catch (e) {
			error = e instanceof Error ? e.message : 'No se pudo abrir Google Drive';
		} finally {
			busy = false;
		}
	}
</script>

<div class="shade" aria-hidden="true"></div>

<div class="row top">
	<div class="logo"><Logo />Waymark</div>
	<div class="row actions">
		<button
			class="btn btn-ghost btn-icon"
			aria-label="Cambiar tema"
			onclick={() => settings.toggleTheme()}
		>
			<Icon name={settings.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
		</button>
		<span class="btn btn-ghost lang">Español</span>
		<AccountButton />
	</div>
</div>

<main class="col welcome">
	<h1 class="wordmark">Waymark</h1>
	<p class="t2 tagline">Tus fotos, donde las hiciste</p>

	<div class="drop panel col">
		<div class="dashed" aria-hidden="true"></div>
		<div class="icon"><Icon name="upload" /></div>
		<p class="t-h3 title">Arrastra aquí tus fotos o carpetas</p>
		<p class="t-small t3">
			JPG, HEIC, RAW y más. Leemos la ubicación GPS de cada foto para colocarla en el globo.
		</p>
		<div class="choices">
			<button class="btn btn-primary btn-lg" onclick={() => choose(false)}
				><Icon name="image" />Elegir fotos</button
			>
			<button class="btn btn-secondary btn-lg" onclick={() => choose(true)}
				><Icon name="folder" />Elegir carpeta</button
			>
			<div class="row t-small t3 or" aria-hidden="true">o importa desde</div>
			{#if drivePickerEnabled}
				<button class="btn btn-secondary btn-lg" disabled={busy} onclick={fromDrive}
					><ServiceMark service="drive" />Google Drive</button
				>
			{/if}
			<button
				class="btn btn-secondary btn-lg"
				class:wide={!drivePickerEnabled}
				onclick={() => ui.openImport('takeout')}
				><ServiceMark service="photos" />Google Fotos</button
			>
		</div>
		{#if error}<p class="t-small err" role="alert">{error}</p>{/if}
	</div>

	<p class="row t2 privacy">
		<Icon name="lock" size={16} />
		{#if auth.signedIn}
			Todo se procesa en este navegador y se guarda una copia ligera en tu Drive.
		{:else if googleEnabled}
			Todo se procesa en este navegador. Entra con Google para verlas en todos tus dispositivos.
		{:else}
			Tus fotos no salen de tu dispositivo. Todo se procesa en este navegador.
		{/if}
	</p>
	<button class="demo" onclick={() => library.loadDemo()}>Probar con fotos de ejemplo</button>
</main>

<div class="row mono t3 bottom">
	<span>v1.0 · funciona sin conexión</span>
	<span class="row hint">
		<span class="kbds"
			><span class="kbd">{isMac ? '⌘' : 'Ctrl'}</span><span class="kbd">O</span></span
		> abrir fotos
	</span>
</div>

<style>
	/* Darkens the middle of the globe so the text stays readable */
	.shade {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 46% 52% at 50% 52%,
			oklch(0.155 0.022 258 / 0.55),
			transparent 70%
		);
		pointer-events: none;
		z-index: 1;
	}

	:global([data-theme='light']) .shade {
		background: radial-gradient(
			ellipse 46% 52% at 50% 52%,
			oklch(0.965 0.004 250 / 0.6),
			transparent 70%
		);
	}

	.top {
		position: absolute;
		top: 28px;
		left: 32px;
		right: 32px;
		justify-content: space-between;
		z-index: 2;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 9px;
		font-family: 'Instrument Serif', Georgia, serif;
		font-style: italic;
		font-size: 24px;
		line-height: 1;
	}

	.actions {
		gap: 6px;
	}

	.lang {
		cursor: default;
	}

	.welcome {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(600px, calc(100% - 32px));
		align-items: center;
		text-align: center;
		z-index: 2;
	}

	.wordmark {
		font-size: clamp(64px, 12vw, 112px);
		line-height: 0.93;
	}

	.tagline {
		font-size: 18px;
		line-height: 26px;
		margin-top: 10px;
	}

	.drop {
		margin-top: 40px;
		width: 100%;
		padding: 36px 32px 32px;
		align-items: center;
		position: relative;
	}

	.dashed {
		position: absolute;
		inset: 8px;
		border: 1.5px dashed var(--line-strong);
		border-radius: 10px;
		pointer-events: none;
	}

	.icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		background: var(--acc-soft);
		color: var(--acc-text);
	}

	.title {
		margin-top: 16px;
		margin-bottom: 6px;
		font-size: 17px;
		white-space: normal;
	}

	/* Four buttons of the same size: this device on top, Google below */
	.choices {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		width: min(400px, 100%);
		margin-top: 22px;
	}

	.choices .btn {
		justify-content: center;
		position: relative;
		z-index: 1;
	}

	.choices .wide {
		grid-column: 1 / -1;
	}

	/* "o importa desde" between two lines */
	.or {
		grid-column: 1 / -1;
		gap: 12px;
		margin: 6px 0 2px;
	}

	.or::before,
	.or::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--line-strong);
	}

	.err {
		margin-top: 12px;
		color: var(--err);
	}

	.privacy {
		gap: 8px;
		margin-top: 22px;
		font-size: 13px;
	}

	.demo {
		margin-top: 14px;
		font-size: 13px;
		font-weight: 500;
		color: var(--acc-text);
	}

	.demo:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.bottom {
		position: absolute;
		bottom: 24px;
		left: 32px;
		right: 32px;
		justify-content: space-between;
		font-size: 11px;
		z-index: 2;
	}

	.hint {
		gap: 6px;
	}

	@media (max-width: 640px) {
		.drop {
			padding: 28px 20px 24px;
		}

		.bottom .hint {
			display: none;
		}
	}
</style>
