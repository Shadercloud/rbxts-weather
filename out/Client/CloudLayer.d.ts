import { WeatherParams } from "../Params";
export declare class CloudLayer {
    private readonly folder;
    private readonly layers;
    constructor(texture: string);
    setTexture(texture: string): void;
    update(params: WeatherParams, focus: Vector3, deltaTime: number, flash: number): number;
    destroy(): void;
}
