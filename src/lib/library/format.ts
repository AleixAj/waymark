import { i18n, type Locale } from '$lib/i18n/i18n.svelte';

// Formatting helpers used across the UI, in the language chosen by the user.
// They read the language on every call, so the markup updates when it changes.

const numberFormats = new Map<string, Intl.NumberFormat>();
function numberFormat(decimals: boolean) {
	const key = `${i18n.tag}${decimals}`;
	let format = numberFormats.get(key);
	if (!format) {
		format = new Intl.NumberFormat(
			i18n.tag,
			decimals ? { maximumFractionDigits: 1 } : { useGrouping: true }
		);
		numberFormats.set(key, format);
	}
	return format;
}

/**
 * 4912 -> "4.912" / "4,912". Intl skips the separator for 4-digit numbers in
 * Spanish and Catalan; the design doesn't.
 */
export function formatNumber(value: number) {
	if (!Number.isFinite(value)) return '—';
	const rounded = Math.round(value);
	if (Math.abs(rounded) >= 1000 && Math.abs(rounded) < 10000) {
		const separator = i18n.locale === 'en' ? ',' : '.';
		return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
	}
	return numberFormat(false).format(rounded);
}

export function formatDecimal(value: number) {
	return numberFormat(true).format(value);
}

const NAMES: Record<
	Locale,
	{ months: string[]; monthsLong: string[]; days: string[]; daysLong: string[] }
> = {
	es: {
		months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
		monthsLong: [
			'Enero',
			'Febrero',
			'Marzo',
			'Abril',
			'Mayo',
			'Junio',
			'Julio',
			'Agosto',
			'Septiembre',
			'Octubre',
			'Noviembre',
			'Diciembre'
		],
		days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
		daysLong: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
	},
	en: {
		months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
		monthsLong: [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December'
		],
		days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
		daysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
	},
	ca: {
		months: ['gen', 'febr', 'març', 'abr', 'maig', 'juny', 'jul', 'ag', 'set', 'oct', 'nov', 'des'],
		monthsLong: [
			'Gener',
			'Febrer',
			'Març',
			'Abril',
			'Maig',
			'Juny',
			'Juliol',
			'Agost',
			'Setembre',
			'Octubre',
			'Novembre',
			'Desembre'
		],
		days: ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'],
		daysLong: ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte']
	}
};

const names = () => NAMES[i18n.locale];

export function monthShort(month: number) {
	return names().months[month];
}

/** "nov 2023" */
export function formatMonth(time: number) {
	const d = new Date(time);
	return `${names().months[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Julio 2026" */
export function formatMonthLong(time: number) {
	const d = new Date(time);
	return `${names().monthsLong[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Sáb 12 abr" */
export function formatDay(time: number) {
	const d = new Date(time);
	return `${names().days[d.getDay()]} ${d.getDate()} ${names().months[d.getMonth()]}`;
}

/** "Sábado, 12 abr 2025" */
export function formatDayLong(time: number) {
	const d = new Date(time);
	return `${names().daysLong[d.getDay()]}, ${d.getDate()} ${names().months[d.getMonth()]} ${d.getFullYear()}`;
}

/** "17:42:08" */
export function formatTime(time: number, seconds = true) {
	const d = new Date(time);
	const pad = (n: number) => String(n).padStart(2, '0');
	const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	return seconds ? `${hm}:${pad(d.getSeconds())}` : hm;
}

/**
 * Date range in the design's short style:
 * same month "12–26 ago 2024", same year "28 mar – 3 abr 2025", else "dic 2025 – ene 2026"
 */
export function formatRange(start: number, end: number) {
	const a = new Date(start);
	const b = new Date(end);
	const sameYear = a.getFullYear() === b.getFullYear();
	const sameMonth = sameYear && a.getMonth() === b.getMonth();
	if (sameMonth && a.getDate() === b.getDate()) {
		return `${a.getDate()} ${names().months[a.getMonth()]} ${a.getFullYear()}`;
	}
	if (sameMonth)
		return `${a.getDate()}–${b.getDate()} ${names().months[b.getMonth()]} ${b.getFullYear()}`;
	if (sameYear) {
		return `${a.getDate()} ${names().months[a.getMonth()]} – ${b.getDate()} ${names().months[b.getMonth()]} ${b.getFullYear()}`;
	}
	return `${formatMonth(start)} – ${formatMonth(end)}`;
}

/** Number of calendar days between two times, counting both ends */
export function daysBetween(start: number, end: number) {
	const a = new Date(start);
	const b = new Date(end);
	const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
	const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
	return Math.round((dayB - dayA) / 86_400_000) + 1;
}

/** Key for grouping photos by local day, e.g. "2025-3-12" */
export function dayKey(time: number) {
	const d = new Date(time);
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Key for grouping by month, e.g. "2025-3" */
export function monthKey(time: number) {
	const d = new Date(time);
	return `${d.getFullYear()}-${d.getMonth()}`;
}

/** "34.99490° N, 135.78504° E" */
export function formatCoords(lat: number, lng: number, digits = 5) {
	return `${formatLat(lat, digits)}, ${formatLng(lng, digits)}`;
}

/** "34.99490° N". A value that rounds to 0 never shows as "0.00000° S". */
export function formatLat(lat: number, digits = 4) {
	const text = Math.abs(lat).toFixed(digits);
	return `${text}° ${lat < 0 && Number(text) !== 0 ? 'S' : 'N'}`;
}

export function formatLng(lng: number, digits = 4) {
	const text = Math.abs(lng).toFixed(digits);
	const west = i18n.locale === 'es' ? 'O' : 'W';
	return `${text}° ${lng < 0 && Number(text) !== 0 ? west : 'E'}`;
}

/** 1/500 for fast shutters, 2" for long ones */
export function formatExposure(seconds: number) {
	if (!Number.isFinite(seconds) || seconds <= 0) return '—';
	if (seconds >= 1) return `${formatDecimal(seconds)}"`;
	return `1/${Math.round(1 / seconds)}`;
}

export function formatBytes(bytes: number) {
	// Rounded before choosing the unit, so 999.999 bytes is "1 MB" and not "1.000 KB"
	if (bytes >= 999_500_000) return `${formatDecimal(bytes / 1e9)} GB`;
	if (bytes >= 999_500) return `${formatDecimal(bytes / 1e6)} MB`;
	return `${formatNumber(bytes / 1e3)} KB`;
}
