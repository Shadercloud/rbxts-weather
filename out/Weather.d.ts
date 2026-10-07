import { WeatherClientConfig, WeatherClientOptions } from "./Client/ClientConfig";
import { WeatherControl } from "./Control";
import { WeatherParams } from "./Params";
import { WeatherRegion } from "./Region";
import { WeatherZone, WeatherZoneOptions } from "./WeatherZone";
/**
 * The weather. Called on the server it changes the weather for everyone; called on a client it changes it
 * for that player only, over whatever the server set, until `reset()`.
 *
 * ```ts
 * Weather.rain({ intensity: 0.8, transition: 10 });
 * Weather.zone(marshPart, { blend: 30 }).fog();
 * ```
 *
 * Clients draw the weather once `Weather.start()` has been called on them (any client-side call starts it too).
 */
export declare class WeatherApi extends WeatherControl {
    protected holder(): Instance;
    protected changed(): void;
    /** Weather of its own inside a region. Set its weather on the returned zone. */
    zone(region: WeatherRegion, options?: WeatherZoneOptions): WeatherZone;
    /** Drop the weather this side has set: a client goes back to the server's, the server back to clear. */
    reset(): void;
    /**
     * The weather at a point right now, zones included: for gameplay that depends on it (wet ground, cold).
     * Without a position, the global weather; on a client drawing the weather, what is drawn at the camera.
     */
    sample(position?: Vector3): WeatherParams;
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
