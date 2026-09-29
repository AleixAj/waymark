// Line icons from the design system (24x24, 1.5px stroke).
// Each entry is the inner SVG markup of the icon.
export const ICONS = {
	search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
	moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
	upload:
		'<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>',
	plus: '<path d="M12 5v14M5 12h14"/>',
	minus: '<path d="M5 12h14"/>',
	globe:
		'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 3.5 5.2 3.5 8.5s-1 6.2-3.5 8.5c-2.5-2.3-3.5-5.2-3.5-8.5s1-6.2 3.5-8.5z"/>',
	map: '<path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5 9 4.5zM9 4.5v13M15 6.5v13"/>',
	target:
		'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5"/>',
	chevL: '<path d="M14.5 6l-6 6 6 6"/>',
	chevR: '<path d="M9.5 6l6 6-6 6"/>',
	chevD: '<path d="M6 9.5l6 6 6-6"/>',
	chevU: '<path d="M6 14.5l6-6 6 6"/>',
	x: '<path d="M6 6l12 12M18 6L6 18"/>',
	lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
	heart:
		'<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
	folderPlus:
		'<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2h8A1.5 1.5 0 0 1 20.5 9v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5zM12 10.5v5M9.5 13h5"/>',
	folder:
		'<path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2h8A1.5 1.5 0 0 1 20.5 9v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
	pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
	pinEdit:
		'<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 9.8-5.6"/><path d="M14.5 14.5l1-3 5-5a1.4 1.4 0 0 1 2 2l-5 5z"/>',
	download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4 18.5h16"/>',
	play: '<path d="M8 5.5v13l10.5-6.5z"/>',
	pause: '<path d="M8 5.5v13M16 5.5v13"/>',
	calendar:
		'<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
	camera:
		'<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.5l1.5-2h5l1.5 2h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.5" r="3.5"/>',
	sliders:
		'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
	chart: '<path d="M4 20h16M7 16.5V11M12 16.5V6M17 16.5v-4"/>',
	image:
		'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.7"/><path d="M20.5 15.5l-5-5-9 9"/>',
	imageOff:
		'<path d="M20.5 16V6.5a2 2 0 0 0-2-2H8M3.5 6.5v11a2 2 0 0 0 2 2h13M3 3l18 18M20.5 15.5l-5-5-1.5 1.5M6.5 19.5l6-6"/>',
	trash:
		'<path d="M4.5 6.5h15M9.5 6.5v-2h5v2M6.5 6.5l.8 12.2A1.5 1.5 0 0 0 8.8 20h6.4a1.5 1.5 0 0 0 1.5-1.3l.8-12.2"/>',
	alert: '<path d="M12 4.5l8.5 15h-17zM12 10.5v4M12 17.2v.01"/>',
	info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>',
	more: '<path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="2.4"/>',
	check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
	checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.5 2.5 5-5"/>',
	arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
	arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
	sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/>',
	edit: '<path d="M4.5 19.5l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3l-10 10zM13.5 7.5l3 3"/>',
	route:
		'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/>',
	fileX: '<path d="M6.5 3.5h7l4.5 4.5v12.5h-11.5zM13.5 3.5V8H18M10 12.5l4 4M14 12.5l-4 4"/>',
	minimize: '<path d="M5 12h14"/>',
	expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
	copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
	refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
	palette:
		'<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.3 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.8-1.7h2.1A4.1 4.1 0 0 0 20.5 10c0-3.6-3.8-6.5-8.5-6.5z"/><circle cx="7.6" cy="11.6" r="1.1"/><circle cx="9.8" cy="7.6" r="1.1"/><circle cx="14.3" cy="7.6" r="1.1"/>'
} as const;

export type IconName = keyof typeof ICONS;
