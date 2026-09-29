<script lang="ts">
	import { ICONS, type IconName } from './icons';

	interface Props {
		name: IconName;
		size?: number;
		filled?: boolean;
		class?: string;
	}

	let { name, size = 18, filled = false, class: className = '' }: Props = $props();
</script>

<!-- The markup comes from our own constant list, never from user input -->
<svg
	class="i {className}"
	class:filled
	viewBox="0 0 24 24"
	width={size}
	height={size}
	aria-hidden="true"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html ICONS[name]}
</svg>

<style>
	.i {
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.filled {
		fill: currentColor;
	}
</style>
