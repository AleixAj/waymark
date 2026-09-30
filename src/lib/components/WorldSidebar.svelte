<script module lang="ts">
	// The totals count up only the first time the panel appears
	let counted = false;
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import Icon from './ui/Icon.svelte';
	import { sheet } from './ui/sheet';
	import { library } from '$lib/state/library.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { thumbUrl } from '$lib/state/thumbs.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { formatNumber, formatRange, formatMonth } from '$lib/library/format';
	import tc from '$lib/i18n/messages/common';
	import t from '$lib/i18n/messages/sidebar';

	let sortBy = $state<'fotos' | 'fecha'>('fotos');

	const importing = $derived(library.progress !== null);

	// The three totals count up from zero when the panel first appears
	const fromZero = !counted;
	counted = true;
	function countUp(value: () => number) {
		const tween = new Tween(fromZero ? 0 : value(), {
			duration: settings.reducedMotion ? 0 : 1100,
			easing: cubicOut
		});
		$effect(() => {
			tween.target = value();
		});
		return tween;
	}
	const shownCountries = countUp(() => library.countryList.length);
	const shownCities = countUp(() => library.cityList.length);
	const shownPhotos = countUp(() => library.points.length);
	const countryRows = $derived(
		sortBy === 'fotos'
			? library.countryList
			: [...library.countryList].sort((a, b) => b.last - a.last)
	);
	const maxCount = $derived(Math.max(1, ...library.countryList.map((c) => c.count)));
</script>

