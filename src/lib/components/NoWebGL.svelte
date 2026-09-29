<script lang="ts">
	import FlatWorld from './stats/FlatWorld.svelte';
	import Icon from './ui/Icon.svelte';
	import { library } from '$lib/state/library.svelte';
	import { cityCounts } from '$lib/library/stats';

	// Without WebGL there is no globe. A flat SVG map keeps the app usable:
	// the panels, lists, viewer and statistics don't need WebGL.
	let dismissed = $state(false);

	const dots = $derived(
		cityCounts(library.located)
			.slice(0, 30)
			.map((c) => library.located.find((p) => p.city === c.city)!)
	);
</script>

<div class="fallback">
	<FlatWorld visited={library.visited} {dots} />
</div>

{#if !dismissed}
	<div class="notice solid empty" role="alert">
		<svg class="ill" viewBox="0 0 72 72" aria-hidden="true">
			<circle cx="36" cy="36" r="22" /><ellipse cx="36" cy="36" rx="9" ry="22" /><path
				d="M14 36h44"
			/>
			<path class="a" d="M16 56L56 16" />
		</svg>
		<h3>Tu navegador no puede mostrar el globo 3D</h3>
		<p>
			Falta soporte para WebGL o está desactivado. Puedes seguir con el mapa plano: tiene las mismas
			fotos y funciones.
		</p>
		<div class="row buttons">
			<button class="btn btn-primary btn-sm" onclick={() => (dismissed = true)}>
				<Icon name="map" />Usar mapa plano
			</button>
			<a
				class="btn btn-ghost btn-sm"
				href="https://get.webgl.org/"
				target="_blank"
				rel="noreferrer"
			>
				Cómo activar WebGL
			</a>
		</div>
	</div>
{/if}

<style>
	.fallback {
		position: absolute;
		inset: 90px 40px 110px 360px;
		display: flex;
		opacity: 0.9;
	}

	.notice {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(440px, calc(100% - 32px));
		padding: 28px 32px;
		z-index: 40;
	}

	.buttons {
		gap: 8px;
		margin-top: 18px;
	}

	@media (max-width: 767px) {
		.fallback {
			inset: 70px 8px 45% 8px;
		}
	}
</style>
