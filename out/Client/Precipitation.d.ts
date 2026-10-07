import { WeatherParams } from "../Params";
import { WeatherAppearance, WeatherClientConfig } from "./ClientConfig";
export declare class Precipitation {
    private readonly folder;
    private readonly columns;
    private checkCursor;
    private lastFocus?;
    private active;
    private rayParams?;
    constructor(look: WeatherAppearance);
    setAppearance(look: WeatherAppearance): void;
    update(params: WeatherParams, focus: Vector3, config: WeatherClientConfig): number;
    private stopAll;
    private params;
    private cast;
    private check;
    destroy(): void;
}
