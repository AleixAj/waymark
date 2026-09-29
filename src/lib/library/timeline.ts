export interface MonthBar {
	/** year * 12 + month, easy to compare and to turn back into a date */
	key: number;
	year: number;
	month: number;
	count: number;
}

export function monthIndex(time: number) {
	const d = new Date(time);
	return d.getFullYear() * 12 + d.getMonth();
}

export function monthStart(key: number) {
	return new Date(Math.floor(key / 12), key % 12, 1).getTime();
}

/** First instant of the month after this one */
export function monthEnd(key: number) {
	return monthStart(key + 1);
}

/** One bar per month, from the first photo until the current month */
export function buildMonths(points: { takenAt: number }[], now = Date.now()): MonthBar[] {
	if (points.length === 0) return [];
	const counts = new Map<number, number>();
	const current = monthIndex(now);
	let first = Infinity;
	let last = current;
	for (const p of points) {
		const key = monthIndex(p.takenAt);
		counts.set(key, (counts.get(key) ?? 0) + 1);
		if (key < first) first = key;
		if (key > last) last = key;
	}
	// Always start in January so the year labels line up
	const start = Math.floor(first / 12) * 12;
	const bars: MonthBar[] = [];
	for (let key = start; key <= last; key++) {
		bars.push({ key, year: Math.floor(key / 12), month: key % 12, count: counts.get(key) ?? 0 });
	}
	return bars;
}

export interface TimeRange {
	/** Month keys, both included */
	from: number;
	to: number;
}

export function inRange(time: number, range: TimeRange | null) {
	if (!range) return true;
	return time >= monthStart(range.from) && time < monthEnd(range.to);
}

/** Positions of a range inside the bars, always valid (the range may be from old data) */
export function rangeIndexes(bars: MonthBar[], range: TimeRange | null) {
	const lastIndex = Math.max(0, bars.length - 1);
	if (!range || bars.length === 0) return { from: 0, to: lastIndex };
	const clamp = (key: number) => Math.min(lastIndex, Math.max(0, key - (bars[0]?.key ?? key)));
	const from = clamp(range.from);
	const to = clamp(range.to);
	return from <= to ? { from, to } : { from: to, to: from };
}
