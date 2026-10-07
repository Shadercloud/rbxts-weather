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
export type WeatherPreset = "clear" | "cloudy" | "overcast" | "fog" | "drizzle" | "rain" | "storm" | "snow" | "blizzard";
export declare const PRESETS: Readonly<Record<WeatherPreset, Readonly<WeatherParams>>>;
export interface WeatherOptions extends Partial<WeatherParams> {
    /** Seconds to blend from the current weather into this one. Default 5; 0 switches at once. */
    transition?: number;
    /** The preset's main amount, 0-1: rain for `rain()`, snow for `snow()`, fog for `fog()`, clouds for `cloudy()`. */
    intensity?: number;
}
export declare const PARAM_KEYS: ReadonlyArray<keyof WeatherParams>;
export declare function copyParams(params: Readonly<WeatherParams>): WeatherParams;
export declare function lerpParams(a: Readonly<WeatherParams>, b: Readonly<WeatherParams>, t: number): WeatherParams;
export declare function resolveTarget(base: Readonly<WeatherParams>, weather: WeatherPreset | Partial<WeatherParams>, options?: WeatherOptions): WeatherParams;
