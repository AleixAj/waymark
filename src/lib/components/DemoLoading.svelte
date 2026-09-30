<script lang="ts">
	import Logo from './Logo.svelte';
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
		<div class="row brand"><Logo />Waymark</div>
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