{#if ui.sidebarOpen}
	<aside class="side panel" aria-label={t('library')} aria-busy={importing} use:sheet={'peek'}>
		<div class="head">
			<div class="row between">
				<span class="t-h3">{t('yourWorld')}</span>
				<button
					class="btn btn-ghost btn-icon btn-sm"
					aria-label={t('collapse')}
					onclick={() => (ui.sidebarOpen = false)}
				>
					<Icon name="sidebar" />
				</button>
			</div>
			<span class="mono t3 summary">
				{tc('countries', { n: library.countryList.length })} · {tc('photos', {
					n: library.points.length
				})}
			</span>
			<div class="row stats">
				<div class="col">
					<span class="mono num">{formatNumber(shownCountries.current)}</span>
					<span class="t-small t3">{tc('countriesWord', { n: library.countryList.length })}</span>
				</div>
				<div class="col">
					<span class="mono num">{formatNumber(shownCities.current)}</span>
					<span class="t-small t3">{tc('citiesWord', { n: library.cityList.length })}</span>
				</div>
				<div class="col">
					<span class="mono num">{formatNumber(shownPhotos.current)}</span>
					<span class="t-small t3">{tc('photosWord', { n: library.points.length })}</span>
				</div>
			</div>
		</div>

		<div class="scroll">
			<div class="sec-h trips-h">
				<h3>{t('trips')}</h3>
				{#if importing}<span class="t-small t3">{t('detecting')}</span>{/if}
			</div>
			{#if importing && library.trips.length === 0}
				<div class="col skeletons">
					{#each [0, 1, 2, 3] as i (i)}
						<div class="row sk-row">
							<div class="skel sk-img" style:animation-delay="{i * 0.12}s"></div>
							<div class="col sk-lines">
								<div class="skel" style:height="10px" style:width="{70 - i * 9}%"></div>
								<div class="skel" style:height="8px" style:width="40%"></div>
							</div>
						</div>
					{/each}
				</div>
			{:else if library.trips.length === 0}
				<p class="t-small t3 empty-note">
					{t('noTrips')}
				</p>
			{/if}
			<div class="col list trips stagger">
				{#each library.trips as trip (trip.id)}
					<a class="place" href="/viaje/{trip.id}">
						<span
							class="cover"
							style:background-image={thumbUrl(trip.coverId)
								? `url(${thumbUrl(trip.coverId)})`
								: undefined}
						></span>
						<div class="col grow">
							<span class="nm">{trip.title}</span>
							<span class="mt">{formatRange(trip.start, trip.end)}</span>
						</div>
						<span class="ct">{formatNumber(trip.photoIds.length)}</span>
					</a>
				{/each}
			</div>

			{#if library.countryList.length}
				<div class="sec-h countries-h">
					<h3>{t('countries')}</h3>
					<div class="seg" role="group" aria-label={t('sortCountries')}>
						<button class:is-on={sortBy === 'fotos'} onclick={() => (sortBy = 'fotos')}
							>{t('byPhotos')}</button
						>
						<button class:is-on={sortBy === 'fecha'} onclick={() => (sortBy = 'fecha')}
							>{t('byDate')}</button
						>
					</div>
				</div>
				<div class="col list countries">
					{#each countryRows as row (row.iso3)}
						<a class="place country" href="/pais/{row.iso3}">
							<span class="code">{row.iso3}</span>
							<div class="col grow bar-col">
								<div class="row between">
									<span class="nm">{countries.name(row.iso3)}</span>
									<span class="mono t2">
										{sortBy === 'fotos' ? formatNumber(row.count) : formatMonth(row.last)}
									</span>
								</div>
								<div class="bar"><i style:width="{(row.count / maxCount) * 100}%"></i></div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</aside>
{/if}

<style>
	.head {
		padding: 16px 16px 14px;
		border-bottom: 1px solid var(--line);
	}

	.between {
		justify-content: space-between;
	}

	.stats {
		gap: 16px;
		margin-top: 10px;
	}

	.num {
		font-size: 18px;
		line-height: 24px;
		color: var(--t1);
	}

	.list {
		padding: 0 8px;
		gap: 2px;
	}

	.countries {
		padding-bottom: 12px;
		gap: 0;
	}

	.place {
		color: inherit;
		text-decoration: none;
	}

	.cover {
		width: 44px;
		height: 44px;
		flex: none;
		border-radius: 8px;
		background: var(--s3) center / cover;
		box-shadow: 0 0 0 1px var(--line);
		transition: transform var(--dur) var(--ease-spring);
	}

	.place:hover .cover {
		transform: scale(1.06) rotate(-2deg);
	}

	.grow {
		flex: 1;
		min-width: 0;
	}

	.country {
		padding: 7px 8px;
		gap: 10px;
	}

	.bar-col {
		gap: 5px;
	}

	.bar {
		height: 3px;
		border-radius: 2px;
		background: color-mix(in oklab, var(--acc) 12%, var(--s2));
	}

	.bar i {
		display: block;
		height: 100%;
		border-radius: 2px;
		transform-origin: left;
		animation: fill 0.8s 0.25s var(--ease-out) both;
		background: linear-gradient(90deg, color-mix(in oklab, var(--acc) 45%, var(--s2)), var(--acc));
	}

	.countries-h {
		padding-top: 20px;
	}

	.summary {
		display: none;
	}

	.skeletons {
		padding: 0 16px 8px;
		gap: 16px;
	}

	.sk-row {
		gap: 12px;
	}

	.sk-img {
		width: 44px;
		height: 44px;
		border-radius: 8px;
	}

	.sk-lines {
		gap: 7px;
		flex: 1;
	}

	.empty-note {
		padding: 0 16px 8px;
	}

	/* Phones: trips become big cards you scroll sideways */
	@media (max-width: 767px) {
		.head {
			padding: 4px 20px 12px;
			border-bottom: 0;
			display: flex;
			align-items: baseline;
			justify-content: space-between;
		}

		.head .between {
			flex: none;
		}

		.head .btn,
		.stats,
		.trips-h {
			display: none;
		}

		.summary {
			display: block;
		}

		.trips {
			flex-direction: row;
			overflow-x: auto;
			gap: 10px;
			padding: 0 20px 8px;
			scroll-snap-type: x mandatory;
			scroll-padding-left: 20px;
			scrollbar-width: none;
		}

		.trips .place {
			flex-direction: column;
			align-items: stretch;
			width: 148px;
			flex: none;
			padding: 0;
			gap: 8px;
			scroll-snap-align: start;
		}

		.trips .cover {
			width: 100%;
			height: auto;
			aspect-ratio: 4 / 3;
			border-radius: 10px;
		}

		.trips .ct {
			display: none;
		}
	}

	@keyframes fill {
		from {
			transform: scaleX(0);
		}
	}
</style>
