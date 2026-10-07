import { WeatherParams } from "../Params";
export declare class Sky {
    private atmosphere?;
    private atmosphereBase?;
    private clouds?;
    private cloudsBase?;
    private readonly created;
    private readonly grade;
    constructor();
    update(params: WeatherParams, flash: number): void;
    stop(): void;
}
