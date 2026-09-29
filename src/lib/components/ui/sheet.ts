import { ui } from '$lib/state/ui.svelte';

type Snap = 'peek' | 'half' | 'full';

const PHONE = '(max-width: 767px)';

/** Height in px of each snap point for the current window */
function heightOf(snap: Snap) {
	const h = window.innerHeight;
	if (snap === 'peek') return 220;
	if (snap === 'half') return Math.round(h * 0.55);
	return h - 110;
}

/**
 * On phones, side panels become a bottom sheet with three heights
 * (peek, half, full). Drag the handle to resize, tap it to switch.
 * On bigger screens this action does nothing.
 */
export function sheet(node: HTMLElement, initial: Snap = 'half') {
	const media = matchMedia(PHONE);
	let snap: Snap = initial;
	let dragging = false;
	let startY = 0;
	let startHeight = 0;

	const handle = document.createElement('button');
	handle.className = 'sheet-handle';
	handle.setAttribute('aria-label', 'Cambiar el tamaño del panel');
	node.prepend(handle);

	function apply(height: number) {
		node.style.setProperty('--sheet-h', `${height}px`);
		ui.sheetHeight = media.matches ? height : 0;
	}

	function snapTo(next: Snap) {
		snap = next;
		node.classList.remove('dragging');
		apply(heightOf(snap));
	}

	function onDown(event: PointerEvent) {
		if (!media.matches) return;
		dragging = true;
		startY = event.clientY;
		startHeight = node.getBoundingClientRect().height;
		handle.setPointerCapture(event.pointerId);
		node.classList.add('dragging');
	}

	function onMove(event: PointerEvent) {
		if (!dragging) return;
		const height = Math.min(heightOf('full'), Math.max(120, startHeight + startY - event.clientY));
		apply(height);
	}

	function onUp(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		const moved = Math.abs(event.clientY - startY);
		if (moved < 6) {
			// A tap cycles through the sizes
			snapTo(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek');
			return;
		}
		// Snap to the closest size
		const height = node.getBoundingClientRect().height;
		const options: Snap[] = ['peek', 'half', 'full'];
		const closest = options.reduce((a, b) =>
			Math.abs(heightOf(a) - height) < Math.abs(heightOf(b) - height) ? a : b
		);
		snapTo(closest);
	}

	const onResize = () => snapTo(snap);

	handle.addEventListener('pointerdown', onDown);
	handle.addEventListener('pointermove', onMove);
	handle.addEventListener('pointerup', onUp);
	media.addEventListener('change', onResize);
	window.addEventListener('resize', onResize);
	snapTo(snap);

	return {
		destroy() {
			handle.remove();
			media.removeEventListener('change', onResize);
			window.removeEventListener('resize', onResize);
			ui.sheetHeight = 0;
		}
	};
}
