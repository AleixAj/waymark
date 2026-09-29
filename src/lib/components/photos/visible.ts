// One IntersectionObserver shared by every thumbnail. A long list can show thousands
// of photos; one observer for all of them is much lighter than one each.
const callbacks = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | undefined;

function getObserver() {
	observer ??= new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				callbacks.get(entry.target)?.();
				callbacks.delete(entry.target);
				observer!.unobserve(entry.target);
			}
		},
		{ rootMargin: '300px' }
	);
	return observer;
}

/** Svelte action: calls `onVisible` once, when the element gets close to the screen */
export function whenVisible(node: HTMLElement, onVisible: () => void) {
	callbacks.set(node, onVisible);
	getObserver().observe(node);
	return {
		destroy() {
			callbacks.delete(node);
			observer?.unobserve(node);
		}
	};
}
