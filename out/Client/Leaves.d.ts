import { WeatherAppearance } from "./ClientConfig";
export declare class Leaves {
    private readonly folder;
    private readonly leaves;
    private readonly random;
    private owed;
    private readonly rayParams;
    constructor();
    private ground;
    private onScreen;
    private flow;
    private spawnPoint;
    private spawn;
    update(deltaTime: number, now: number, amount: number, wind: Vector3, focus: Vector3, look: WeatherAppearance): void;
    destroy(): void;
}
