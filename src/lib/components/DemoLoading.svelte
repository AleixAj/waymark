<script lang="ts">
	import logo from '$lib/assets/logo.webp';
	import { formatDecimal } from '$lib/library/format';
	import type { DemoStatus } from '$lib/demo/load';
	import t from '$lib/i18n/messages/demo';

	let { status }: { status: DemoStatus } = $props();

	const percent = $derived(Math.round(status.progress * 100));
	const detail = $derived(
		status.step === 'place'
			? t('placing')
			: status.total
				? t('downloading', {
						loaded: formatDecimal(status.loaded),
						total: formatDecimal(status.total)
					})
				: t('preparing')
	);
</script>

<!-- The sample library appears all at once when it is ready, not bit by bit -->
<div class="backdrop">
	<div class="card panel" role="dialog" aria-modal="true" aria-labelledby="demo-title">
		<!-- While it loads, the camera of the logo keeps taking photos -->
		<div class="row brand">
			<span class="camera" aria-hidden="true"><img src={logo} alt="" width="59" height="48" /></span
			>Waymark
		</div>
		<h1 id="demo-title" class="t-h2">{t('title')}</h1>
		<p class="t-small t2">
			{t('lead')}
		</p>

		<div
			class="bar"
			role="progressbar"
			aria-label={t('progress')}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={percent}
		>
			<span class="fill" style:transform="scaleX({status.progress})"></span>
		</div>
		<div class="row status">
			<span class="t-small t3">{detail}</span>
			<span class="mono pct">{percent}%</span>
		</div>

		<p class="t-small t3 note">{t('credits')}</p>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		padding: 16px;
		background: oklch(0.12 0.02 258 / 0.55);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
		animation: fade 0.2s ease-out;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.card {
		animation: rise var(--dur-slow) var(--ease-out);
		width: min(420px, 100%);
		padding: 28px 28px 22px;
		background: var(--glass-strong);
		text-align: left;
	}

	.brand {
		gap: 8px;
		margin-bottom: 18px;
		font-family: 'Instrument Serif', Georgia, serif;
		font-style: italic;
		font-size: 22px;
		line-height: 1;
		color: var(--t1);
	}

	h1 {
		margin-bottom: 6px;
	}

	.bar {
		position: relative;
		height: 8px;
		margin-top: 22px;
		border-radius: 999px;
		background: var(--field);
		border: 1px solid var(--line);
		overflow: hidden;
	}

	/* Scaled, not resized: it follows every update and the GPU draws it */
	/* A light that runs along the bar, so it looks alive even between updates */
	.fill::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, oklch(1 0 0 / 0.45), transparent);
		transform: translateX(-100%);
		animation: sweep 1.4s ease-in-out infinite;
	}

	@keyframes sweep {
		to {
			transform: translateX(100%);
		}
	}

	.camera {
		position: relative;
		display: grid;
		animation: shoot 2.2s var(--ease-out) infinite;
	}

	.camera img {
		width: 36px;
		height: auto;
		filter: drop-shadow(0 0 1px oklch(0.78 0.18 56));
	}

	/* The flash on the camera's top left corner */
	.camera::after {
		content: '';
		position: absolute;
		left: 15%;
		top: 13%;
		width: 10px;
		height: 10px;
		margin: -5px 0 0 -5px;
		border-radius: 50%;
		background: radial-gradient(circle, #fff 0%, #fff4dc 35%, transparent 70%);
		opacity: 0;
		animation: flash 2.2s ease-out infinite;
	}

	@keyframes shoot {
		0%,
		70%,
		100% {
			transform: none;
		}

		76% {
			transform: scale(0.9) translateY(1px);
		}

		84% {
			transform: scale(1.05);
		}
	}

	@keyframes flash {
		0%,
		76%,
		100% {
			opacity: 0;
			transform: scale(0.4);
		}

		80% {
			opacity: 1;
			transform: scale(2.6);
		}

		92% {
			opacity: 0;
			transform: scale(4);
		}
	}

	.fill {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--acc-press), var(--acc));
		transform-origin: left;
	}

	.status {
		justify-content: space-between;
		gap: 12px;
		margin-top: 10px;
	}

	.pct {
		font-size: 12px;
		color: var(--acc-text);
	}

	.note {
		margin-top: 18px;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}
</style>
