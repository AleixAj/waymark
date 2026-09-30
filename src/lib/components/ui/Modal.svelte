<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import { focusTrap } from './focusTrap';
	import tc from '$lib/i18n/messages/common';

	let {
		title,
		subtitle = '',
		width = 560,
		onclose,
		children,
		footer
	}: {
		title: string;
		subtitle?: string;
		width?: number;
		onclose: () => void;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onclose}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="dialog panel"
		style="width: min({width}px, calc(100% - 32px))"
		role="dialog"
		use:focusTrap
		tabindex="-1"
		aria-modal="true"
		aria-label={title}
		onclick={(e) => e.stopPropagation()}
	>
		<div class="row head">
			<div class="col">
				<h1 class="t-h2">{title}</h1>
				{#if subtitle}<p class="t-small t3 sub">{subtitle}</p>{/if}
			</div>
			<button class="btn btn-ghost btn-icon" aria-label={tc('close')} onclick={onclose}>
				<Icon name="x" />
			</button>
		</div>
		<div class="body scroll">
			{@render children()}
		</div>
		{#if footer}
			<div class="row foot">{@render footer()}</div>
		{/if}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 70;
		background: oklch(0.12 0.02 258 / 0.45);
		animation: fade var(--dur) var(--ease-out);
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.dialog {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		max-height: calc(100% - 32px);
		display: flex;
		flex-direction: column;
		background: var(--glass-strong);
		animation: dialog-in var(--dur) var(--ease-out);
	}

	@keyframes dialog-in {
		from {
			opacity: 0;
			transform: translate(-50%, calc(-50% + 12px)) scale(0.97);
		}
	}

	.head {
		justify-content: space-between;
		align-items: flex-start;
		padding: 18px 16px 16px 24px;
		border-bottom: 1px solid var(--line);
	}

	.sub {
		margin-top: 4px;
	}

	.body {
		padding: 20px 24px;
		overflow-y: auto;
	}

	.foot {
		justify-content: flex-end;
		gap: 8px;
		padding: 14px 20px;
		border-top: 1px solid var(--line);
	}
</style>
