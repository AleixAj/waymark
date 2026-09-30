<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import Modal from './ui/Modal.svelte';
	import ServiceMark from './ui/ServiceMark.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { importFromDevice, importFromDrive, importTakeout } from '$lib/state/importing';
	import { auth } from '$lib/google/auth.svelte';
	import { drivePickerEnabled, googleEnabled } from '$lib/google/config';
	import { signIn } from '$lib/sync/sync.svelte';
	import t from '$lib/i18n/messages/importing';

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
			error = e instanceof Error ? e.message : t('driveFailed');
		} finally {
			busy = false;
		}
	}
</script>

<Modal
	title={onlyTakeout ? t('fromPhotosTitle') : t('title')}
	subtitle={onlyTakeout ? t('fromPhotosSubtitle') : t('subtitle')}
	width={onlyTakeout ? 540 : 620}
	onclose={() => ui.closeImport()}
>
	<div class="col options">
		{#if !onlyTakeout}
			<section class="option">
				<div class="icon device"><Icon name="upload" /></div>
				<div class="col text">
					<h2>{t('deviceTitle')}</h2>
					<p class="t-small t3">
						{t('deviceText')}
					</p>
					<div class="row buttons">
						<button class="btn btn-primary btn-sm" onclick={() => importFromDevice(false)}
							><Icon name="image" />{t('choosePhotos')}</button
						>
						<button class="btn btn-secondary btn-sm" onclick={() => importFromDevice(true)}
							><Icon name="folder" />{t('chooseFolder')}</button
						>
					</div>
				</div>
			</section>

			{#if drivePickerEnabled}
				<section class="option">
					<div class="icon"><ServiceMark service="drive" size={22} /></div>
					<div class="col text">
						<h2>{t('driveTitle')}</h2>
						<p class="t-small t3">
							{t('driveText')}
						</p>
						<div class="row buttons">
							<button class="btn btn-secondary btn-sm" disabled={busy} onclick={fromDrive}
								>{auth.signedIn ? t('driveChoose') : t('driveSignIn')}</button
							>
						</div>
					</div>
				</section>
			{/if}
		{/if}

		<section class="option" class:plain={onlyTakeout}>
			{#if !onlyTakeout}<div class="icon"><ServiceMark service="photos" size={22} /></div>{/if}
			<div class="col text">
				{#if !onlyTakeout}<h2>{t('photosTitle')}</h2>{/if}
				<p class="t-small t3">
					{t('photosText')}
				</p>
				<ol class="steps">
					<li>
						<span class="num mono">1</span>
						<span
							>{t('step1Open')}
							<a
								href="https://takeout.google.com/settings/takeout/custom/photos"
								target="_blank"
								rel="noopener noreferrer">Google Takeout</a
							>{t('step1Press')} <b>{t('step1Button')}</b>
							{t('step1End')}</span
						>
					</li>
					<li>
						<span class="num mono">2</span>
						<span>{t('step2Press')} <b>{t('step2Button')}</b>{t('step2End')}</span>
					</li>
					<li>
						<span class="num mono">3</span>
						<span>{t('step3')}</span>
					</li>
				</ol>
				<div class="row buttons">
					<button
						class="btn btn-sm"
						class:btn-primary={onlyTakeout}
						class:btn-secondary={!onlyTakeout}
						onclick={() => importTakeout(false)}><Icon name="upload" />{t('chooseZip')}</button
					>
					<button class="btn btn-ghost btn-sm" onclick={() => importTakeout(true)}
						><Icon name="folder" />{t('unzippedFolder')}</button
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
				{t('noteSynced')}
			{:else if googleEnabled}
				{t('noteSignIn')}
			{:else}
				{t('noteLocal')}
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

	.steps b {
		font-weight: 500;
		color: var(--t1);
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
