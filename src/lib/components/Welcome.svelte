<script lang="ts">
	// Display face only for the big title (the font file downloads only on this screen)
	import '@fontsource-variable/fraunces/wght-italic.css';
	import Icon from './ui/Icon.svelte';
	import Logo from './Logo.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import AccountButton from './AccountButton.svelte';
	import ServiceMark from './ui/ServiceMark.svelte';
	import { importFromDevice, importFromDrive } from '$lib/state/importing';
	import { ui } from '$lib/state/ui.svelte';
	import { auth } from '$lib/google/auth.svelte';
	import { drivePickerEnabled, googleEnabled } from '$lib/google/config';
	import { signIn, sync } from '$lib/sync/sync.svelte';
	import GoogleMark from './ui/GoogleMark.svelte';
	import { enterDemo } from '$lib/state/mode';

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

	let busy = $state(false);
	let error = $state<string | null>(null);

	// Without an account there are two ways in: your own album (Google) or the demo
	const gate = $derived(googleEnabled && !auth.signedIn);
	// Right after signing in, the album is looked for in Drive before offering to import
	const looking = $derived(auth.signedIn && sync.status === 'syncing');
	const firstName = $derived(auth.account?.name.split(' ')[0] ?? '');

	async function enter() {
		error = null;
		busy = true;
		try {
			await signIn();
		} catch (e) {
			error = e instanceof Error ? e.message : 'No se pudo entrar con Google';
		} finally {
			busy = false;
		}
	}

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

