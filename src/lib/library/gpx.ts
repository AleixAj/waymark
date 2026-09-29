import type { Trip } from './trips';

function escapeXml(text: string) {
	return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** The trip route as a GPX file, so it can be opened in Google Earth, Strava, etc. */
export function tripToGpx(trip: Trip) {
	const points = trip.stops
		.filter((s) => Number.isFinite(s.start))
		.map(
			(s) =>
				`    <trkpt lat="${s.lat.toFixed(6)}" lon="${s.lng.toFixed(6)}"><time>${new Date(s.start).toISOString()}</time><name>${escapeXml(s.city)}</name></trkpt>`
		)
		.join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Waymark" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(trip.title)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

/** Saves a text file through the browser's download */
export function downloadText(name: string, text: string, type: string) {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	link.click();
	// Some browsers start the download a bit later, so the URL is freed afterwards
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
