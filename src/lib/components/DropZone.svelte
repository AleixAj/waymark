<script lang="ts">
	interface Props {
		onFiles: (files: File[]) => void;
	}

	let { onFiles }: Props = $props();
	let dragging = $state(false);
	let input: HTMLInputElement;

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const files = Array.from(event.dataTransfer?.files ?? []);
		if (files.length) onFiles(files);
	}

	function handlePick() {
		const files = Array.from(input.files ?? []);
		if (files.length) onFiles(files);
		input.value = '';
	}
</script>

<!-- The whole window accepts dropped photos -->
<svelte:window
	ondragover={(e) => {
		e.preventDefault();
		dragging = true;
	}}
	ondragleave={(e) => {
		if (!e.relatedTarget) dragging = false;
	}}
	ondrop={handleDrop}
/>

<button class="pick" onclick={() => input.click()}>Importar fotos</button>
<input bind:this={input} type="file" accept="image/*" multiple hidden onchange={handlePick} />

{#if dragging}
	<div class="overlay">Suelta las fotos para colocarlas en el globo</div>
{/if}

<style>
	.pick {
		padding: 10px 16px;
		border: 0;
		border-radius: var(--radius-button);
		background: var(--accent);
		color: #1a1204;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.overlay {
		position: fixed;
		inset: 12px;
		z-index: 10;
		display: grid;
		place-items: center;
		border: 2px dashed var(--accent);
		border-radius: var(--radius-panel);
		background: rgb(7 11 20 / 0.6);
		font-size: 18px;
		pointer-events: none;
	}
</style>
