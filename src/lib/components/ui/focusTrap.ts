const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"], [contenteditable="plaintext-only"]';

/**
 * Keeps keyboard focus inside a dialog while it is open (Tab and Shift+Tab loop
 * around its buttons) and gives focus back to what had it before when it closes.
 */
export function focusTrap(node: HTMLElement) {
	const previous = document.activeElement as HTMLElement | null;
	// Let the dialog render, then focus it (or its own autofocus element)
	requestAnimationFrame(() => {
		if (!node.contains(document.activeElement)) node.focus();
	});

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(el) => el.offsetParent !== null
		);
		if (items.length === 0) {
			event.preventDefault();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', onKeydown);
	return {
		destroy() {
			node.removeEventListener('keydown', onKeydown);
			previous?.focus?.();
		}
	};
}
