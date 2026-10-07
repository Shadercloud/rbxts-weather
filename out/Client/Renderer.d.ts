import { WeatherParams } from "../Params";
import { WeatherClientConfig, WeatherClientOptions } from "./ClientConfig";
export declare function isRendering(): boolean;
export declare function startRenderer(): void;
export declare function stopRenderer(): void;
export declare function configureRenderer(options: WeatherClientOptions): void;
export declare function getConfig(): Readonly<WeatherClientConfig>;
/** The weather drawn on the last frame, zones included; undefined while not rendering. */
export declare function getRendered(): WeatherParams | undefined;
/** How exposed the camera is to the sky, 0 (under a roof) to 1, smoothed. */
export declare function getExposure(): number;
