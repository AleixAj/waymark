import { tick } from 'svelte';

// Page-wide changes (theme, language) animated with the View Transitions API:
// the browser takes a picture of the page before the change and blends it into
// the new one. Browsers without it, or with reduced motion, just change at once.

type ViewTransitionDocument = Document & {
	startViewTransition?: (update: () => void | Promise<void>) => {
		ready: Promise<void>;
		finished: Promise<void>;
	};
};

function canAnimate() {
	const doc = document as ViewTransitionDocument;
	return !!doc.startViewTransition && document.documentElement.dataset.motion !== 'reduced';
}

/**
 * New theme: it spreads from the button as a growing circle.
 * `event` is the click, so the circle starts under the pointer.
 */
export function revealTheme(change: () => void, event?: MouseEvent) {
	if (!canAnimate()) {
		change();
		return;
	}
	const root = document.documentElement;
	const x = event?.clientX ?? innerWidth - 60;
	const y = event?.clientY ?? 40;
	// The circle has to reach the farthest corner of the window
	const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
	root.classList.add('reveal');
	// The update waits for Svelte to write the change into the page (tick)
	const transition = (document as ViewTransitionDocument).startViewTransition!(async () => {
		change();
		await tick();
	});
	transition.ready.then(() => {
		root.animate(
			{ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
			{
				duration: 650,
				easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
				pseudoElement: '::view-transition-new(root)'
			}
		);
	});
	transition.finished.finally(() => root.classList.remove('reveal'));
}

/** New language: the old texts fade into the new ones */
export function crossfade(change: () => void) {
	if (!canAnimate()) {
		change();
		return;
	}
	(document as ViewTransitionDocument).startViewTransition!(async () => {
		change();
		await tick();
	});
}
