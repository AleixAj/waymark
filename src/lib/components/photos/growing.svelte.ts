// Long photo lists (a trip of 300 photos) are not created all at once: the first
// screenful appears right away and the rest is added in small steps while the
// browser has nothing else to do. Scrolling stays smooth and pages open fast.
const FIRST = 48;
const STEP = 120;

const whenIdle: (callback: () => void) => number =
	typeof requestIdleCallback === 'function'
		? (callback) => requestIdleCallback(callback, { timeout: 200 })
		: (callback) => window.setTimeout(callback, 30);
const cancelIdle: (handle: number) => void =
	typeof cancelIdleCallback === 'function' ? cancelIdleCallback : clearTimeout;

/** How many items of a list to show; starts again when the list changes */
export function growingLimit(total: () => number) {
	let limit = $state(FIRST);
	$effect(() => {
		const count = total();
		limit = FIRST;
		let handle = 0;
		const grow = () => {
			limit += STEP;
			if (limit < count) handle = whenIdle(grow);
		};
		if (limit < count) handle = whenIdle(grow);
		return () => cancelIdle(handle);
	});
	return {
		get value() {
			return limit;
		}
	};
}
