import { WeatherOptions, WeatherParams, WeatherPreset } from "./Params";
export declare abstract class WeatherControl {
    /** The instance whose attributes hold this weather. */
    protected abstract holder(): Instance;
    /** Called after the weather changed. */
    protected changed(): void;
    /**
     * Change the weather to a preset, or change some fields of the current one.
     *
     * ```ts
     * Weather.set("storm", { transition: 20 });
     * Weather.set({ fog: 0.5 }); // keeps everything else
     * ```
     */
    set(weather: WeatherPreset | Partial<WeatherParams>, options?: WeatherOptions): this;
    clear(options?: WeatherOptions): this;
    cloudy(options?: WeatherOptions): this;
    overcast(options?: WeatherOptions): this;
    fog(options?: WeatherOptions): this;
    drizzle(options?: WeatherOptions): this;
    rain(options?: WeatherOptions): this;
    storm(options?: WeatherOptions): this;
    snow(options?: WeatherOptions): this;
    blizzard(options?: WeatherOptions): this;
    /** The weather this control is at right now, partway through a transition if one is running. */
    get(): WeatherParams;
    /** The weather this control is heading to (the end of the running transition). */
    getTarget(): WeatherParams;
}
