<script lang="ts">
	import { untrack } from 'svelte';
	import Welcome from '$lib/components/Welcome.svelte';
	import WorldSidebar from '$lib/components/WorldSidebar.svelte';
	import Timeline from '$lib/components/Timeline.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { library } from '$lib/state/library.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { mapView } from '$lib/map/view.svelte';
	import { demoMode } from '$lib/state/mode';
	import { canImport } from '$lib/state/importing';

	// Same rule as the layout: no photos, or no Google account, shows the welcome screen
	const welcome = $derived((library.isEmpty || !canImport()) && !demoMode);

	// World view: every photo, no labels, camera centered next to the sidebar
	$effect(() => {
		mapView.focus = null;
		mapView.route = null;
		mapView.points = null;
		mapView.labels = false;
		mapView.padding = { top: 90, bottom: 110, left: ui.sidebarOpen ? 350 : 20, right: 70 };
	});

	// When the first photos arrive the welcome globe moves to make room for the sidebar
	let wasWelcome = untrack(() => welcome);
	$effect(() => {
		if (wasWelcome && !welcome) {
			wasWelcome = false;
			mapView.world();
		}
	});
</script>

<svelte:head><title>Waymark</title></svelte:head>

{#if welcome}
	<Welcome />
{:else if library.isEmpty}
	<!-- In demo mode only the globe shows while the sample library loads -->
{:else}
	<WorldSidebar />
	{#if !ui.sidebarOpen}
		<button
			class="open-side panel btn btn-ghost btn-icon"
			aria-label="Mostrar panel"
			onclick={() => (ui.sidebarOpen = true)}
		>
			<Icon name="sidebar" />
		</button>
	{/if}
	<!-- The zone panel takes the right side: the controls move to its left -->
	<MapControls
		style={[library.progress && 'bottom: 320px', ui.zone && 'right: 452px']
			.filter(Boolean)
			.join(';')}
	/>
	{#if !library.progress}
		<Timeline style={ui.zone ? 'right: 452px' : ''} />
	{/if}
{/if}

<style>
	.open-side {
		position: absolute;
		top: 84px;
		left: 16px;
		z-index: 10;
		width: 40px;
		height: 40px;
		border-radius: 12px;
	}
</style>
