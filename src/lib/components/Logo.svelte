<script lang="ts">
	import logo from '$lib/assets/logo.webp';

	// Height in px; the drawing is a bit wider than tall
	let { size = 24 }: { size?: number } = $props();
</script>

<img class="logo-mark" src={logo} alt="" height={size} width={Math.round(size * 1.23)} />

<style>
	.logo-mark {
		display: block;
		flex: none;
	}

	/* On the dark theme the navy outline disappears: a thin cream line brings it back */
	:global([data-theme='dark']) .logo-mark {
		filter: drop-shadow(0 0 0.6px #ffe9c4) drop-shadow(0 0 0.6px #ffe9c4);
	}
</style>
