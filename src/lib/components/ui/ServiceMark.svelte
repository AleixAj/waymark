<script lang="ts">
	let { service, size = 18 }: { service: 'drive' | 'photos'; size?: number } = $props();
</script>

<!-- Small marks of the Google services, so each button is recognised at a glance -->
{#if service === 'drive'}
	<svg width={size} height={size} viewBox="0 0 87.3 78" aria-hidden="true">
		<path
			fill="#0066da"
			d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z"
		/>
		<path
			fill="#00ac47"
			d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9 9 0 0 0 0 53h27.5z"
		/>
		<path
			fill="#ea4335"
			d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z"
		/>
		<path
			fill="#00832d"
			d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"
		/>
		<path
			fill="#2684fc"
			d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
		/>
		<path
			fill="#ffba00"
			d="M73.4 26.5L60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"
		/>
	</svg>
{:else}
	<svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<path fill="#fbbc04" d="M12 12V2.5A4.75 4.75 0 0 0 7.25 7.25V12z" />
		<path fill="#ea4335" d="M12 12h9.5a4.75 4.75 0 0 0-4.75-4.75H12z" />
		<path fill="#4285f4" d="M12 12v9.5a4.75 4.75 0 0 0 4.75-4.75V12z" />
		<path fill="#34a853" d="M12 12H2.5a4.75 4.75 0 0 0 4.75 4.75H12z" />
	</svg>
{/if}
