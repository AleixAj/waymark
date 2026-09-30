<script lang="ts">
	import { untrack } from 'svelte';
	import Modal from './ui/Modal.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { importAlbums } from '$lib/state/importing';
	import type { TakeoutAlbum } from '$lib/photos/takeout';
	import t from '$lib/i18n/messages/importing';
	import tc from '$lib/i18n/messages/common';

	let { albums }: { albums: TakeoutAlbum[] } = $props();

	// Everything starts selected; the user unticks what they don't want
	let chosen = $state(untrack(() => new Set(albums.map((a) => a.id))));

	const named = $derived(albums.filter((a) => !a.byYear));
	const years = $derived(albums.filter((a) => a.byYear));
	const selected = $derived(albums.filter((a) => chosen.has(a.id)));
	const photoCount = $derived(selected.reduce((sum, a) => sum + a.items.length, 0));

	function toggle(id: string) {
		const next = new Set(chosen);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		chosen = next;
	}

	function setAll(list: TakeoutAlbum[], on: boolean) {
		const next = new Set(chosen);
		for (const album of list) {
			if (on) next.add(album.id);
			else next.delete(album.id);
		}
		chosen = next;
	}
</script>

{#snippet group(title: string, list: TakeoutAlbum[])}
	<div class="row group-head">
		<h2 class="t-label">{title}</h2>
		<span class="row links">
			<button class="link" onclick={() => setAll(list, true)}>{t('all')}</button>
			<button class="link" onclick={() => setAll(list, false)}>{t('none')}</button>
		</span>
	</div>
	<ul class="list">
		{#each list as album (album.id)}
			<li>
				<label class="row album">
					<input type="checkbox" checked={chosen.has(album.id)} onchange={() => toggle(album.id)} />
					<span class="name">{album.name}</span>
					<span class="mono t3 count">{tc('photos', { n: album.items.length })}</span>
				</label>
			</li>
		{/each}
	</ul>
{/snippet}

<Modal
	title={t('albumsTitle')}
	subtitle={t('albumsSubtitle')}
	width={600}
	onclose={() => (ui.takeout = null)}
>
	{#if named.length}{@render group(t('albums'), named)}{/if}
	{#if years.length}{@render group(t('byYear'), years)}{/if}

	{#snippet footer()}
		<span class="t-small t3 total">{tc('photos', { n: photoCount })}</span>
		<button class="btn btn-ghost" onclick={() => (ui.takeout = null)}>{tc('cancel')}</button>
		<button
			class="btn btn-primary"
			disabled={photoCount === 0}
			onclick={() => importAlbums(selected)}>{t('import')}</button
		>
	{/snippet}
</Modal>

<style>
	.group-head {
		justify-content: space-between;
		margin-bottom: 6px;
	}

	.group-head:not(:first-child) {
		margin-top: 18px;
	}

	.links {
		gap: 12px;
	}

	.link {
		font-size: 12px;
		color: var(--acc-text);
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 10px;
		overflow: hidden;
	}

	.list li + li {
		border-top: 1px solid var(--line);
	}

	.album {
		gap: 10px;
		padding: 10px 12px;
		cursor: pointer;
	}

	.album:hover {
		background: var(--hover);
	}

	input {
		accent-color: var(--acc);
		width: 16px;
		height: 16px;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--t1);
	}

	.count {
		font-size: 11px;
		white-space: nowrap;
	}

	.total {
		margin-right: auto;
	}
</style>
