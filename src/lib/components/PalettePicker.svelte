<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { readMapColors } from '$lib/map/colors';
	import { PALETTES, paletteColors } from '$lib/map/palette';

	let open = $state(false);
	let wrap = $state<HTMLDivElement>();

	// A tiny globe per style, painted with that style's real colors.
	// Read again when the theme changes, because the colors come from the theme.
	const swatches = $derived.by(() => {
		if (!open) return {};
		void settings.resolvedTheme;
		const c = readMapColors();
		return Object.fromEntries(
			PALETTES.map(({ id }) => {
				const p = paletteColors(c, id);
				return [
					id,
					{ ocean: p.ocean, land: p.other(c.arid), mine: p.visited(c.land), line: p.outline }
				];
			})
		);
	});

	function closeOnOutside(event: PointerEvent) {
		if (open && !wrap?.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window
	onpointerdown={closeOnOutside}
	onkeydown={(e) => {
		if (e.key === 'Escape') open = false;
	}}
/>

<div class="wrap" bind:this={wrap}>
	<div class="ctl panel">
		<button
			class="btn btn-ghost"
			class:on={open}
			aria-label="Estilo de colores del globo"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			<Icon name="palette" />
		</button>
	</div>

	{#if open}
		<div class="menu panel" role="radiogroup" aria-label="Estilo de colores">
			<p class="t-label title">Colores del globo</p>
			{#each PALETTES as palette (palette.id)}
				{@const s = swatches[palette.id]}
				<button
					class="option"
					class:is-on={settings.palette === palette.id}
					role="radio"
					aria-checked={settings.palette === palette.id}
					onclick={() => (settings.palette = palette.id)}
				>
					{#if s}
						<svg class="swatch" viewBox="0 0 40 40" aria-hidden="true">
							<circle cx="20" cy="20" r="19" fill={s.ocean} />
							<path d="M4 17c6-7 13-8 18-4s3 11-3 14-12 2-15-3z" fill={s.land} />
							<path
								d="M24 9c5-2 11 1 12 7s-3 9-7 8-7-4-8-8 0-6 3-7z"
								fill={s.mine}
								stroke={s.line}
								stroke-width="1.2"
							/>
							<circle cx="20" cy="20" r="19" fill="none" stroke="rgba(255,255,255,.18)" />
						</svg>
					{/if}
					<span class="col text">
						<b>{palette.label}</b>
						<span class="t-small t3">{palette.hint}</span>
					</span>
					{#if settings.palette === palette.id}<span class="check"
							><Icon name="check" size={16} /></span
						>{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
	}

	.ctl {
		display: flex;
		flex-direction: column;
		padding: 4px;
		border-radius: 12px;
	}

	.ctl .btn {
		width: 32px;
		height: 32px;
		padding: 0;
	}

	.on {
		background: var(--hover);
		color: var(--acc-text);
	}

	/* Opens to the left of the map controls */
	.menu {
		position: absolute;
		right: calc(100% + 10px);
		bottom: 0;
		width: 290px;
		padding: 8px;
		background: var(--glass-strong);
		animation: pop 0.15s ease-out;
	}

	@keyframes pop {
		from {
			opacity: 0;
			transform: translateX(6px);
		}
	}

	.title {
		padding: 4px 8px 8px;
	}

	.option {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 8px;
		border-radius: 10px;
		text-align: left;
		color: var(--t2);
		border: 1px solid transparent;
	}

	.option:hover {
		background: var(--hover);
	}

	.option.is-on {
		background: var(--acc-soft);
		border-color: color-mix(in oklab, var(--acc) 40%, transparent);
	}

	.swatch {
		flex: none;
		width: 40px;
		height: 40px;
	}

	.text {
		flex: 1;
		min-width: 0;
		gap: 2px;
	}

	.text b {
		color: var(--t1);
		font-size: 13px;
		font-weight: 600;
	}

	.check {
		display: inline-flex;
		color: var(--acc-text);
	}

	@media (max-width: 767px) {
		.ctl .btn {
			width: 36px;
			height: 36px;
		}

		.menu {
			width: min(290px, calc(100vw - 80px));
		}
	}
</style>
