<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Icon from './ui/Icon.svelte';
	import { settings, type MapStyle, type Quality } from '$lib/state/settings.svelte';
	import { library } from '$lib/state/library.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { exportMetadata, measureLibrary } from '$lib/photos/db';
	import { downloadText } from '$lib/library/gpx';
	import { formatBytes } from '$lib/library/format';

	let storage = $state<{ thumbs: number; originals: number; used: number; quota: number } | null>(
		null
	);
	let confirmDelete = $state(false);
	let cacheCleared = $state(false);

	const styles: { id: MapStyle; label: string }[] = [
		{ id: 'sobrio', label: 'Sobrio' },
		{ id: 'relieve', label: 'Relieve' },
		{ id: 'satelite', label: 'Satélite' }
	];

	const qualities: { id: Quality; label: string; hint: string }[] = [
		{
			id: 'alta',
			label: 'Alta',
			hint: 'Máxima nitidez en pantallas de alta densidad. Consume más batería.'
		},
		{ id: 'equilibrada', label: 'Equilibrada', hint: '60 fps en la mayoría de equipos.' },
		{ id: 'ahorro', label: 'Ahorro de batería', hint: 'Menos píxeles, sin halo ni sombreado.' }
	];

	async function measure() {
		const [sizes, estimate] = await Promise.all([
			measureLibrary(),
			navigator.storage?.estimate?.()
		]);
		storage = { ...sizes, used: estimate?.usage ?? 0, quota: estimate?.quota ?? 0 };
	}

	/** MapLibre keeps downloaded map tiles in the browser cache */
	async function clearMapCache() {
		const names = await caches.keys();
		await Promise.all(names.map((name) => caches.delete(name)));
		cacheCleared = true;
		measure();
	}

	async function exportLibrary() {
		const data = await exportMetadata();
		const date = new Date().toISOString().slice(0, 10);
		downloadText(`waymark-${date}.json`, JSON.stringify(data, null, 2), 'application/json');
	}

	async function deleteLibrary() {
		await library.clear();
		ui.settingsOpen = false;
		goto('/');
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') ui.settingsOpen = false;
	}

	onMount(measure);

	const share = (part: number) =>
		storage?.quota ? Math.max(0.5, (part / storage.quota) * 100) : 0;
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={() => (ui.settingsOpen = false)}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="dialog panel"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label="Ajustes"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="row head">
			<div class="row title">
				<h1 class="t-h2">Ajustes</h1>
				<span class="mono t3 saved">Los cambios se guardan al momento</span>
			</div>
			<div class="row close">
				<span class="kbd">Esc</span>
				<button
					class="btn btn-ghost btn-icon"
					aria-label="Cerrar"
					onclick={() => (ui.settingsOpen = false)}
				>
					<Icon name="x" />
				</button>
			</div>
		</div>

		<div class="columns scroll">
			<div class="col side">
				<div class="grp">
					<h2>Apariencia</h2>
					<div class="set">
						<div class="l">
							<b>Tema</b><span>Sistema sigue la preferencia del dispositivo.</span>
						</div>
						<div class="seg" role="radiogroup" aria-label="Tema">
							<button
								class:is-on={settings.theme === 'dark'}
								role="radio"
								aria-checked={settings.theme === 'dark'}
								onclick={() => (settings.theme = 'dark')}
							>
								<Icon name="moon" />Oscuro
							</button>
							<button
								class:is-on={settings.theme === 'light'}
								role="radio"
								aria-checked={settings.theme === 'light'}
								onclick={() => (settings.theme = 'light')}
							>
								<Icon name="sun" />Claro
							</button>
							<button
								class:is-on={settings.theme === 'system'}
								role="radio"
								aria-checked={settings.theme === 'system'}
								onclick={() => (settings.theme = 'system')}
							>
								Sistema
							</button>
						</div>
					</div>
					<div class="set">
						<div class="l"><b>Idioma</b><span>Nombres de lugares y fechas.</span></div>
						<span class="select">Español (España)</span>
					</div>
					<div class="set">
						<div class="l"><b>Unidades</b><span>Distancias y altitud.</span></div>
						<div class="seg" role="radiogroup" aria-label="Unidades">
							<button
								class:is-on={settings.units === 'km'}
								role="radio"
								aria-checked={settings.units === 'km'}
								onclick={() => (settings.units = 'km')}>km</button
							>
							<button
								class:is-on={settings.units === 'mi'}
								role="radio"
								aria-checked={settings.units === 'mi'}
								onclick={() => (settings.units = 'mi')}>mi</button
							>
						</div>
					</div>
				</div>

				<div class="grp">
					<h2>Mapa</h2>
					<div class="set stack">
						<div class="l">
							<b>Estilo del mapa</b><span>Se aplica al globo y al mapa de calles.</span>
						</div>
						<div class="styles" role="radiogroup" aria-label="Estilo del mapa">
							{#each styles as style (style.id)}
								<button
									class="opt"
									class:is-on={settings.mapStyle === style.id}
									role="radio"
									aria-checked={settings.mapStyle === style.id}
									onclick={() => (settings.mapStyle = style.id)}
								>
									<span class="preview {style.id}"></span>
									<span class="opt-label">{style.label}</span>
								</button>
							{/each}
						</div>
					</div>
					<div class="set">
						<div class="l"><b>Mostrar fronteras</b><span>Líneas finas entre países.</span></div>
						<button
							class="toggle"
							role="switch"
							aria-checked={settings.borders}
							aria-label="Mostrar fronteras"
							onclick={() => (settings.borders = !settings.borders)}
						></button>
					</div>
					<div class="set">
						<div class="l">
							<b>Reducir movimiento</b>
							<span
								>Sin vuelos de cámara: cambios directos con fundido. Activado si el sistema lo pide.</span
							>
						</div>
						<button
							class="toggle"
							role="switch"
							aria-checked={settings.reducedMotion}
							aria-label="Reducir movimiento"
							onclick={() => (settings.reducedMotion = !settings.reducedMotion)}
						></button>
					</div>
				</div>
			</div>

			<div class="col side">
				<div class="grp">
					<h2>Calidad del globo</h2>
					<div class="col qualities" role="radiogroup" aria-label="Calidad del globo">
						{#each qualities as q (q.id)}
							<button
								class="opt quality"
								class:is-on={settings.quality === q.id}
								role="radio"
								aria-checked={settings.quality === q.id}
								onclick={() => (settings.quality = q.id)}
							>
								<span class="radio"></span>
								<span class="col">
									<b
										>{q.label}{#if q.id === 'equilibrada'}
											<span class="mono t3 rec">· recomendada</span>{/if}</b
									>
									<span class="t-small t3">{q.hint}</span>
								</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="grp">
					<h2>Almacenamiento local</h2>
					{#if storage}
						<div class="row between usage">
							<span>
								<span class="mono big">{formatBytes(storage.used)}</span>
								<span class="t3 small"
									>de {formatBytes(storage.quota)} disponibles para Waymark</span
								>
							</span>
							<span class="mono t3"
								>{storage.quota ? Math.round((storage.used / storage.quota) * 100) : 0} %</span
							>
						</div>
						<div class="row bar">
							<i style:width="{share(storage.thumbs)}%" class="a"></i>
							<i style:width="{share(storage.originals)}%" class="b"></i>
							<i
								style:width="{share(
									Math.max(0, storage.used - storage.thumbs - storage.originals)
								)}%"
								class="c"
							></i>
						</div>
						<div class="row legend t-small t2">
							<span class="row"
								><i class="a"></i>Miniaturas
								<span class="mono t3">{formatBytes(storage.thumbs)}</span></span
							>
							<span class="row"
								><i class="b"></i>Fotos
								<span class="mono t3">{formatBytes(storage.originals)}</span></span
							>
							<span class="row"
								><i class="c"></i>Mapas y datos
								<span class="mono t3"
									>{formatBytes(
										Math.max(0, storage.used - storage.thumbs - storage.originals)
									)}</span
								></span
							>
						</div>
					{:else}
						<div class="skel" style:height="60px"></div>
					{/if}
					<div class="row actions">
						<button class="btn btn-secondary btn-sm" onclick={clearMapCache}>
							<Icon name={cacheCleared ? 'check' : 'refresh'} />{cacheCleared
								? 'Caché liberada'
								: 'Liberar caché del mapa'}
						</button>
					</div>
					<p class="row t-small t3 note">
						<Icon name="lock" size={14} />Todo se guarda solo en este navegador. Nada se sube a
						ningún servidor.
					</p>
				</div>

				<div class="grp">
					<h2>Biblioteca</h2>
					<div class="set">
						<div class="l">
							<b>Exportar biblioteca</b><span
								>Un archivo .json con viajes, ubicaciones corregidas y favoritos.</span
							>
						</div>
						<button class="btn btn-secondary btn-sm" onclick={exportLibrary}
							><Icon name="download" />Exportar</button
						>
					</div>
					<div class="set">
						<div class="l">
							<b>Borrar biblioteca</b><span
								>Elimina todo lo guardado en este navegador. Tus fotos originales no se tocan.</span
							>
						</div>
						{#if confirmDelete}
							<div class="row confirm">
								<button class="btn btn-ghost btn-sm" onclick={() => (confirmDelete = false)}
									>Cancelar</button
								>
								<button class="btn btn-danger btn-sm" onclick={deleteLibrary}
									>Sí, borrar todo</button
								>
							</div>
						{:else}
							<button class="btn btn-danger btn-sm" onclick={() => (confirmDelete = true)}
								><Icon name="trash" />Borrar…</button
							>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 70;
		background: oklch(0.12 0.02 258 / 0.45);
		animation: fade 0.15s ease-out;
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
		width: min(1040px, calc(100% - 32px));
		max-height: calc(100% - 32px);
		display: flex;
		flex-direction: column;
		background: var(--glass-strong);
	}

	.head {
		justify-content: space-between;
		padding: 18px 20px 18px 28px;
		border-bottom: 1px solid var(--line);
	}

	.title {
		gap: 12px;
		align-items: baseline;
	}

	.close {
		gap: 8px;
	}

	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.side {
		padding: 20px 28px;
		gap: 24px;
	}

	.side:first-child {
		border-right: 1px solid var(--line);
	}

	.grp h2 {
		font-size: 11px;
		font-weight: 550;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--acc-text);
		margin-bottom: 4px;
	}

	.set {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 0;
		border-top: 1px solid var(--line);
	}

	.grp h2 + .set {
		border-top: 0;
	}

	.set.stack {
		flex-direction: column;
		align-items: stretch;
		gap: 10px;
	}

	.l {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.l b {
		font-size: 13px;
		font-weight: 500;
	}

	.l span {
		font-size: 12px;
		line-height: 16px;
		color: var(--t3);
		text-wrap: pretty;
	}

	.select {
		display: inline-flex;
		align-items: center;
		height: 32px;
		padding: 0 10px;
		border-radius: 8px;
		background: var(--field);
		border: 1px solid var(--line);
		font-size: 13px;
	}

	.styles {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.opt {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px;
		border-radius: 10px;
		border: 1px solid var(--line);
		background: var(--s2);
		text-align: left;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.opt:hover {
		border-color: var(--line-strong);
	}

	.opt.is-on {
		border-color: var(--acc);
		box-shadow: 0 0 0 3px var(--acc-soft);
	}

	.preview {
		height: 56px;
		border-radius: 6px;
	}

	.preview.sobrio {
		background: radial-gradient(circle at 60% 55%, var(--land) 0 28%, var(--ocean) 29%);
	}

	.preview.relieve {
		background: radial-gradient(
			circle at 60% 55%,
			oklch(0.62 0.05 110) 0 28%,
			oklch(0.55 0.05 230) 29%
		);
	}

	.preview.satelite {
		background: radial-gradient(
			circle at 60% 55%,
			oklch(0.42 0.06 140) 0 28%,
			oklch(0.22 0.04 250) 29%
		);
	}

	.opt-label {
		font-size: 12px;
		font-weight: 500;
	}

	.qualities {
		gap: 8px;
		margin-top: 10px;
	}

	.quality {
		flex-direction: row;
		align-items: center;
		gap: 12px;
	}

	.quality b {
		font-size: 13px;
		font-weight: 500;
	}

	.rec {
		font-size: 11px;
		font-weight: 400;
	}

	.radio {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 1.5px solid var(--t3);
		flex: none;
		display: grid;
		place-items: center;
	}

	.is-on .radio {
		border-color: var(--acc);
	}

	.is-on .radio::after {
		content: '';
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--acc);
	}

	.between {
		justify-content: space-between;
		align-items: baseline;
	}

	.usage {
		margin-top: 10px;
	}

	.big {
		font-size: 18px;
		line-height: 24px;
	}

	.small {
		font-size: 13px;
	}

	.bar {
		height: 8px;
		border-radius: 4px;
		overflow: hidden;
		background: var(--s3);
		margin-top: 10px;
		gap: 2px;
	}

	.bar i,
	.legend i {
		display: block;
		height: 100%;
	}

	.a {
		background: var(--acc);
	}

	.b {
		background: var(--t2);
	}

	.c {
		background: var(--t3);
	}

	.legend {
		gap: 16px;
		margin-top: 10px;
		flex-wrap: wrap;
	}

	.legend .row {
		gap: 6px;
	}

	.legend i {
		width: 8px;
		height: 8px;
		border-radius: 2px;
	}

	.actions {
		gap: 8px;
		margin-top: 14px;
	}

	.note {
		gap: 8px;
		margin-top: 14px;
	}

	.confirm {
		gap: 4px;
	}

	@media (max-width: 860px) {
		.columns {
			grid-template-columns: 1fr;
		}

		.side:first-child {
			border-right: 0;
			border-bottom: 1px solid var(--line);
		}

		.saved {
			display: none;
		}
	}
</style>
