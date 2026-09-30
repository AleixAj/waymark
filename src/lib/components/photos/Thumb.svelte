<script lang="ts">
	import Icon from '../ui/Icon.svelte';
	import { thumbUrl } from '$lib/state/thumbs.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { whenVisible } from './visible';
	import tc from '$lib/i18n/messages/common';

	interface Props {
		id: string;
		favorite?: boolean;
		/** Show the round checkbox (selection mode) */
		checkable?: boolean;
		selected?: boolean;
		label?: string;
		onclick?: (event: MouseEvent) => void;
		ondragstart?: (event: DragEvent) => void;
	}

	let {
		id,
		favorite = false,
		checkable = false,
		selected = false,
		label = '',
		onclick,
		ondragstart
	}: Props = $props();

	let visible = $state(false);
	// Only ask for the image once the tile is close to the screen
	const url = $derived(visible ? thumbUrl(id) : undefined);

	// The hover highlight on the map must not stay if the tile disappears under the mouse
	$effect(() => () => {
		if (ui.isHovered(id)) ui.hoveredPhoto = null;
	});
</script>

<button
	class="ph"
	class:is-sel={selected}
	class:is-hover={ui.isHovered(id)}
	use:whenVisible={() => (visible = true)}
	draggable={!!ondragstart}
	{ondragstart}
	{onclick}
	onmouseenter={() => (ui.hoveredPhoto = id)}
	onmouseleave={() => (ui.hoveredPhoto = null)}
	aria-label={label || tc('openPhoto')}
	aria-pressed={checkable ? selected : undefined}
>
	{#if url}<img src={url} alt="" draggable="false" />{/if}
	{#if checkable}
		<span class="check"
			>{#if selected}<Icon name="check" size={13} />{/if}</span
		>
	{/if}
	{#if favorite}<span class="fav"><Icon name="heart" size={14} filled /></span>{/if}
</button>

<style>
	.ph {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: 6px;
		background: var(--s2);
		padding: 0;
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		animation: fade 0.3s ease-out;
		transition: transform var(--dur-slow) var(--ease-out);
	}

	/* A soft zoom inside the tile, like a photo on a contact sheet */
	@media (hover: hover) {
		.ph:hover img {
			transform: scale(1.05);
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.ph.is-hover {
		outline: 2px solid var(--acc);
		outline-offset: 2px;
		z-index: 2;
	}

	.ph.is-sel::before {
		content: '';
		position: absolute;
		inset: 0;
		border: 2px solid var(--acc);
		border-radius: inherit;
		z-index: 2;
		background: oklch(0.8 0.145 68 / 0.12);
	}

	.check {
		position: absolute;
		top: 6px;
		left: 6px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 1.5px solid oklch(1 0 0 / 0.85);
		z-index: 3;
		display: grid;
		place-items: center;
		color: var(--on-acc);
		box-shadow: 0 1px 3px oklch(0 0 0 / 0.4);
	}

	.is-sel .check {
		background: var(--acc);
		border-color: var(--acc);
	}

	.fav {
		position: absolute;
		right: 6px;
		top: 6px;
		z-index: 3;
		color: #fff;
		filter: drop-shadow(0 1px 2px oklch(0 0 0 / 0.5));
	}
</style>
