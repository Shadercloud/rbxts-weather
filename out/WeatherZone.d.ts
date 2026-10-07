import { WeatherControl } from "./Control";
import { WeatherRegion } from "./Region";
export interface WeatherZoneOptions {
    /** Studs outside the region over which its weather fades out. Default 40. */
    blend?: number;
    /** Where zones overlap, higher priority is applied over lower. Default 0. */
    priority?: number;
    /** Name of the zone's folder, for finding it in the explorer. Default "Zone". */
    name?: string;
}
/**
 * Weather of its own inside a region, blending into the surrounding weather at its edge. A zone has no
 * effect until its weather is set: `Weather.zone(marsh).fog()`.
 */
export declare class WeatherZone extends WeatherControl {
    private readonly folder;
    private readonly onChanged?;
    private regionConnections;
    private destroyed;
    /** @hidden Use `Weather.zone(region, options)`. */
    constructor(region: WeatherRegion, options?: WeatherZoneOptions, onChanged?: () => void);
    protected holder(): Instance;
    protected changed(): void;
    /** Move or resize the zone. A part is followed as it moves until the region is changed again. */
    setRegion(region: WeatherRegion): this;
    setBlend(blend: number): this;
    setPriority(priority: number): this;
    /** Remove the zone at once. To fade it out first, set it to the surrounding weather and destroy it later. */
    destroy(): void;
}
