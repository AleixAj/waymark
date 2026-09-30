<script module lang="ts">
	// The bars grow from the bottom the first time the timeline appears, not on every page
	let grown = false;
</script>

<script lang="ts">
	import { library } from '$lib/state/library.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { buildMonths, monthStart, rangeIndexes } from '$lib/library/timeline';
	import { formatMonth } from '$lib/library/format';
	import tc from '$lib/i18n/messages/common';
	import t from '$lib/i18n/messages/sidebar';

	let { style = '' }: { style?: string } = $props();

	const firstShow = !grown;
	grown = true;

	const bars = $derived(buildMonths(library.located));
	const max = $derived(Math.max(1, ...bars.map((b) => b.count)));
	const years = $derived(
		bars.flatMap((b, i) => (b.month === 0 ? [{ year: b.year, left: (i / bars.length) * 100 }] : []))
	);

	// Selected months as positions in `bars`, always inside the bars
	const indexes = $derived(rangeIndexes(bars, library.range));
	const fromIndex = $derived(indexes.from);
	const toIndex = $derived(indexes.to);
	const count = $derived(library.visible.length);
	const label = $derived.by(() => {
		if (!bars.length) return '';
		const from = bars[fromIndex] ?? bars[0];
		const to = bars[toIndex] ?? bars[bars.length - 1];
		return `${formatMonth(monthStart(from.key))} — ${formatMonth(monthStart(to.key))}`;
	});

	let track = $state<HTMLDivElement>();
	let dragging: 'from' | 'to' | 'new' | null = null;
	let anchor = 0;

	function indexAt(clientX: number) {
		const rect = track!.getBoundingClientRect();
		const ratio = Math.min(0.9999, Math.max(0, (clientX - rect.left) / rect.width));
		return Math.floor(ratio * bars.length);
	}

	function setRange(a: number, b: number) {
		const from = Math.min(a, b);
		const to = Math.max(a, b);
		// The whole timeline selected means no filter at all
		library.range =
			from === 0 && to === bars.length - 1 ? null : { from: bars[from].key, to: bars[to].key };
	}

	function onPointerDown(event: PointerEvent, handle: 'from' | 'to' | 'new') {
		event.preventDefault();
		track?.setPointerCapture(event.pointerId);
		dragging = handle;
		anchor = handle === 'from' ? toIndex : handle === 'to' ? fromIndex : indexAt(event.clientX);
		if (handle === 'new') setRange(anchor, anchor);
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		setRange(anchor, indexAt(event.clientX));
	}

	function onKey(event: KeyboardEvent) {
		// Arrow keys move the whole selection one month
		const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
		if (!step) return;
		event.preventDefault();
		const from = Math.min(bars.length - 1, Math.max(0, fromIndex + step));
		const to = Math.min(bars.length - 1, Math.max(0, toIndex + step));
		setRange(from, to);
	}
</script>

