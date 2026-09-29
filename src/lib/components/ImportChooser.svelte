<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import Modal from './ui/Modal.svelte';
	import ServiceMark from './ui/ServiceMark.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { importFromDevice, importFromDrive, importTakeout } from '$lib/state/importing';
	import { auth } from '$lib/google/auth.svelte';
	import { drivePickerEnabled, googleEnabled } from '$lib/google/config';
	import { signIn } from '$lib/sync/sync.svelte';

	// From the "Google Fotos" button only the Takeout steps are shown
	const onlyTakeout = ui.importOnly === 'takeout';

	let error = $state<string | null>(null);
	let busy = $state(false);

	/** Drive needs the Google account: signing in comes first when there is none */
	async function fromDrive() {
		error = null;
		busy = true;
		try {
			if (!auth.signedIn) await signIn();
			await importFromDrive();
		} catch (e) {
			error = e instanceof Error ? e.message : 'No se pudo abrir Google Drive';
		} finally {
			busy = false;
		}
	}
</script>

<Modal
	title={onlyTakeout ? 'Importar desde Google Fotos' : 'Importar fotos'}
	subtitle={onlyTakeout
		? 'Tres pasos, y tus álbumes aparecen en el globo con su ubicación.'
		: 'Elige de dónde vienen. Leemos la ubicación de cada foto para colocarla en el globo.'}
	width={onlyTakeout ? 540 : 620}
	onclose={() => ui.closeImport()}
>
	<div class="col options">
		{#if !onlyTakeout}
			<section class="option">
				<div class="icon device"><Icon name="upload" /></div>
				<div class="col text">
					<h2>Desde este dispositivo</h2>
					<p class="t-small t3">
						Elige fotos o carpetas, o arrástralas a la ventana. JPG, HEIC, RAW y más.
					</p>
					<div class="row buttons">
						<button class="btn btn-primary btn-sm" onclick={() => importFromDevice(false)}
							><Icon name="image" />Elegir fotos</button
						>
						<button class="btn btn-secondary btn-sm" onclick={() => importFromDevice(true)}
							><Icon name="folder" />Elegir carpeta</button
						>
					</div>
				</div>
			</section>

			{#if drivePickerEnabled}
				<section class="option">
					<div class="icon"><ServiceMark service="drive" size={22} /></div>
					<div class="col text">
						<h2>Desde Google Drive</h2>
						<p class="t-small t3">
							Elige fotos que ya tienes en tu Drive. No se duplican: Waymark las lee desde allí.
						</p>
						<div class="row buttons">
							<button class="btn btn-secondary btn-sm" disabled={busy} onclick={fromDrive}
								>{auth.signedIn ? 'Elegir en Drive' : 'Entrar y elegir en Drive'}</button
							>
						</div>
					</div>
				</section>
			{/if}
		{/if}

		<section class="option" class:plain={onlyTakeout}>
			{#if !onlyTakeout}<div class="icon"><ServiceMark service="photos" size={22} /></div>{/if}
			<div class="col text">
				{#if !onlyTakeout}<h2>Desde Google Fotos</h2>{/if}
				<p class="t-small t3">
					Google Fotos no deja a otras apps leer la ubicación de tus fotos, pero su exportación
					(Google Takeout) sí la conserva.
				</p>
				<ol class="steps">
					<li>
						<span class="num mono">1</span>
						<span
							>Abre <a
								href="https://takeout.google.com/settings/takeout/custom/photos"
								target="_blank"
								rel="noopener noreferrer">Google Takeout</a
							> y elige los álbumes que quieras.</span
						>
					</li>
					<li>
						<span class="num mono">2</span>
						<span>Exporta en archivos .zip y descárgalos.</span>
					</li>
					<li>
						<span class="num mono">3</span>
						<span>Súbelos aquí y elige qué álbumes ver en el globo.</span>
					</li>
				</ol>
				<div class="row buttons">
					<button
						class="btn btn-sm"
						class:btn-primary={onlyTakeout}
						class:btn-secondary={!onlyTakeout}
						onclick={() => importTakeout(false)}><Icon name="upload" />Elegir archivos .zip</button
					>
					<button class="btn btn-ghost btn-sm" onclick={() => importTakeout(true)}
						><Icon name="folder" />Carpeta ya descomprimida</button
					>
				</div>
			</div>
		</section>
	</div>

	{#if error}<p class="t-small err" role="alert">{error}</p>{/if}

	{#if !onlyTakeout}
		<p class="row t-small t3 note">
			<Icon name="lock" size={16} />
			{#if auth.signedIn}
				Se guarda una copia ligera en la carpeta Waymark de tu Drive para verlas en todos tus
				dispositivos.
			{:else if googleEnabled}
				Tus fotos se quedan en este navegador. Entra con Google para verlas en todos tus
				dispositivos.
			{:else}
				Tus fotos se quedan en este navegador.
			{/if}
		</p>
	{/if}
</Modal>

<style>
	.options {
		gap: 10px;
	}

	.option {
		display: flex;
		gap: 14px;
		padding: 16px;
		border-radius: 12px;
		background: var(--field);
		border: 1px solid var(--line);
	}

	.option.plain {
		padding: 0;
		background: none;
		border: 0;
	}

	.icon {
		flex: none;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		background: var(--s3);
	}

	.icon.device {
		background: var(--acc-soft);
		color: var(--acc-text);
	}

	.text {
		gap: 4px;
		min-width: 0;
	}

	h2 {
		font-size: 15px;
		font-weight: 600;
		color: var(--t1);
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 12px 0 4px;
		padding: 0;
		list-style: none;
		font-size: 13px;
		line-height: 20px;
		color: var(--t2);
	}

	.steps li {
		display: flex;
		gap: 10px;
	}

	.num {
		flex: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 11px;
		background: var(--acc-soft);
		color: var(--acc-text);
	}

	.steps a {
		color: var(--acc-text);
	}

	.buttons {
		gap: 8px;
		margin-top: 10px;
		flex-wrap: wrap;
	}

	.err {
		margin-top: 12px;
		color: var(--err);
	}

	.note {
		gap: 8px;
		margin-top: 16px;
		align-items: flex-start;
	}
</style>
