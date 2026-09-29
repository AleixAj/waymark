// Sample library for "Probar con fotos de ejemplo".
// Real places and dates, the same trips shown in the design mockups.

export interface DemoStop {
	city: string;
	lat: number;
	lng: number;
	/** Days after the trip start */
	day: number;
	/** How many days we stay */
	nights?: number;
	photos: number;
	/** How far photos spread around the center, in km */
	spread?: number;
}

export interface DemoTrip {
	title?: string;
	country: string;
	start: [number, number, number];
	scenes: string;
	stops: DemoStop[];
	/** Other countries visited in this trip, by stop index */
	countryByStop?: Record<number, string>;
}

// Scene colors from the design (sky -> horizon -> ground)
export const SCENES: Record<string, [string, string, string]> = {
	templo: ['oklch(0.74 0.06 75)', 'oklch(0.52 0.15 32)', 'oklch(0.3 0.04 40)'],
	ramen: ['oklch(0.78 0.09 82)', 'oklch(0.6 0.13 55)', 'oklch(0.34 0.06 40)'],
	noche: ['oklch(0.26 0.05 275)', 'oklch(0.46 0.1 55)', 'oklch(0.2 0.02 260)'],
	cerezo: ['oklch(0.88 0.04 345)', 'oklch(0.76 0.07 0)', 'oklch(0.44 0.05 150)'],
	calle: ['oklch(0.72 0.02 245)', 'oklch(0.56 0.04 60)', 'oklch(0.38 0.02 50)'],
	mercado: ['oklch(0.66 0.1 45)', 'oklch(0.56 0.11 140)', 'oklch(0.38 0.08 30)'],
	bosque: ['oklch(0.72 0.04 200)', 'oklch(0.5 0.08 148)', 'oklch(0.3 0.05 140)'],
	playa: ['oklch(0.83 0.06 225)', 'oklch(0.68 0.09 205)', 'oklch(0.82 0.05 85)'],
	glaciar: ['oklch(0.86 0.03 230)', 'oklch(0.7 0.07 215)', 'oklch(0.52 0.03 240)'],
	fiordo: ['oklch(0.74 0.05 235)', 'oklch(0.5 0.06 220)', 'oklch(0.34 0.04 160)'],
	volcan: ['oklch(0.62 0.02 240)', 'oklch(0.42 0.02 260)', 'oklch(0.24 0.01 60)'],
	atardecer: ['oklch(0.8 0.1 65)', 'oklch(0.6 0.13 30)', 'oklch(0.3 0.05 285)'],
	azulejo: ['oklch(0.76 0.06 240)', 'oklch(0.54 0.11 252)', 'oklch(0.86 0.03 90)'],
	prado: ['oklch(0.82 0.05 222)', 'oklch(0.6 0.1 132)', 'oklch(0.44 0.08 128)'],
	aurora: ['oklch(0.22 0.04 265)', 'oklch(0.55 0.12 165)', 'oklch(0.18 0.02 250)'],
	tapas: ['oklch(0.7 0.07 70)', 'oklch(0.55 0.12 40)', 'oklch(0.42 0.05 60)']
};

export const SCENE_SETS: Record<string, string[]> = {
	japon: ['templo', 'ramen', 'noche', 'cerezo', 'calle', 'mercado', 'bosque', 'templo', 'cerezo'],
	islandia: ['fiordo', 'glaciar', 'volcan', 'prado', 'atardecer', 'aurora', 'glaciar'],
	lisboa: ['azulejo', 'calle', 'playa', 'atardecer', 'tapas'],
	asturias: ['prado', 'playa', 'bosque', 'fiordo', 'tapas'],
	ny: ['noche', 'calle', 'atardecer', 'calle'],
	ciudad: ['calle', 'tapas', 'atardecer', 'noche', 'mercado'],
	costa: ['playa', 'atardecer', 'azulejo', 'calle'],
	tropico: ['mercado', 'templo', 'playa', 'bosque', 'ramen']
};

export const HOME = { city: 'Madrid', country: 'ESP', lat: 40.4168, lng: -3.7038 };

