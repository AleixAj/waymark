<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import Logo from './Logo.svelte';
	import { library } from '$lib/state/library.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { pickFiles } from '$lib/photos/pick';

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

	async function choose(folder: boolean) {
		library.import(await pickFiles(folder));
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
			JPG, HEIC, PNG y más. Leemos la ubicación GPS de cada foto para colocarla en el globo.
		</p>
		<div class="row buttons">
			<button class="btn btn-primary btn-lg" onclick={() => choose(false)}
				><Icon name="image" />Elegir fotos</button
			>
			<button class="btn btn-secondary btn-lg" onclick={() => choose(true)}
				><Icon name="folder" />Elegir carpeta</button
			>
		</div>
	</div>

	<p class="row t2 privacy">
		<Icon name="lock" size={16} />Tus fotos no salen de tu dispositivo. Todo se procesa en este
		navegador.
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

	.buttons {
		gap: 8px;
		margin-top: 22px;
		flex-wrap: wrap;
		justify-content: center;
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
