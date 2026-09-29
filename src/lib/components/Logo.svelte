<script lang="ts">
	let { size = 22 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
	<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
	<ellipse cx="12" cy="12" rx="3.6" ry="9" stroke="currentColor" stroke-width="1.5" opacity=".55" />
	<circle cx="15.2" cy="8.4" r="2.1" fill="var(--acc)" />
</svg>
