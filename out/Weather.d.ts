import { WeatherClientConfig, WeatherClientOptions } from "./Client/ClientConfig";
import { WeatherControl } from "./Control";
import { SeasonFields, WeatherOptions, WeatherParams, WeatherPreset, WeatherSample } from "./Params";
import { WeatherRegion } from "./Region";
import { Season, SeasonOptions, SeasonState } from "./Season";
import { WeatherZone, WeatherZoneOptions } from "./WeatherZone";
/**
 * The weather. Called on the server it changes the weather for everyone; called on a client it changes it
 * for that player only, over whatever the server set, until `reset()`.
 *
 * ```ts
 * Weather.rain({ intensity: 0.8, transition: 10 });
 * Weather.zone(marshPart, { blend: 30 }).fog();
 * Weather.setSeason("autumn", { intensity: 0.7 });
 * ```
 *
 * Clients draw the weather once `Weather.start()` has been called on them (any client-side call starts it too).
 */
export declare class WeatherApi extends WeatherControl {
    protected holder(): Instance;
    protected changed(): void;
    /**
     * As for zones, plus the season: `season` and `seasonIntensity` may be passed in the fields or the options,
     * e.g. `Weather.rain({ season: "autumn" })` or `Weather.set({ season: "winter", seasonIntensity: 0.5 })`.
     */
    set(weather: WeatherPreset | (Partial<WeatherParams> & SeasonFields), options?: WeatherOptions): this;
    /**
     * Change the season. It is separate from the weather (presets keep it) and has no zones. Only autumn is drawn
     * for now: leaves fall, more with a higher intensity. Changing season fades the old one out, then the new in.
     */
    setSeason(season: Season, options?: SeasonOptions): this;
    /** The season right now, partway through a change if one is running. */
    getSeason(): SeasonState;
    /** Weather of its own inside a region. Set its weather on the returned zone. */
    zone(region: WeatherRegion, options?: WeatherZoneOptions): WeatherZone;
    /**
     * Drop the weather and season this side has set: a client goes back to the server's, the server back to
     * clear weather in summer.
     */
    reset(): void;
    /**
     * The weather at a point right now, zones included: for gameplay that depends on it (wet ground, cold).
     * Without a position, the global weather; on a client drawing the weather, what is drawn at the camera.
     */
    sample(position?: Vector3): WeatherSample;
    /** Client: start drawing the weather. Safe to call more than once; does nothing on the server. */
    start(): void;
    /** Client: stop drawing and put the sky, wind and lighting back as they were. */
    stop(): void;
    /** Client: how the weather is drawn. Merges into the current settings and applies at once. */
    configure(options: WeatherClientOptions): void;
    getConfig(): Readonly<WeatherClientConfig>;
    /** Client: how exposed the camera is to the sky, 0 under a roof to 1 in the open. */
    getExposure(): number;
}
export declare const Weather: WeatherApi;
