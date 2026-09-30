<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import FlatWorld from '$lib/components/stats/FlatWorld.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { library } from '$lib/state/library.svelte';
	import { countries } from '$lib/state/countries.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import {
		cityCounts,
		countrySummaries,
		extremes,
		farthestFromHome,
		photosPerYear
	} from '$lib/library/stats';
	import { distanceKm } from '$lib/geo/distance';
	import { EQUATOR_KM } from '$lib/geo/distance';
	import { TOTAL_COUNTRIES } from '$lib/geo/countries';
	import {
		formatDecimal,
		formatLat,
		formatLng,
		formatMonth,
		formatNumber
	} from '$lib/library/format';
	import t from '$lib/i18n/messages/stats';
	import tc from '$lib/i18n/messages/common';

	// The data files name continents in Spanish
	const CONTINENTS = {
		África: 'africa',
		América: 'america',
		Antártida: 'antarctica',
		Asia: 'asia',
		Europa: 'europe',
		Oceanía: 'oceania'
	} as const;

	let year = $state<number | null>(null);

	const allYears = $derived(
		photosPerYear(library.located)
			.map((y) => y.year)
			.reverse()
	);
	// The last four years, plus an older one chosen in the chart so it shows as selected
	const shownYears = $derived(
		year && !allYears.slice(0, 4).includes(year)
			? [...allYears.slice(0, 3), year]
			: allYears.slice(0, 4)
	);
	const points = $derived(
		year
			? library.located.filter((p) => new Date(p.takenAt).getFullYear() === year)
			: library.located
	);
	const trips = $derived(
		year ? library.trips.filter((t) => new Date(t.start).getFullYear() === year) : library.trips
	);

	const countryList = $derived(countrySummaries(points));
	const continents = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const c of countryList) {
			const continent = countries.info(c.iso3)?.continent as keyof typeof CONTINENTS | undefined;
			const name = t(continent && CONTINENTS[continent] ? CONTINENTS[continent] : 'other');
			counts.set(name, (counts.get(name) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	});
	const cities = $derived(cityCounts(points).slice(0, 6));
	const perYear = $derived(photosPerYear(library.located));
	const maxYear = $derived(
		perYear.reduce((best, y) => (y.count > best.count ? y : best), { year: 0, count: 1 })
	);
	const ends = $derived(extremes(points));
	const farthest = $derived(farthestFromHome(points, library.home));

	// Every trip: from home to the first stop, the route, and back home
	const totalKm = $derived.by(() => {
		const home = library.home;
		let km = 0;
		for (const trip of trips) {
			km += trip.km;
			if (home) {
				const first = trip.stops[0];
				const last = trip.stops[trip.stops.length - 1];
				km += distanceKm(home.lat, home.lng, first.lat, first.lng);
				km += distanceKm(last.lat, last.lng, home.lat, home.lng);
			}
		}
		return Math.round(km);
	});
	const laps = $derived(totalKm / EQUATOR_KM);
	const longestTrip = $derived(
		trips.reduce<(typeof trips)[number] | null>((a, t) => (!a || t.days > a.days ? t : a), null)
	);
	const kmTrip = $derived(
		trips.reduce<(typeof trips)[number] | null>((a, t) => (!a || t.km > a.km ? t : a), null)
	);
	const topCities = $derived(cityCounts(points).slice(0, 8));

	const range = $derived(
		points.length
			? `${formatMonth(points[0].takenAt)} – ${formatMonth(points[points.length - 1].takenAt)}`
			: ''
	);
	const unit = $derived(settings.units);
	const dist = (km: number) => formatNumber(settings.distance(km));

	// The big numbers count up when the page opens and when the year changes
	function countUp(value: () => number) {
		const tween = new Tween(0, { duration: settings.reducedMotion ? 0 : 900, easing: cubicOut });
		$effect(() => {
			tween.target = value();
		});
		return tween;
	}
	const shownCountries = countUp(() => countryList.length);
	const shownKm = countUp(() => totalKm);
</script>

<svelte:head><title>{t('title')} · Waymark</title></svelte:head>

<main class="stats">
	<div class="wrap">
		<div class="row header">
			<div>
				<h1 class="t-h1">{t('title')}</h1>
				<p class="mono t3 sub">{range} · {t('located', { n: points.length })}</p>
			</div>
			<div class="row tools">
				<div class="seg" role="radiogroup" aria-label={t('year')}>
					<button
						class:is-on={year === null}
						role="radio"
						aria-checked={year === null}
						onclick={() => (year = null)}>{t('all')}</button
					>
					{#each shownYears as y (y)}
						<button
							class:is-on={year === y}
							role="radio"
							aria-checked={year === y}
							onclick={() => (year = y)}>{y}</button
						>
					{/each}
				</div>
				<button class="btn btn-secondary" onclick={() => window.print()}
					><Icon name="download" />{t('export')}</button
				>
			</div>
		</div>

		<div class="grid stagger">
			<div class="card span8 tall">
				<div class="row between top">
					<div>
						<span class="t-label">{t('countries')}</span>
						<div class="row big-row">
							<span class="big acc">{Math.round(shownCountries.current)}</span>
							<span class="mono t3 of"
								>{t('ofTotal', {
									total: TOTAL_COUNTRIES,
									percent: Math.round((countryList.length / TOTAL_COUNTRIES) * 100)
								})}</span
							>
						</div>
					</div>
					<div class="col right">
						<span class="mono t2">{t('continents', { n: continents.length })}</span>
						<span class="mono t3 small"
							>{continents.map(([name, n]) => `${name} ${n}`).join(' · ')}</span
						>
					</div>
				</div>
				<FlatWorld visited={countryList.map((c) => c.iso3)} dots={topCities} />
			</div>

			<div class="card span4 tall">
				<span class="t-label">{t('distance')}</span>
				<div class="row big-row">
					<span class="big acc">{dist(shownKm.current)}</span><span class="mono t3 of">{unit}</span>
				</div>
				<p class="t2 note">
					{laps >= 1
						? t('laps', { laps: formatDecimal(laps) })
						: t('lapShare', { percent: Math.round(laps * 100) })}
				</p>
				<div class="laps">
					{#each Array.from({ length: Math.min(3, Math.ceil(laps) || 1) }, (_, i) => i) as i (i)}
						<div class="lap">
							<i style:--i={i} style:width="{Math.min(1, Math.max(0, laps - i)) * 100}%"></i>
						</div>
					{/each}
				</div>
				<div class="row between mono t3 small lap-legend">
					<span>{t('firstLap')}</span><span>{dist(EQUATOR_KM)} {unit}</span>
				</div>
				<div class="col facts">
					{#if farthest}
						<div class="row between fact">
							<span class="t2">{t('farthest')}</span>
							<span class="mono"
								>{farthest.point.city ?? countries.name(farthest.point.country)} · {dist(
									farthest.km
								)}
								{unit}</span
							>
						</div>
					{/if}
					{#if longestTrip}
						<div class="row between fact">
							<span class="t2">{t('longestTrip')}</span>
							<span class="mono">{longestTrip.title} · {tc('days', { n: longestTrip.days })}</span>
						</div>
					{/if}
					{#if kmTrip}
						<div class="row between fact">
							<span class="t2">{t('mostKm')}</span>
							<span class="mono">{kmTrip.title} · {dist(kmTrip.km)} {unit}</span>
						</div>
					{/if}
				</div>
			</div>

			<div class="card span5">
				<div class="row between">
					<span class="t-label">{t('perYear')}</span>
					<span class="mono t3 small"
						>{t('max', { year: String(maxYear.year), count: maxYear.count })}</span
					>
				</div>
				<div class="row years">
					{#each perYear as y, i (y.year)}
						{@const best = y.year === maxYear.year}
						{@const share = y.count / maxYear.count}
						<button
							class="col bar-col"
							class:dim={year !== null && year !== y.year}
							onclick={() => (year = year === y.year ? null : y.year)}
							aria-label={t('yearBar', { year: String(y.year), n: y.count })}
						>
							<span class="mono small" class:acc={best} class:t3={!best}
								>{formatNumber(y.count)}</span
							>
							<div
								class="bar"
								style:--i={i}
								style:height="{share * 82}%"
								style:background={best
									? 'linear-gradient(180deg, var(--acc-hover), var(--acc))'
									: `linear-gradient(180deg, color-mix(in oklab, var(--acc) ${Math.round(30 + share * 45)}%, var(--s2)), color-mix(in oklab, var(--acc) 18%, var(--s2)))`}
							></div>
						</button>
					{/each}
				</div>
				<div class="row mono t3 small labels">
					{#each perYear as y (y.year)}<span>{y.year}</span>{/each}
				</div>
			</div>

			<div class="card span3">
				<span class="t-label">{t('topCities')}</span>
				<div class="col cities">
					{#each cities as c, i (c.city + c.country)}
						<div class="col city">
							<div class="row between">
								<span class="name"
									><span class="mono t3 pos">{i + 1}</span>{c.city}
									<span class="t3">· {countries.name(c.country)}</span></span
								>
								<span class="mono t2">{formatNumber(c.count)}</span>
							</div>
							<div class="track">
								<div
									style:--i={i}
									style:width="{(c.count / cities[0].count) * 100}%"
									style:background="color-mix(in oklab, var(--acc) {100 - i * 12}%, var(--s2))"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="card span4">
				<span class="t-label">{t('extremes')}</span>
				{#if ends}
					<div class="extremes">
						{#each [{ label: t('north'), icon: 'chevU', p: ends.north, v: formatLat(ends.north.lat) }, { label: t('south'), icon: 'chevD', p: ends.south, v: formatLat(ends.south.lat) }, { label: t('east'), icon: 'chevR', p: ends.east, v: formatLng(ends.east.lng) }, { label: t('west'), icon: 'chevL', p: ends.west, v: formatLng(ends.west.lng) }] as const as e (e.icon)}
							<div class="col extreme">
								<span class="row t-label dir"><Icon name={e.icon} size={14} />{e.label}</span>
								<span class="place-name">{e.p.city ?? t('noName')}</span>
								<span class="t-small t3">{countries.name(e.p.country)}</span>
								<span class="mono acc coord">{e.v}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</main>

<style>
	.stats {
		position: absolute;
		top: 88px;
		scrollbar-gutter: stable;
		left: 0;
		right: 0;
		bottom: 0;
		overflow: auto;
	}

	.wrap {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px 24px 32px;
	}

	.header {
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 20px;
		gap: 16px;
		flex-wrap: wrap;
	}

	.sub {
		margin-top: 6px;
	}

	.tools {
		gap: 8px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: 16px;
	}

	.card {
		background: var(--s1);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		min-width: 0;
		height: 326px;
	}

	.card.tall {
		height: 300px;
	}

	.span8 {
		grid-column: span 8;
	}

	.span5 {
		grid-column: span 5;
	}

	.span4 {
		grid-column: span 4;
	}

	.span3 {
		grid-column: span 3;
	}

	.between {
		justify-content: space-between;
	}

	.top {
		align-items: flex-start;
	}

	.big-row {
		gap: 10px;
		align-items: baseline;
		margin-top: 6px;
	}

	.big {
		font:
			500 36px/40px 'Geist Mono',
			monospace;
		letter-spacing: -0.03em;
	}

	.of {
		font-size: 14px;
		white-space: nowrap;
	}

	.right {
		align-items: flex-end;
		gap: 4px;
		text-align: right;
	}

	.small {
		font-size: 11px;
	}

	.note {
		font-size: 13px;
		margin-top: 4px;
	}

	.laps {
		margin-top: 18px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.lap {
		height: 6px;
		border-radius: 3px;
		background: color-mix(in oklab, var(--acc) 14%, var(--s2));
		overflow: hidden;
	}

	.lap i {
		display: block;
		height: 100%;
		background: var(--acc);
		opacity: 0.9;
		transform-origin: left;
		animation: grow-x 0.9s var(--ease-out) both;
		animation-delay: calc(0.25s + var(--i) * 0.18s);
		transition: width var(--dur-slow) var(--ease-out);
	}

	/* Bars grow from zero when the page opens, and slide to the new value
	   when another year is chosen */
	@keyframes grow-x {
		from {
			transform: scaleX(0);
		}
	}

	@keyframes grow-y {
		from {
			transform: scaleY(0);
		}
	}

	.lap-legend {
		margin-top: 6px;
	}

	.facts {
		margin-top: auto;
	}

	.fact {
		padding: 10px 0;
		border-top: 1px solid var(--line);
		font-size: 13px;
		gap: 12px;
	}

	.fact:last-child {
		padding-bottom: 0;
	}

	.fact .mono {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.years {
		flex: 1;
		align-items: flex-end;
		gap: 14px;
		margin-top: 16px;
		padding-bottom: 4px;
		border-bottom: 1px solid var(--line);
	}

	.bar-col {
		flex: 1;
		align-items: center;
		gap: 6px;
		height: 100%;
		justify-content: flex-end;
		transition: opacity 0.15s;
	}

	/* Other years fade only their bar: the number stays readable */
	.bar-col.dim .bar {
		opacity: 0.35;
	}

	.bar {
		width: 100%;
		border-radius: 4px 4px 1px 1px;
		min-height: 2px;
		transform-origin: bottom;
		animation: grow-y 0.7s var(--ease-out) both;
		animation-delay: calc(0.2s + var(--i) * 0.05s);
		transition: height var(--dur-slow) var(--ease-out);
	}

	.bar-col:hover .bar {
		filter: brightness(1.12);
	}

	.labels {
		gap: 14px;
		margin-top: 8px;
	}

	.labels span {
		flex: 1;
		text-align: center;
	}

	.cities {
		gap: 12px;
		margin-top: 16px;
	}

	.city {
		gap: 5px;
	}

	.name {
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.pos {
		display: inline-block;
		width: 18px;
	}

	.track {
		height: 3px;
		border-radius: 2px;
		background: color-mix(in oklab, var(--acc) 10%, var(--s2));
		margin-left: 18px;
	}

	.track div {
		height: 100%;
		border-radius: 2px;
		transform-origin: left;
		animation: grow-x 0.7s var(--ease-out) both;
		animation-delay: calc(0.25s + var(--i) * 0.06s);
		transition: width var(--dur-slow) var(--ease-out);
	}

	.extremes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		margin-top: 16px;
		flex: 1;
		border-radius: 10px;
		overflow: hidden;
		background: var(--line);
		border: 1px solid var(--line);
	}

	.extreme {
		padding: 14px;
		background: var(--s1);
		gap: 2px;
	}

	.dir {
		gap: 4px;
	}

	.place-name {
		font-size: 15px;
		font-weight: 500;
		margin-top: auto;
	}

	.coord {
		margin-top: 6px;
	}

	@media (max-width: 767px) {
		.wrap {
			padding: 12px 16px 32px;
		}

		.tools {
			flex-wrap: wrap;
			width: 100%;
		}

		.tools .seg {
			max-width: 100%;
			overflow-x: auto;
		}

		.card,
		.card.tall {
			height: auto;
			min-height: 300px;
		}

		/* Countries and continents one under the other, not squeezed side by side */
		.top {
			flex-direction: column;
			gap: 10px;
		}

		.right {
			align-items: flex-start;
			text-align: left;
		}
	}

	@media (max-width: 1100px) {
		.span8,
		.span4,
		.span5,
		.span3 {
			grid-column: span 12;
		}
	}

	/* "Exportar informe" prints this page (or saves it as PDF) */
	@media print {
		.stats {
			position: static;
			overflow: visible;
		}

		.tools {
			display: none;
		}
	}
</style>
