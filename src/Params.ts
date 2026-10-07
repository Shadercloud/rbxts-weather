// What a weather looks like. Every field blends linearly, so any two weathers can be mixed: that is how
// transitions and zones work.
export interface WeatherParams {
	/** Rain intensity, 0-1. */
	rain: number;
	/** Snow intensity, 0-1. */
	snow: number;
	/** Cloud cover, 0-1 (`Clouds.Cover`). */
	clouds: number;
	/** Cloud thickness, 0-1 (`Clouds.Density`). */
	cloudDensity: number;
	cloudColor: Color3;
	/** Fog and haze, 0-1 (drives `Atmosphere`). */
	fog: number;
	fogColor: Color3;
	/** How much the scene is darkened and desaturated, 0-1. */
	darkness: number;
	/** Wind velocity in studs per second. Tilts rain and snow, and sets `Workspace.GlobalWind`. */
	wind: Vector3;
	/** How often lightning strikes, 0-1. */
	lightning: number;
}

export type WeatherPreset =
	"clear" | "cloudy" | "overcast" | "fog" | "drizzle" | "rain" | "storm" | "snow" | "blizzard";

const FOG_GREY = Color3.fromRGB(199, 205, 214);
const SNOW_WHITE = Color3.fromRGB(226, 231, 238);

export const PRESETS: Readonly<Record<WeatherPreset, Readonly<WeatherParams>>> = {
	clear: {
		rain: 0,
		snow: 0,
		clouds: 0.3,
		cloudDensity: 0.4,
		cloudColor: Color3.fromRGB(255, 255, 255),
		fog: 0,
		fogColor: FOG_GREY,
		darkness: 0,
		wind: new Vector3(2, 0, 1),
		lightning: 0,
	},
	cloudy: {
		rain: 0,
		snow: 0,
		clouds: 0.65,
		cloudDensity: 0.6,
		cloudColor: Color3.fromRGB(240, 240, 244),
		fog: 0.05,
		fogColor: FOG_GREY,
		darkness: 0.1,
		wind: new Vector3(5, 0, 2),
		lightning: 0,
	},
	overcast: {
		rain: 0,
		snow: 0,
		clouds: 0.9,
		cloudDensity: 0.8,
		cloudColor: Color3.fromRGB(200, 201, 206),
		fog: 0.12,
		fogColor: FOG_GREY,
		darkness: 0.25,
		wind: new Vector3(6, 0, 2),
		lightning: 0,
	},
	fog: {
		rain: 0,
		snow: 0,
		clouds: 0.8,
		cloudDensity: 0.6,
		cloudColor: Color3.fromRGB(215, 217, 222),
		fog: 0.85,
		fogColor: FOG_GREY,
		darkness: 0.2,
		wind: new Vector3(1, 0, 0),
		lightning: 0,
	},
	drizzle: {
		rain: 0.3,
		snow: 0,
		clouds: 0.9,
		cloudDensity: 0.8,
		cloudColor: Color3.fromRGB(180, 182, 188),
		fog: 0.2,
		fogColor: FOG_GREY,
		darkness: 0.3,
		wind: new Vector3(4, 0, 2),
		lightning: 0,
	},
	rain: {
		rain: 0.7,
		snow: 0,
		clouds: 0.95,
		cloudDensity: 0.9,
		cloudColor: Color3.fromRGB(150, 152, 160),
		fog: 0.3,
		fogColor: Color3.fromRGB(170, 176, 186),
		darkness: 0.45,
		wind: new Vector3(8, 0, 3),
		lightning: 0,
	},
	storm: {
		rain: 1,
		snow: 0,
		clouds: 1,
		cloudDensity: 1,
		cloudColor: Color3.fromRGB(40, 42, 50),
		fog: 0.4,
		fogColor: Color3.fromRGB(78, 84, 96),
		darkness: 0.7,
		wind: new Vector3(22, 0, 8),
		lightning: 0.6,
	},
	snow: {
		rain: 0,
		snow: 0.6,
		clouds: 0.9,
		cloudDensity: 0.7,
		cloudColor: Color3.fromRGB(220, 222, 228),
		fog: 0.35,
		fogColor: SNOW_WHITE,
		darkness: 0.2,
		wind: new Vector3(3, 0, 1),
		lightning: 0,
	},
	blizzard: {
		rain: 0,
		snow: 1,
		clouds: 1,
		cloudDensity: 1,
		cloudColor: Color3.fromRGB(200, 204, 212),
		fog: 0.8,
		fogColor: SNOW_WHITE,
		darkness: 0.4,
		wind: new Vector3(30, 0, 10),
		lightning: 0,
	},
};

// The field `intensity` sets for each preset. Presets without one ignore it.
const INTENSITY_FIELD: Partial<Record<WeatherPreset, "rain" | "snow" | "fog" | "clouds">> = {
	cloudy: "clouds",
	overcast: "clouds",
	fog: "fog",
	drizzle: "rain",
	rain: "rain",
	storm: "rain",
	snow: "snow",
	blizzard: "snow",
};

export interface WeatherOptions extends Partial<WeatherParams> {
	/** Seconds to blend from the current weather into this one. Default 5; 0 switches at once. */
	transition?: number;
	/** The preset's main amount, 0-1: rain for `rain()`, snow for `snow()`, fog for `fog()`, clouds for `cloudy()`. */
	intensity?: number;
}

export const PARAM_KEYS: ReadonlyArray<keyof WeatherParams> = [
	"rain",
	"snow",
	"clouds",
	"cloudDensity",
	"cloudColor",
	"fog",
	"fogColor",
	"darkness",
	"wind",
	"lightning",
];

export function copyParams(params: Readonly<WeatherParams>): WeatherParams {
	return { ...params };
}

export function lerpParams(a: Readonly<WeatherParams>, b: Readonly<WeatherParams>, t: number): WeatherParams {
	if (t <= 0) return copyParams(a);
	if (t >= 1) return copyParams(b);
	return {
		rain: a.rain + (b.rain - a.rain) * t,
		snow: a.snow + (b.snow - a.snow) * t,
		clouds: a.clouds + (b.clouds - a.clouds) * t,
		cloudDensity: a.cloudDensity + (b.cloudDensity - a.cloudDensity) * t,
		cloudColor: a.cloudColor.Lerp(b.cloudColor, t),
		fog: a.fog + (b.fog - a.fog) * t,
		fogColor: a.fogColor.Lerp(b.fogColor, t),
		darkness: a.darkness + (b.darkness - a.darkness) * t,
		wind: a.wind.Lerp(b.wind, t),
		lightning: a.lightning + (b.lightning - a.lightning) * t,
	};
}

// The weather a `set` call asks for: a preset, or fields merged over `base` (the weather already targeted),
// then intensity, then explicit fields.
export function resolveTarget(
	base: Readonly<WeatherParams>,
	weather: WeatherPreset | Partial<WeatherParams>,
	options?: WeatherOptions,
): WeatherParams {
	const result = typeIs(weather, "string") ? copyParams(PRESETS[weather]) : { ...base, ...weather };
	if (options) {
		const field = typeIs(weather, "string") ? INTENSITY_FIELD[weather] : undefined;
		if (field !== undefined && options.intensity !== undefined) result[field] = options.intensity;
		for (const key of PARAM_KEYS) {
			const value = options[key];
			if (value !== undefined) (result as unknown as Record<string, unknown>)[key] = value;
		}
	}
	for (const key of ["rain", "snow", "clouds", "cloudDensity", "fog", "darkness", "lightning"] as const) {
		result[key] = math.clamp(result[key], 0, 1);
	}
	return result;
}
