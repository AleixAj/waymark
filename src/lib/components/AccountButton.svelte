<script lang="ts">
	import Icon from './ui/Icon.svelte';
	import GoogleMark from './ui/GoogleMark.svelte';
	import { auth } from '$lib/google/auth.svelte';
	import { googleEnabled } from '$lib/google/config';
	import { signIn, signOut, sync, unsyncedPhotos } from '$lib/sync/sync.svelte';
	import { goto } from '$app/navigation';
	import { library } from '$lib/state/library.svelte';
	import { demoMode } from '$lib/state/mode';
	import { i18n } from '$lib/i18n/i18n.svelte';
	import t from '$lib/i18n/messages/account';
	import tc from '$lib/i18n/messages/common';

	let open = $state(false);
	let wrap = $state<HTMLDivElement>();
	let error = $state<string | null>(null);
	let busy = $state(false);
	/** Photos not in Drive yet: signing out asks first, as they would be lost */
	let pending = $state(0);

	async function leave(force = false) {
		error = null;
		busy = true;
		try {
			if (!force) {
				pending = await unsyncedPhotos();
				if (pending > 0) return;
			}
			await signOut();
			pending = 0;
			open = false;
			// The demo keeps its sample photos; otherwise, back to the welcome screen
			if (!demoMode) {
				await library.clear();
				await goto('/');
			}
		} catch {
			error = t('signOutFailed');
		} finally {
			busy = false;
		}
	}

	const account = $derived(auth.account);

	const status = $derived.by(() => {
		if (sync.status === 'syncing') {
			const p = sync.progress;
			return p && p.total ? t('syncingCount', { done: p.done, total: p.total }) : t('syncing');
		}
		if (sync.status === 'reconnect') return t('expired');
		if (sync.status === 'error') return sync.message ?? t('syncFailed');
		if (sync.lastSync) return t('synced', { when: ago(sync.lastSync) });
		return t('neverSynced');
	});

	function ago(time: number) {
		const minutes = Math.round((Date.now() - time) / 60_000);
		if (minutes < 1) return t('justNow');
		if (minutes < 60) return t('minutesAgo', { n: minutes });
		const hours = Math.round(minutes / 60);
		if (hours < 24) return t('hoursAgo', { n: hours });
		return new Date(time).toLocaleDateString(i18n.tag, { day: 'numeric', month: 'short' });
	}

	async function attempt(action: () => Promise<void>) {
		error = null;
		busy = true;
		try {
			await action();
		} catch (e) {
			error = e instanceof Error ? e.message : t('failed');
		} finally {
			busy = false;
		}
	}

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

{#if googleEnabled}
	<div class="wrap" bind:this={wrap}>
		{#if !account}
			<button
				class="btn btn-secondary enter"
				disabled={busy}
				aria-label={t('signIn')}
				onclick={() => attempt(signIn)}
			>
				<GoogleMark /><span class="label">{t('signInShort')}</span>
			</button>
			{#if error}<p class="t-small bubble panel" role="alert">{error}</p>{/if}
		{:else}
			<button
				class="avatar"
				class:syncing={sync.status === 'syncing'}
				class:warn={sync.status === 'reconnect' || sync.status === 'error'}
				aria-label={t('yourAccount', { name: account.name })}
				aria-expanded={open}
				onclick={() => (open = !open)}
			>
				{#if account.picture}
					<img src={account.picture} alt="" referrerpolicy="no-referrer" />
				{:else}
					<span>{account.name.charAt(0).toUpperCase()}</span>
				{/if}
			</button>
			{#if open}
				<div class="menu panel" role="menu">
					<div class="who">
						<b>{account.name}</b>
						<span class="t-small t3">{account.email}</span>
					</div>
					<div class="row t-small state" class:is-warn={sync.status === 'error'}>
						<Icon name={sync.status === 'idle' ? 'checkCircle' : 'refresh'} size={16} />
						{status}
					</div>
					{#if error}<p class="t-small err">{error}</p>{/if}
					<div class="hr"></div>
					<button
						class="menu-item"
						role="menuitem"
						disabled={busy || sync.status === 'syncing'}
						onclick={() => attempt(() => sync.run(true))}
					>
						<Icon name="refresh" />{t('syncNow')}
					</button>
					{#if pending > 0}
						<div class="col confirm" role="alert">
							<p class="t-small">
								{t('pending', { n: pending })}
							</p>
							<div class="row buttons">
								<button class="btn btn-ghost btn-sm" onclick={() => (pending = 0)}
									>{tc('cancel')}</button
								>
								<button class="btn btn-danger btn-sm" disabled={busy} onclick={() => leave(true)}
									>{t('leaveAnyway')}</button
								>
							</div>
						</div>
					{:else}
						<button class="menu-item" role="menuitem" disabled={busy} onclick={() => leave()}>
							<Icon name="arrowL" />{busy ? t('saving') : t('signOut')}
						</button>
						<p class="t-small t3 foot">{t('savedNote')}</p>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.wrap {
		position: relative;
	}

	.avatar {
		width: 34px;
		height: 34px;
		padding: 0;
		border-radius: 50%;
		overflow: hidden;
		display: grid;
		place-items: center;
		background: var(--s3);
		color: var(--t1);
		font-weight: 600;
		border: 2px solid transparent;
		box-shadow: 0 0 0 1px var(--line-strong);
		transition: box-shadow 0.2s;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar.syncing {
		box-shadow: 0 0 0 2px var(--acc);
		animation: pulse 1.4s ease-in-out infinite;
	}

	.avatar.warn {
		box-shadow: 0 0 0 2px var(--warn);
	}

	@keyframes pulse {
		50% {
			box-shadow: 0 0 0 2px var(--acc-glow);
		}
	}

	.menu {
		position: absolute;
		top: 44px;
		right: 0;
		z-index: 30;
		width: 280px;
		background: var(--glass-strong);
	}

	.who {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px 10px 4px;
		overflow-wrap: anywhere;
	}

	.state {
		gap: 8px;
		padding: 4px 10px 8px;
		color: var(--t2);
	}

	.state.is-warn,
	.err {
		color: var(--err);
	}

	.err {
		padding: 0 10px 8px;
	}

	.foot {
		padding: 6px 10px 4px;
	}

	.confirm {
		gap: 10px;
		padding: 8px 10px 6px;
	}

	.confirm .buttons {
		justify-content: flex-end;
		gap: 6px;
	}

	/* Phones: only the Google mark, so the menu button keeps its space */
	@media (max-width: 767px) {
		.enter .label {
			display: none;
		}

		.enter {
			padding: 0 10px;
		}
	}

	.bubble {
		position: absolute;
		top: 44px;
		right: 0;
		width: 260px;
		padding: 10px 12px;
		color: var(--err);
		background: var(--glass-strong);
		z-index: 30;
	}
</style>
