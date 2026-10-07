import { WeatherParams } from "../Params";
import { WeatherSounds } from "./ClientConfig";
export declare class WeatherAudio {
    private readonly group;
    private readonly muffle;
    private readonly rain?;
    private readonly wind?;
    private readonly thunder;
    private readonly volume;
    private readonly random;
    constructor(sounds: WeatherSounds);
    update(params: WeatherParams, exposure: number): void;
    playThunder(volume: number): void;
    destroy(): void;
}
