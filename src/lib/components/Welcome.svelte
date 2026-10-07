<script lang="ts">
	import { revealTheme } from './ui/reveal';
	// Display face only for the big title (the font file downloads only on this screen)
	import '@fontsource-variable/fraunces/wght-italic.css';
	import Icon from './ui/Icon.svelte';
	import Logo from './Logo.svelte';
	import logo from '$lib/assets/logo-hero.webp';
	import { settings } from '$lib/state/settings.svelte';
	import AccountButton from './AccountButton.svelte';
	import LanguagePicker from './LanguagePicker.svelte';
	import ServiceMark from './ui/ServiceMark.svelte';
	import { importFromDevice, importFromDrive } from '$lib/state/importing';
	import { ui } from '$lib/state/ui.svelte';
	import { auth } from '$lib/google/auth.svelte';
	import { drivePickerEnabled, googleEnabled } from '$lib/google/config';
	import { signIn, sync } from '$lib/sync/sync.svelte';
	import GoogleMark from './ui/GoogleMark.svelte';
	import { enterDemo } from '$lib/state/mode';
	import t from '$lib/i18n/messages/welcome';

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

	let busy = $state(false);
	let error = $state<string | null>(null);

	// Without an account there are two ways in: your own album (Google) or the demo
	const gate = $derived(googleEnabled && !auth.signedIn);
	// Right after signing in, the album is looked for in Drive before offering to import
	const looking = $derived(auth.signedIn && sync.status === 'syncing');
	const firstName = $derived(auth.account?.name.split(' ')[0] ?? '');

	// Going in: the camera of the logo takes a photo (press, flash) and the screen
	// moves forward into it. Skipped with reduced motion.
	let phase = $state<'idle' | 'flash' | 'leave'>('idle');
	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	function flash() {
		if (settings.reducedMotion) return;
		phase = 'flash';
		setTimeout(() => {
			if (phase === 'flash') phase = 'idle';
		}, 700);
	}

	// Google's window must open right on the click (browsers block it otherwise),
	// so the flash happens while it opens
	function signInWithFlash() {
		flash();
		enter();
	}

	async function openDemo() {
		if (!settings.reducedMotion) {
			phase = 'flash';
			await wait(420);
			phase = 'leave';
			await wait(480);
		}
		enterDemo();
	}

	async function enter() {
		error = null;
		busy = true;
		try {
			await signIn();
		} catch (e) {
			error = e instanceof Error ? e.message : t('signInFailed');
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
			error = e instanceof Error ? e.message : t('driveFailed');
		} finally {
			busy = false;
		}
	}
</script>

<div class="shade" aria-hidden="true"></div>
<div class="curtain" class:on={phase === 'leave'} aria-hidden="true"></div>

