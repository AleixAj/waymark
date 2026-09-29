<script lang="ts">
	import { library } from '$lib/state/library.svelte';
	import { buildMonths, monthStart } from '$lib/library/timeline';
	import { formatMonth, formatNumber } from '$lib/library/format';

	let { style = '' }: { style?: string } = $props();

	const bars = $derived(buildMonths(library.located));
	const max = $derived(Math.max(1, ...bars.map((b) => b.count)));
	const years = $derived(
		bars.flatMap((b, i) => (b.month === 0 ? [{ year: b.year, left: (i / bars.length) * 100 }] : []))
	);

	// Selected months as positions in `bars`
	const fromIndex = $derived(
		library.range ? bars.findIndex((b) => b.key === library.range!.from) : 0
	);
	const toIndex = $derived(
		library.range ? bars.findIndex((b) => b.key === library.range!.to) : bars.length - 1
	);
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
	<div class="timeline panel" {style}>
		<div class="col info">
			<span class="t-label">Línea de tiempo</span>
			<span class="mono range">{label}</span>
			<span class="mono t3 small">{formatNumber(count)} fotos</span>
			{#if library.range}
				<button class="reset mono" onclick={() => (library.range = null)}>ver todo</button>
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
							aria-label="Inicio del rango"
							aria-valuenow={fromIndex}
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
							aria-label="Fin del rango"
							aria-valuenow={toIndex}
							onpointerdown={(e) => {
								e.stopPropagation();
								onPointerDown(e, 'to');
							}}
							onkeydown={onKey}
						></b>
					</div>
				{/if}
				<div class="bars">
					{#each bars as bar, i (bar.key)}
						{@const on = !library.range || (i >= fromIndex && i <= toIndex)}
						<i
							class:on
							style:height="{Math.max(2, Math.pow(bar.count / max, 0.55) * 34)}px"
							title="{formatMonth(monthStart(bar.key))}: {bar.count} fotos"
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
	</div>
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
		transition:
			background-color 0.15s,
			opacity 0.15s;
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

	.years span {
		position: absolute;
		font-size: 11px;
		padding-left: 4px;
		border-left: 1px solid var(--line-strong);
		line-height: 12px;
	}
</style>
