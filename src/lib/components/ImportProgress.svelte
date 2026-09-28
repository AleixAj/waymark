<script lang="ts">
	import type { ImportProgress } from '$lib/photos/importer';

	let { progress }: { progress: ImportProgress } = $props();

	const format = new Intl.NumberFormat('es-ES');
	let percent = $derived(progress.total ? (progress.done / progress.total) * 100 : 0);
</script>

<section class="panel" aria-live="polite">
	<p>Procesando {format.format(progress.done)} de {format.format(progress.total)}</p>
	<div class="bar"><div class="fill" style:width="{percent}%"></div></div>
	<ul>
		<li>Con ubicación <b>{progress.withLocation}</b></li>
		<li>Sin ubicación <b>{progress.withoutLocation}</b></li>
		<li>Duplicadas <b>{progress.duplicates}</b></li>
	</ul>
</section>

<style>
	.panel {
		position: absolute;
		right: 16px;
		bottom: 16px;
		width: 300px;
		padding: 14px 16px;
		border: 1px solid var(--border);
		border-radius: var(--radius-panel);
		background: var(--surface);
		backdrop-filter: blur(16px);
	}

	p {
		margin: 0 0 10px;
		font-size: 14px;
	}

	.bar {
		height: 4px;
		border-radius: 2px;
		background: var(--border);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		background: var(--accent);
		transition: width 0.2s ease-out;
	}

	ul {
		display: flex;
		justify-content: space-between;
		margin: 10px 0 0;
		padding: 0;
		list-style: none;
		font-size: 12px;
		color: var(--text-muted);
	}

	b {
		font-family: var(--font-mono);
		color: var(--text);
	}
</style>