<header class="row top">
	<div class="logo"><Logo />Waymark</div>
	<div class="row actions">
		<LanguagePicker />
		<button
			class="btn btn-ghost btn-icon"
			aria-label={t('theme')}
			onclick={(e) => revealTheme(() => settings.toggleTheme(), e)}
		>
			<Icon name={settings.resolvedTheme === 'dark' ? 'sun' : 'moon'} />
		</button>
		{#if auth.signedIn}<AccountButton />{/if}
	</div>
</header>

<main class="col welcome" class:leaving={phase === 'leave'}>
	<div class="camera" class:snap={phase !== 'idle'}>
		<img class="hero-logo" src={logo} alt="" width="442" height="360" />
		<span class="burst" aria-hidden="true"></span>
	</div>
	<h1 class="wordmark">Waymark</h1>

	{#if gate}
		<div class="gate panel col">
			<p class="t-h3 title">{t('gateTitle')}</p>
			<p class="t-small t2 lead">
				{t('gateLead')}
			</p>
			<div class="col ways">
				<button class="btn btn-lg google" disabled={busy} onclick={signInWithFlash}
					><span class="g"><GoogleMark /></span>{busy ? t('opening') : t('continue')}</button
				>
				<div class="row t-small t3 or" aria-hidden="true">{t('or')}</div>
				<button class="btn btn-lg demo-way" onclick={openDemo}
					><Icon name="play" />{t('seeDemo')}</button
				>
				<p class="t-small t3">{t('demoLead')}</p>
			</div>
			{#if error}<p class="t-small err" role="alert">{error}</p>{/if}
		</div>
		<ul class="row features">
			<li class="row"><Icon name="globe" size={16} />{t('featurePlace')}</li>
			<li class="row"><Icon name="route" size={16} />{t('featureTrips')}</li>
			<li class="row"><Icon name="chart" size={16} />{t('featureStats')}</li>
		</ul>
	{:else if looking}
		<div class="gate panel col" role="status">
			<span class="spinner" aria-hidden="true"></span>
			<p class="t-h3 title">{t('looking')}</p>
			<p class="t-small t2 lead">{t('lookingLead')}</p>
		</div>
	{:else}
		<div class="drop panel col">
			<div class="dashed" aria-hidden="true"></div>
			<div class="icon"><Icon name="upload" /></div>
			<p class="t-h3 title">
				{firstName ? t('dropTitleNamed', { name: firstName }) : t('dropTitle')}
			</p>
			<p class="t-small t3">
				{t('dropLead')}
			</p>
			<div class="choices">
				<button class="btn btn-primary btn-lg" onclick={() => choose(false)}
					><Icon name="image" />{t('choosePhotos')}</button
				>
				<button class="btn btn-secondary btn-lg" onclick={() => choose(true)}
					><Icon name="folder" />{t('chooseFolder')}</button
				>
				<div class="row t-small t3 or" aria-hidden="true">{t('importFrom')}</div>
				{#if drivePickerEnabled}
					<button class="btn btn-secondary btn-lg" disabled={busy} onclick={fromDrive}
						><ServiceMark service="drive" />Google Drive</button
					>
				{/if}
				<button
					class="btn btn-secondary btn-lg"
					class:wide={!drivePickerEnabled}
					onclick={() => ui.openImport('takeout')}
					><ServiceMark service="photos" />{t('googlePhotos')}</button
				>
			</div>
			{#if error}<p class="t-small err" role="alert">{error}</p>{/if}
		</div>
		<p class="row t2 privacy">
			<Icon name="lock" size={16} />
			{#if auth.signedIn}
				{t('privacySynced')}
			{:else}
				{t('privacyLocal')}
			{/if}
		</p>
		<button class="demo" onclick={openDemo}><Icon name="play" size={14} />{t('tryDemo')}</button>
	{/if}
</main>

<footer class="row mono t3 bottom">
	<span class="row legal"
		>v1.0 · <a href="/privacidad" data-sveltekit-reload>{t('privacy')}</a> ·
		<a href="/terminos" data-sveltekit-reload>{t('terms')}</a></span
	>
	{#if !gate}<span class="row hint">
			<span class="kbds"
				><span class="kbd">{isMac ? '⌘' : 'Ctrl'}</span><span class="kbd">O</span></span
			>
			{t('openPhotos')}
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
		/* Above the main content: its menus (language, account) open over the logo */
		z-index: 3;
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

	/* The space between the header and the footer, with the content centered in it:
	   it never runs under the header and the screen never needs scrolling */
	.welcome {
		position: absolute;
		top: 76px;
		bottom: 52px;
		left: 50%;
		transform: translateX(-50%);
		width: min(600px, calc(100% - 32px));
		justify-content: center;
		align-items: center;
		text-align: center;
		z-index: 2;
	}

	/* The logo above the title, about as tall as its letters, outlined in the same
	   amber with the same soft glow so both read as one piece */
	.hero-logo {
		width: clamp(92px, min(16vw, 17vh), 176px);
		height: auto;
		margin-bottom: clamp(8px, 1.4vw, 16px);
		filter: drop-shadow(0 0 1.2px oklch(0.78 0.18 56)) drop-shadow(0 0 1.2px oklch(0.78 0.18 56))
			drop-shadow(0 0 5px oklch(0.78 0.18 55 / 0.55))
			drop-shadow(0 10px 28px oklch(0.2 0.03 258 / 0.55));
	}

	:global([data-theme='light']) .hero-logo {
		filter: drop-shadow(0 0 1px oklch(0.66 0.18 50)) drop-shadow(0 0 4px oklch(0.72 0.18 50 / 0.4))
			drop-shadow(0 10px 24px oklch(0.4 0.05 250 / 0.25));
	}

	/* The big title, drawn like the logo: the camera's light amber body with its
	   thick navy outline, and the same thin amber line and glow around it.
	   The stroke is painted under the fill, so only its outer half shows and the
	   lines where the font's shapes overlap stay hidden. */
	.wordmark {
		font-family: 'Fraunces Variable', 'Instrument Serif', Georgia, serif;
		font-style: italic;
		font-weight: 700;
		font-size: clamp(64px, min(15vw, 17vh), 168px);
		line-height: 0.9;
		letter-spacing: -0.03em;
		padding: 0 0.08em;
		color: #fece8e;
		-webkit-text-stroke: 7px #1a263e;
		paint-order: stroke fill;
		/* drop-shadow follows the painted letters, so the line and glow stay at the edge */
		filter: drop-shadow(0 0 1.2px oklch(0.78 0.18 56)) drop-shadow(0 0 1.2px oklch(0.78 0.18 56))
			drop-shadow(0 0 6px oklch(0.78 0.18 55 / 0.5));
	}

	:global([data-theme='light']) .wordmark {
		filter: drop-shadow(0 0 1px oklch(0.66 0.18 50)) drop-shadow(0 0 4px oklch(0.72 0.18 50 / 0.4));
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
	/* The two ways in, in the logo's colours: the main one filled with the camera's
	   amber and navy outline, the demo outlined in amber. Google's mark keeps its
	   white circle so it still reads as Google sign-in. */
	.google {
		background: #fece8e;
		color: #1a263e;
		border: 2px solid #1a263e;
		font-weight: 650;
		box-shadow:
			0 0 0 1px oklch(0.78 0.18 56 / 0.9),
			0 8px 24px -8px oklch(0.78 0.18 55 / 0.55);
		transition:
			background-color var(--dur-fast),
			box-shadow var(--dur),
			transform var(--dur) var(--ease-spring);
	}

	.google:hover {
		background: #ffd9a6;
		transform: translateY(-1px);
		box-shadow:
			0 0 0 1px oklch(0.78 0.18 56),
			0 12px 30px -8px oklch(0.78 0.18 55 / 0.7);
	}

	.google:active {
		transform: scale(0.98);
	}

	.g {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 0 0 1.5px #1a263e;
	}

	.demo-way {
		background: oklch(0.78 0.18 56 / 0.08);
		color: var(--acc-text);
		border: 1.5px solid oklch(0.78 0.18 56 / 0.55);
		font-weight: 600;
		transition:
			background-color var(--dur-fast),
			border-color var(--dur-fast),
			transform var(--dur) var(--ease-spring);
	}

	.demo-way:hover {
		background: oklch(0.78 0.18 56 / 0.16);
		border-color: oklch(0.78 0.18 56 / 0.85);
		transform: translateY(-1px);
	}

	.demo-way:active {
		transform: scale(0.98);
	}

	/* The card itself gets a faint amber edge, like the logo's outline */
	.gate {
		border-color: oklch(0.78 0.18 56 / 0.28);
		box-shadow:
			var(--shadow),
			0 0 40px -12px oklch(0.78 0.18 55 / 0.35);
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

	/* The photo being taken: the camera is pressed and its flash goes off */
	.camera {
		position: relative;
		display: grid;
		place-items: center;
	}

	.camera.snap {
		animation: press 0.42s var(--ease-out);
	}

	@keyframes press {
		25% {
			transform: scale(0.9) translateY(3px);
		}

		55% {
			transform: scale(1.06);
		}
	}

	/* The flash fires from the camera's top left corner: a short burst of light
	   with a small cross of rays, like a flash going off in the dark */
	.burst {
		position: absolute;
		left: 15%;
		top: 13%;
		width: 22px;
		height: 22px;
		margin: -11px 0 0 -11px;
		border-radius: 50%;
		background: radial-gradient(circle, #fff 0%, #fff4dc 30%, oklch(0.88 0.12 75 / 0) 70%);
		opacity: 0;
		pointer-events: none;
	}

	.burst::before,
	.burst::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 260%;
		height: 2px;
		margin: -1px 0 0 -130%;
		border-radius: 2px;
		background: linear-gradient(90deg, transparent, #fff 50%, transparent);
	}

	.burst::after {
		transform: rotate(90deg);
	}

	.snap .burst {
		animation: burst 0.55s 0.1s ease-out;
	}

	@keyframes burst {
		0% {
			opacity: 0;
			transform: scale(0.3) rotate(0deg);
		}

		15% {
			opacity: 1;
			transform: scale(2.4) rotate(20deg);
		}

		100% {
			opacity: 0;
			transform: scale(4) rotate(45deg);
		}
	}

	/* Then the screen moves forward into the photo and fades to the next one */
	.welcome.leaving {
		animation: forward 0.5s cubic-bezier(0.55, 0, 0.8, 0.3) forwards;
	}

	@keyframes forward {
		to {
			opacity: 0;
			filter: blur(6px);
			transform: translateX(-50%) scale(1.25);
		}
	}

	.curtain {
		position: fixed;
		inset: 0;
		z-index: 49;
		background: var(--bg);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.4s 0.12s ease-in;
	}

	.curtain.on {
		opacity: 1;
		pointer-events: auto;
	}

	/* Everything arrives in order: logo, name, sign-in card, then the rest */
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

	/* Short windows (small laptops): the three highlights make room for the rest */
	/* Short phones: the highlights make room for the sign-in card */
	@media (max-width: 640px) and (max-height: 700px) {
		.features {
			display: none;
		}
	}

	@media (max-height: 760px) and (min-width: 641px) {
		.features {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.top {
			top: 16px;
			left: 16px;
			right: 16px;
		}

		.bottom {
			bottom: 16px;
			left: 16px;
			right: 16px;
		}

		.welcome {
			top: 68px;
			bottom: 40px;
		}

		/* Logo and title sized by the screen height too, so short phones still fit */
		.hero-logo {
			width: clamp(64px, 12vh, 112px);
		}

		.wordmark {
			font-size: clamp(48px, min(16vw, 9vh), 84px);
			-webkit-text-stroke-width: 5px;
		}

		.gate {
			margin-top: clamp(16px, 3.5vh, 32px);
			padding: 22px 20px 20px;
		}

		.ways {
			margin-top: clamp(14px, 2.5vh, 22px);
		}

		.features {
			margin-top: clamp(12px, 2.5vh, 22px);
			gap: 8px 16px;
		}

		.drop {
			padding: 28px 20px 24px;
		}

		.bottom .hint {
			display: none;
		}
	}
</style>
