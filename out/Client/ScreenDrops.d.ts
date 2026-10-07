import { WeatherParams } from "../Params";
export declare class ScreenDrops {
    private readonly folder;
    private readonly blur;
    private readonly drops;
    private readonly pool;
    private readonly random;
    private owed;
    constructor();
    update(deltaTime: number, now: number, params: WeatherParams, exposure: number, camera: Camera): void;
    private spawn;
    private draw;
    destroy(): void;
}
