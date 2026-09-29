<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import { library } from '$lib/state/library.svelte';
	import { thumbUrl } from '$lib/state/thumbs.svelte';
	import { formatNumber } from '$lib/library/format';

	const progress = $derived(library.progress!);
	const percent = $derived(progress.total ? (progress.done / progress.total) * 100 : 0);

	// Rough time left from the speed so far
	const remaining = $derived.by(() => {
		const elapsed = Date.now() - progress.startedAt;
		const done = progress.done - progress.duplicates;
		if (done < 5) return '';
		const seconds = ((elapsed / done) * (progress.total - progress.done)) / 1000;
		return seconds < 60 ? '<1 min' : `~${Math.round(seconds / 60)} min`;
	});

	// Last imported photos for the moving strip
	const recent = $derived(library.points.slice(-12).map((p) => p.id));
</script>

{#if library.importMinimized}
	<button class="mini panel row" onclick={() => (library.importMinimized = false)}>
		<span class="dot sm ringed"></span>
		<span>Importando <span class="mono">{Math.round(percent)} %</span></span>
	</button>
{:else}
	<section class="import panel" role="status" aria-live="polite">
		<div class="row between">
			<div class="row title">
				<span class="dot sm ringed"></span><span class="t-h3">Importando fotos</span>
			</div>
			<button
				class="btn btn-ghost btn-icon btn-sm"
				aria-label="Minimizar"
				onclick={() => (library.importMinimized = true)}
			>
				<Icon name="minimize" />
			</button>
		</div>
		<div class="row between counts">
			<span>
				Procesando <span class="mono big">{formatNumber(progress.done)}</span> de
				<span class="mono big">{formatNumber(progress.total)}</span>
			</span>
			<span class="mono t3">{Math.round(percent)} %{remaining ? ` · ${remaining}` : ''}</span>
		</div>
		<div class="progress"><i style:width="{percent}%"></i></div>

		{#if recent.length}
			<div class="strip">
				<div class="row marquee">
					{#each [...recent, ...recent] as id, i (i)}
						<span
							class="thumb"
							style:background-image={thumbUrl(id) ? `url(${thumbUrl(id)})` : undefined}
						></span>
					{/each}
				</div>
			</div>
		{/if}

		<div class="boxes">
			<div class="box col">
				<span class="mono num acc">{formatNumber(progress.withLocation)}</span>
				<span class="t-small t3">con ubicación</span>
			</div>
			<div class="box col">
				<span class="mono num">{formatNumber(progress.withoutLocation)}</span>
				<span class="t-small t3">sin ubicación</span>
			</div>
			<div class="box col">
				<span class="mono num">{formatNumber(progress.duplicates)}</span>
				<span class="t-small t3">duplicadas</span>
			</div>
		</div>
		<p class="row t-small t3 note">
			<Icon name="lock" size={14} />Se procesa en este dispositivo. Puedes seguir usando la app.
		</p>
	</section>
{/if}

<style>
	.import {
		position: absolute;
		right: 16px;
		bottom: 16px;
		width: 364px;
		padding: 16px;
		z-index: 15;
	}

	.mini {
		position: absolute;
		right: 16px;
		bottom: 16px;
		z-index: 15;
		height: 40px;
		padding: 0 14px;
		gap: 10px;
		font-size: 13px;
		border-radius: 12px;
	}

	.between {
		justify-content: space-between;
	}

	.title {
		gap: 10px;
	}

	.title .t-h3 {
		font-size: 14px;
	}

	.counts {
		margin-top: 14px;
		margin-bottom: 8px;
		font-size: 13px;
	}

	.big {
		font-size: 13px;
	}

	.strip {
		margin: 14px -16px 0;
		overflow: hidden;
		mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
	}

	.marquee {
		gap: 6px;
		width: max-content;
		animation: marquee 14s linear infinite;
	}

	.thumb {
		width: 52px;
		height: 52px;
		flex: none;
		border-radius: 6px;
		background: var(--s3) center / cover;
	}

	.boxes {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 14px;
	}

	.box {
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--field);
		border: 1px solid var(--line);
	}

	.num {
		font-size: 15px;
		line-height: 20px;
	}

	.note {
		gap: 6px;
		margin-top: 12px;
	}
</style>
