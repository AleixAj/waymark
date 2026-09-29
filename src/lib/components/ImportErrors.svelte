<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import { library } from '$lib/state/library.svelte';

	const count = $derived(library.errors.length);
	const canRetry = $derived(library.errors.some((e) => e.retryable));
</script>

<div class="errors panel" role="alert">
	<div class="row head">
		<span class="icon"><Icon name="fileX" /></span>
		<div class="col grow">
			<span class="title">No hemos podido leer {count} {count === 1 ? 'archivo' : 'archivos'}</span>
			<span class="t-small t2">El resto de la importación ha terminado bien.</span>
		</div>
		<button
			class="btn btn-ghost btn-icon btn-sm close"
			aria-label="Cerrar"
			onclick={() => (library.errors = [])}
		>
			<Icon name="x" />
		</button>
	</div>
	<div class="col list">
		{#each library.errors.slice(0, 5) as error, i (i)}
			<div class="row item">
				<span class="mono name">{error.name}</span>
				<span class="t-small t3">{error.reason}</span>
			</div>
		{/each}
		{#if count > 5}
			<div class="row item t-small t3">y {count - 5} más</div>
		{/if}
	</div>
	<div class="row actions">
		<button class="btn btn-ghost btn-sm" onclick={() => (library.errors = [])}>Omitir</button>
		{#if canRetry}
			<button class="btn btn-secondary btn-sm" onclick={() => library.retryErrors()}>
				<Icon name="refresh" />Reintentar
			</button>
		{/if}
	</div>
</div>

<style>
	.errors {
		position: absolute;
		right: 16px;
		bottom: 16px;
		width: 380px;
		padding: 16px;
		z-index: 15;
	}

	.head {
		gap: 12px;
		align-items: flex-start;
	}

	.icon {
		color: var(--err);
		margin-top: 1px;
	}

	.grow {
		flex: 1;
	}

	.title {
		font-size: 14px;
		font-weight: 550;
	}

	.close {
		margin: -4px -6px 0 0;
	}

	.list {
		margin-top: 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
	}

	.item {
		justify-content: space-between;
		gap: 12px;
		padding: 8px 10px;
		background: var(--field);
	}

	.item + .item {
		border-top: 1px solid var(--line);
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.actions {
		gap: 8px;
		margin-top: 12px;
		justify-content: flex-end;
	}
</style>