export const TRIPS: DemoTrip[] = [
	{
		title: 'Asturias, julio 2026',
		country: 'ESP',
		start: [2026, 6, 4],
		scenes: 'asturias',
		stops: [
			{ city: 'Oviedo', lat: 43.3614, lng: -5.8494, day: 0, nights: 2, photos: 30 },
			{ city: 'Gijón', lat: 43.5357, lng: -5.6615, day: 2, nights: 2, photos: 28 },
			{ city: 'Cudillero', lat: 43.5628, lng: -6.1459, day: 4, photos: 22, spread: 1.5 },
			{
				city: 'Cangas de Onís',
				lat: 43.3509,
				lng: -5.1293,
				day: 6,
				nights: 3,
				photos: 40,
				spread: 8
			},
			{ city: 'Llanes', lat: 43.4198, lng: -4.7549, day: 10, nights: 3, photos: 34 },
			{ city: 'Oviedo', lat: 43.3614, lng: -5.8494, day: 14, photos: 12 }
		]
	},
	{
		title: 'Lisboa y Sintra',
		country: 'PRT',
		start: [2025, 11, 6],
		scenes: 'lisboa',
		stops: [
			{ city: 'Lisboa', lat: 38.7139, lng: -9.1394, day: 0, nights: 2, photos: 52, spread: 3 },
			{ city: 'Sintra', lat: 38.7976, lng: -9.3906, day: 2, photos: 30, spread: 2 },
			{ city: 'Cascais', lat: 38.6979, lng: -9.4215, day: 3, photos: 18 },
			{ city: 'Lisboa', lat: 38.7139, lng: -9.1394, day: 4, photos: 16, spread: 3 }
		]
	},
	{
		country: 'JPN',
		start: [2025, 3, 3],
		scenes: 'japon',
		stops: [
			{ city: 'Tokio', lat: 35.6762, lng: 139.6503, day: 0, nights: 5, photos: 96, spread: 9 },
			{ city: 'Hakone', lat: 35.2324, lng: 139.1069, day: 5, nights: 2, photos: 22, spread: 4 },
			{ city: 'Kioto', lat: 35.0036, lng: 135.7785, day: 7, nights: 4, photos: 88, spread: 3.5 },
			{ city: 'Nara', lat: 34.6851, lng: 135.8048, day: 11, photos: 20, spread: 2 },
			{ city: 'Osaka', lat: 34.6937, lng: 135.5023, day: 12, nights: 2, photos: 42, spread: 4 },
			{ city: 'Hiroshima', lat: 34.3853, lng: 132.4553, day: 14, nights: 2, photos: 24, spread: 3 },
			{ city: 'Tokio', lat: 35.6762, lng: 139.6503, day: 16, photos: 14, spread: 6 }
		]
	},
	{
		title: 'Islandia en furgoneta',
		country: 'ISL',
		start: [2024, 7, 12],
		scenes: 'islandia',
		stops: [
			{ city: 'Reikiavik', lat: 64.1466, lng: -21.9426, day: 0, photos: 16 },
			{ city: 'Þingvellir', lat: 64.2559, lng: -21.1299, day: 1, photos: 12, spread: 3 },
			{ city: 'Geysir', lat: 64.3104, lng: -20.3024, day: 1, photos: 10, spread: 1 },
			{ city: 'Seljalandsfoss', lat: 63.6156, lng: -19.9886, day: 2, photos: 14, spread: 1 },
			{ city: 'Vík', lat: 63.4186, lng: -19.006, day: 3, photos: 16, spread: 3 },
			{ city: 'Jökulsárlón', lat: 64.0784, lng: -16.2306, day: 5, photos: 22, spread: 2 },
			{ city: 'Höfn', lat: 64.2539, lng: -15.2082, day: 6, photos: 8 },
			{ city: 'Egilsstaðir', lat: 65.2653, lng: -14.3948, day: 8, photos: 10 },
			{ city: 'Mývatn', lat: 65.6039, lng: -16.9961, day: 10, photos: 18, spread: 5 },
			{ city: 'Húsavík', lat: 66.0449, lng: -17.3389, day: 11, photos: 12 },
			{ city: 'Akureyri', lat: 65.6885, lng: -18.1262, day: 12, photos: 13 },
			{ city: 'Snæfellsnes', lat: 64.7667, lng: -23.6211, day: 14, photos: 20, spread: 10 }
		]
	},
	{
		title: 'Nueva York',
		country: 'USA',
		start: [2023, 10, 22],
		scenes: 'ny',
		stops: [
			{ city: 'Nueva York', lat: 40.758, lng: -73.9855, day: 0, nights: 8, photos: 120, spread: 6 }
		]
	},
	{
		country: 'THA',
		start: [2023, 1, 8],
		scenes: 'tropico',
		countryByStop: { 2: 'VNM' },
		stops: [
			{ city: 'Bangkok', lat: 13.7563, lng: 100.5018, day: 0, nights: 4, photos: 44, spread: 6 },
			{ city: 'Chiang Mai', lat: 18.7883, lng: 98.9853, day: 4, nights: 4, photos: 36, spread: 4 },
			{ city: 'Hanói', lat: 21.0278, lng: 105.8342, day: 8, nights: 4, photos: 40, spread: 4 }
		]
	},
	{
		country: 'MEX',
		start: [2022, 9, 14],
		scenes: 'tropico',
		stops: [
			{
				city: 'Ciudad de México',
				lat: 19.4326,
				lng: -99.1332,
				day: 0,
				nights: 5,
				photos: 52,
				spread: 6
			},
			{ city: 'Oaxaca', lat: 17.0732, lng: -96.7266, day: 5, nights: 4, photos: 38, spread: 3 }
		]
	},
	{
		country: 'GRC',
		start: [2021, 6, 9],
		scenes: 'costa',
		countryByStop: { 2: 'TUR' },
		stops: [
			{ city: 'Atenas', lat: 37.9838, lng: 23.7275, day: 0, nights: 3, photos: 30, spread: 3 },
			{ city: 'Thira', lat: 36.4166, lng: 25.4323, day: 3, nights: 3, photos: 34, spread: 4 },
			{ city: 'Estambul', lat: 41.0082, lng: 28.9784, day: 6, nights: 3, photos: 36, spread: 5 }
		]
	},
	{
		country: 'MAR',
		start: [2024, 2, 21],
		scenes: 'ciudad',
		stops: [
			{ city: 'Marrakech', lat: 31.6295, lng: -7.9811, day: 0, nights: 3, photos: 30, spread: 3 },
			{ city: 'Fez', lat: 34.0181, lng: -5.0078, day: 3, nights: 2, photos: 22, spread: 2 }
		]
	},
	{
		country: 'ITA',
		start: [2019, 4, 1],
		scenes: 'ciudad',
		stops: [
			{ city: 'Roma', lat: 41.9028, lng: 12.4964, day: 0, nights: 3, photos: 40, spread: 4 },
			{ city: 'Florencia', lat: 43.7696, lng: 11.2558, day: 3, nights: 2, photos: 30, spread: 2 },
			{ city: 'Venecia', lat: 45.4408, lng: 12.3155, day: 5, nights: 2, photos: 32, spread: 2 }
		]
	},
	{
		country: 'FRA',
		start: [2019, 8, 12],
		scenes: 'ciudad',
		countryByStop: { 1: 'CHE' },
		stops: [
			{ city: 'París', lat: 48.8566, lng: 2.3522, day: 0, nights: 4, photos: 46, spread: 5 },
			{ city: 'Zúrich', lat: 47.3769, lng: 8.5417, day: 4, nights: 2, photos: 20, spread: 3 }
		]
	},
	{
		country: 'GBR',
		start: [2022, 1, 17],
		scenes: 'ciudad',
		countryByStop: { 1: 'IRL' },
		stops: [
			{ city: 'Londres', lat: 51.5072, lng: -0.1276, day: 0, nights: 3, photos: 34, spread: 5 },
			{ city: 'Dublín', lat: 53.3498, lng: -6.2603, day: 3, nights: 2, photos: 22, spread: 3 }
		]
	},
	{
		country: 'NLD',
		start: [2023, 4, 26],
		scenes: 'ciudad',
		countryByStop: { 1: 'DEU' },
		stops: [
			{ city: 'Ámsterdam', lat: 52.3676, lng: 4.9041, day: 0, nights: 3, photos: 30, spread: 3 },
			{ city: 'Berlín', lat: 52.52, lng: 13.405, day: 3, nights: 3, photos: 32, spread: 5 }
		]
	},
	{
		country: 'ESP',
		start: [2025, 7, 2],
		scenes: 'costa',
		stops: [
			{ city: 'Barcelona', lat: 41.3874, lng: 2.1686, day: 0, nights: 3, photos: 36, spread: 4 },
			{ city: 'Valencia', lat: 39.4699, lng: -0.3763, day: 3, nights: 2, photos: 24, spread: 3 }
		]
	},
	{
		country: 'ESP',
		start: [2024, 9, 10],
		scenes: 'ciudad',
		stops: [
			{ city: 'Sevilla', lat: 37.3891, lng: -5.9845, day: 0, nights: 3, photos: 34, spread: 3 },
			{ city: 'Granada', lat: 37.1773, lng: -3.5986, day: 3, nights: 2, photos: 26, spread: 2 }
		]
	}
];

export const CAMERAS = [
	{
		camera: 'Fujifilm X-T5',
		lens: 'XF 23 mm F1.4 R LM WR',
		ext: 'RAF',
		prefix: 'DSCF',
		size: [6240, 4160]
	},
	{
		camera: 'iPhone 15 Pro',
		lens: 'Cámara trasera 6,86 mm f/1.78',
		ext: 'HEIC',
		prefix: 'IMG_',
		size: [4032, 3024]
	},
	{
		camera: 'Sony ILCE-7M4',
		lens: 'FE 24-70 mm F2.8 GM II',
		ext: 'ARW',
		prefix: 'DSC',
		size: [7008, 4672]
	}
];