{#if bars.length}
	<section
		aria-label={t('timeline')}
		class="timeline panel"
		class:open={ui.timelineOpen}
		{style}
		style:--sheet="{ui.sheetHeight}px"
	>
		<div class="col info">
			<span class="t-label">{t('timeline')}</span>
			<span class="mono range">{label}</span>
			<span class="mono t3 small">{tc('photos', { n: count })}</span>
			{#if library.range}
				<button class="reset mono" onclick={() => (library.range = null)}>{t('seeAll')}</button>
			{/if}
		</div>
		<div class="chart">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="track"
				bind:this={track}
				onpointerdown={(e) => onPointerDown(e, 'new')}
				onpointermove={onPointerMove}
				onpointerup={() => (dragging = null)}
				onpointercancel={() => (dragging = null)}
				ondblclick={() => (library.range = null)}
			>
				{#if library.range}
					<div
						class="selection"
						style:left="{(fromIndex / bars.length) * 100}%"
						style:width="{((toIndex - fromIndex + 1) / bars.length) * 100}%"
					>
						<b
							class="handle left"
							role="slider"
							tabindex="0"
							aria-label={t('rangeStart')}
							aria-valuenow={fromIndex}
							aria-valuemin={0}
							aria-valuemax={bars.length - 1}
							aria-valuetext={formatMonth(monthStart(bars[fromIndex]?.key ?? 0))}
							onpointerdown={(e) => {
								e.stopPropagation();
								onPointerDown(e, 'from');
							}}
							onkeydown={onKey}
						></b>
						<b
							class="handle right"
							role="slider"
							tabindex="0"
							aria-label={t('rangeEnd')}
							aria-valuenow={toIndex}
							aria-valuemin={0}
							aria-valuemax={bars.length - 1}
							aria-valuetext={formatMonth(monthStart(bars[toIndex]?.key ?? 0))}
							onpointerdown={(e) => {
								e.stopPropagation();
								onPointerDown(e, 'to');
							}}
							onkeydown={onKey}
						></b>
					</div>
				{/if}
				<div class="bars" class:grow={firstShow}>
					{#each bars as bar, i (bar.key)}
						{@const on = !library.range || (i >= fromIndex && i <= toIndex)}
						<i
							class:on
							style:--i={i}
							style:height="{Math.max(2, Math.pow(bar.count / max, 0.55) * 34)}px"
							title={t('month', { month: formatMonth(monthStart(bar.key)), n: bar.count })}
						></i>
					{/each}
				</div>
			</div>
			<div class="years">
				{#each years as y (y.year)}
					<span class="mono t3" style:left="{y.left}%">{y.year}</span>
				{/each}
			</div>
		</div>
	</section>
{/if}

<style>
	.timeline {
		position: absolute;
		left: 16px;
		right: 16px;
		bottom: 16px;
		height: 80px;
		padding: 12px 16px 10px;
		z-index: 10;
		display: grid;
		grid-template-columns: 150px 1fr;
		gap: 16px;
	}

	.info {
		gap: 4px;
		justify-content: center;
		position: relative;
	}

	.range {
		color: var(--t1);
		white-space: nowrap;
		font-size: 11.5px;
	}

	.small {
		font-size: 11px;
	}

	.reset {
		position: absolute;
		right: 0;
		bottom: 0;
		font-size: 11px;
		color: var(--acc-text);
	}

	.chart {
		position: relative;
		min-width: 0;
	}

	.track {
		position: relative;
		height: 38px;
		cursor: crosshair;
		touch-action: none;
	}

	.bars {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 38px;
		position: relative;
		pointer-events: none;
	}

	.bars i {
		flex: 1;
		border-radius: 1.5px 1.5px 0 0;
		background: var(--t3);
		opacity: 0.35;
		transform-origin: bottom;
		transition:
			background-color 0.15s,
			opacity 0.15s;
	}

	.bars.grow i {
		animation: bar-in 0.6s var(--ease-out) both;
		animation-delay: calc(0.3s + var(--i) * 6ms);
	}

	@keyframes bar-in {
		from {
			transform: scaleY(0);
		}
	}

	.bars i.on {
		background: var(--acc);
		opacity: 0.9;
	}

	.selection {
		position: absolute;
		top: -4px;
		height: 44px;
		background: var(--acc-soft);
		border-radius: 6px;
		border: 1px solid color-mix(in oklch, var(--acc) 35%, transparent);
	}

	.handle {
		position: absolute;
		top: 8px;
		width: 6px;
		height: 26px;
		border-radius: 3px;
		background: var(--acc);
		box-shadow: 0 0 0 2px var(--bg);
		cursor: ew-resize;
		z-index: 2;
	}

	.handle.left {
		left: -4px;
	}

	.handle.right {
		right: -4px;
	}

	.years {
		position: relative;
		height: 14px;
		margin-top: 6px;
	}

	/* Phones: only shown when opened from the calendar button */
	@media (max-width: 767px) {
		.timeline {
			display: none;
			left: 8px !important;
			right: 8px !important;
			bottom: calc(var(--sheet) + 8px);
			grid-template-columns: 1fr;
			height: auto;
			gap: 8px;
			z-index: 16;
		}

		.timeline.open {
			display: grid;
		}

		.info {
			flex-direction: row;
			align-items: baseline;
			gap: 10px;
		}

		.info .t-label {
			display: none;
		}
	}

	.years span {
		position: absolute;
		font-size: 11px;
		padding-left: 4px;
		border-left: 1px solid var(--line-strong);
		line-height: 12px;
	}
</style>
