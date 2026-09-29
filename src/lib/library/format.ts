// Spanish formatting helpers used across the UI

const numberFormat = new Intl.NumberFormat('es-ES', { useGrouping: true });
const decimalFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

/** 4912 -> "4.912" (Intl skips the dot for 4-digit numbers in Spanish, the design doesn't) */
export function formatNumber(value: number) {
	const rounded = Math.round(value);
	if (Math.abs(rounded) >= 1000 && Math.abs(rounded) < 10000) {
		return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	}
	return numberFormat.format(rounded);
}

export function formatDecimal(value: number) {
	return decimalFormat.format(value);
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = [
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
];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function monthShort(month: number) {
	return MONTHS[month];
}

/** "nov 2023" */
export function formatMonth(time: number) {
	const d = new Date(time);
	return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Julio 2026" */
export function formatMonthLong(time: number) {
	const d = new Date(time);
	return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Sáb 12 abr" */
export function formatDay(time: number) {
	const d = new Date(time);
	return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Sábado, 12 abr 2025" */
export function formatDayLong(time: number) {
	const d = new Date(time);
	return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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
		return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
	}
	if (sameMonth) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
	if (sameYear) {
		return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
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
	const ns = lat >= 0 ? 'N' : 'S';
	const ew = lng >= 0 ? 'E' : 'O';
	return `${Math.abs(lat).toFixed(digits)}° ${ns}, ${Math.abs(lng).toFixed(digits)}° ${ew}`;
}

/** 1/500 for fast shutters, 2" for long ones */
export function formatExposure(seconds: number) {
	if (seconds >= 1) return `${formatDecimal(seconds)}"`;
	return `1/${Math.round(1 / seconds)}`;
}

export function formatBytes(bytes: number) {
	if (bytes >= 1e9) return `${formatDecimal(bytes / 1e9)} GB`;
	if (bytes >= 1e6) return `${formatDecimal(bytes / 1e6)} MB`;
	return `${formatNumber(bytes / 1e3)} KB`;
}

/** 1 foto, 2 fotos */
export function plural(count: number, one: string, many: string) {
	return `${formatNumber(count)} ${count === 1 ? one : many}`;
}
