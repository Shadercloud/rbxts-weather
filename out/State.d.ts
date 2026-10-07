import { WeatherParams } from "./Params";
import { RegionShape } from "./Region";
export interface Transition {
    from: WeatherParams;
    to: WeatherParams;
    start: number;
    duration: number;
}
export declare function clock(): number;
export declare function sampleTransition(transition: Transition, now: number): WeatherParams;
export declare function writeTransition(instance: Instance, transition: Transition): void;
export declare function readTransition(instance: Instance): Transition | undefined;
export declare function clearTransition(instance: Instance): void;
export declare function writeShape(instance: Instance, shape: RegionShape): void;
export declare function getOwnRoot(): Folder;
export declare function getZonesFolder(root: Instance): Folder;
export declare function sweepCache(): void;
export declare function evaluateGlobal(now: number): WeatherParams;
export declare function evaluateAt(position: Vector3, now: number): WeatherParams;