<header class="row top">
	<div class="logo"><Logo />Waymark</div>
	<div class="row actions">
		<button
			class="btn btn-ghost btn-icon"
			aria-label="Cambiar tema"
			onclick={() => settings.toggleTheme()}
		>
			<Icon name={settings.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
		</button>
		{#if auth.signedIn}<AccountButton />{/if}
	</div>
</header>

<main class="col welcome">
	<h1 class="wordmark">Waymark</h1>
	<p class="t2 tagline">Tus fotos, donde las hiciste</p>

	{#if gate}
		<div class="gate panel col">
			<p class="t-h3 title">Tu álbum de viajes, sobre el globo</p>
			<p class="t-small t2 lead">
				Entra con tu cuenta de Google para crear tu álbum y verlo en todos tus dispositivos.
			</p>
			<div class="col ways">
				<button class="btn btn-lg google" disabled={busy} onclick={enter}
					><GoogleMark />{busy ? 'Abriendo Google…' : 'Continuar con Google'}</button
				>
				<div class="row t-small t3 or" aria-hidden="true">o</div>
				<button class="btn btn-secondary btn-lg" onclick={enterDemo}
					><Icon name="play" />Ver la demo</button
				>
				<p class="t-small t3">600 fotos reales de 15 viajes, sin registrarte.</p>
			</div>
			{#if error}<p class="t-small err" role="alert">{error}</p>{/if}
		</div>
		<ul class="row features">
			<li class="row"><Icon name="globe" size={16} />Cada foto en su lugar</li>
			<li class="row"><Icon name="route" size={16} />Viajes detectados solos</li>
			<li class="row"><Icon name="chart" size={16} />Tus estadísticas</li>
		</ul>
	{:else if looking}
		<div class="gate panel col" role="status">
			<span class="spinner" aria-hidden="true"></span>
			<p class="t-h3 title">Buscando tu álbum…</p>
			<p class="t-small t2 lead">Miramos si ya tienes fotos guardadas en tu Google Drive.</p>
		</div>
	{:else}
		<div class="drop panel col">
			<div class="dashed" aria-hidden="true"></div>
			<div class="icon"><Icon name="upload" /></div>
			<p class="t-h3 title">
				{firstName ? `Hola, ${firstName}. ` : ''}Arrastra aquí tus fotos o carpetas
			</p>
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
			{:else}
				Tus fotos no salen de tu dispositivo. Todo se procesa en este navegador.
			{/if}
		</p>
		<button class="demo" onclick={enterDemo}
			><Icon name="play" size={14} />Probar con fotos de ejemplo</button
		>
	{/if}
</main>

<footer class="row mono t3 bottom">
	<span class="row legal"
		>v1.0 · <a href="/privacidad" data-sveltekit-reload>Privacidad</a> ·
		<a href="/terminos" data-sveltekit-reload>Condiciones</a></span
	>
	{#if !gate}<span class="row hint">
			<span class="kbds"
				><span class="kbd">{isMac ? '⌘' : 'Ctrl'}</span><span class="kbd">O</span></span
			> abrir fotos
		</span>{/if}
</footer>

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

	/* The big title: a heavy italic serif outlined like an amber neon sign.
	   It lights up with a short flicker when the page opens. */
	.wordmark {
		font-family: 'Fraunces Variable', 'Instrument Serif', Georgia, serif;
		font-style: italic;
		font-weight: 800;
		font-size: clamp(76px, 15vw, 168px);
		line-height: 0.9;
		letter-spacing: -0.035em;
		padding: 0 0.08em;
		color: oklch(0.97 0.03 85);
		-webkit-text-stroke: 2px oklch(0.8 0.17 58);
		paint-order: stroke fill;
		text-shadow:
			0 0 6px oklch(0.8 0.17 58 / 0.9),
			0 0 22px oklch(0.75 0.19 50 / 0.65),
			0 0 60px oklch(0.7 0.2 45 / 0.45);
	}

	/* More specific than the fade-in of the other items, so this one flickers instead */
	.welcome > .wordmark {
		animation: neon-on 1.4s 0.2s ease-out both;
	}

	:global([data-theme='light']) .wordmark {
		color: oklch(0.99 0.01 85);
		-webkit-text-stroke-color: oklch(0.68 0.18 50);
		text-shadow:
			0 0 4px oklch(0.72 0.18 50 / 0.9),
			0 0 18px oklch(0.72 0.18 50 / 0.5),
			0 2px 30px oklch(0.6 0.18 45 / 0.35);
	}

	@keyframes neon-on {
		0% {
			opacity: 0;
		}

		10% {
			opacity: 0.8;
		}

		14% {
			opacity: 0.15;
		}

		22% {
			opacity: 1;
		}

		26% {
			opacity: 0.4;
		}

		34%,
		100% {
			opacity: 1;
		}
	}

	.tagline {
		font-size: 18px;
		line-height: 26px;
		margin-top: clamp(14px, 2.4vw, 28px);
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

	/* Sign in or demo: the two ways in, one above the other */
	.gate {
		margin-top: 40px;
		width: min(440px, 100%);
		padding: 32px 32px 28px;
		align-items: center;
	}

	.gate .title {
		margin-top: 0;
	}

	.lead {
		max-width: 320px;
		text-wrap: pretty;
	}

	.ways {
		width: min(320px, 100%);
		gap: 10px;
		margin-top: 24px;
	}

	.ways .btn {
		width: 100%;
	}

	.ways .or {
		gap: 12px;
		margin: 2px 0;
	}

	/* Google's own look: white button with the coloured G */
	.google {
		background: #fff;
		color: #1f1f1f;
		border-color: oklch(0.3 0.02 255 / 0.18);
		box-shadow: 0 1px 2px oklch(0 0 0 / 0.12);
	}

	.google:hover {
		background: #f3f5f8;
	}

	.features {
		list-style: none;
		gap: 20px;
		margin-top: 22px;
		flex-wrap: wrap;
		justify-content: center;
		font-size: 13px;
		color: var(--t2);
	}

	.features li {
		gap: 7px;
	}

	.features :global(.i) {
		color: var(--acc-text);
	}

	.spinner {
		width: 28px;
		height: 28px;
		margin-bottom: 14px;
		border-radius: 50%;
		border: 2.5px solid var(--acc-soft);
		border-top-color: var(--acc);
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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

	/* The quickest way to see the app: a pill that stands out without competing
	   with the import buttons */
	.demo {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 16px;
		height: 36px;
		padding: 0 16px 0 12px;
		border-radius: 999px;
		border: 1px solid color-mix(in oklab, var(--acc) 40%, transparent);
		background: var(--acc-soft);
		font-size: 13px;
		font-weight: 550;
		color: var(--acc-text);
		transition:
			background-color var(--dur-fast),
			transform var(--dur) var(--ease-spring);
	}

	.demo:hover {
		background: color-mix(in oklab, var(--acc) 24%, transparent);
		transform: translateY(-1px);
	}

	.demo:active {
		transform: scale(0.97);
	}

	/* Everything arrives in order: name, tagline, import card, then the rest */
	.welcome > * {
		animation: item-in 0.6s var(--ease-out) both;
	}

	.welcome > :nth-child(2) {
		animation-delay: 0.08s;
	}

	.welcome > :nth-child(3) {
		animation-delay: 0.16s;
	}

	.welcome > :nth-child(n + 4) {
		animation-delay: 0.26s;
	}

	.top,
	.bottom {
		animation: fade-in 0.8s 0.3s ease-out both;
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

	.legal {
		gap: 6px;
	}

	.legal a {
		color: var(--t3);
	}

	.legal a:hover {
		color: var(--t1);
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
