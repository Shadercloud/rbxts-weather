export interface WeatherAppearance {
    rainTexture: string;
    rainColor: Color3;
    /** Particle size in studs, before squash. */
    rainSize: number;
    /**
     * `ParticleEmitter.Squash`, -3 to 3. Rain particles face along their velocity, and there a negative squash
     * stretches the drop along its fall into a streak (positive lays it sideways).
     */
    rainSquash: number;
    rainTransparency: number;
    snowTexture: string;
    snowColor: Color3;
    snowSize: number;
    splashColor: Color3;
    /** The storm cloud layer's texture: tileable, seen from below. */
    cloudTexture: string;
    /** Autumn leaves: each leaf shows one of these pictures, picked at random. */
    leaves: LeafImage[];
    /** Size of a leaf in studs, before each picture's own `size`. */
    leafSize: number;
    /** Mesh ids of curved leaf cards (one stud across, UV covering the face); each leaf takes one at random. */
    leafMeshes: string[];
}
/** A leaf picture: an image with a transparent background, the leaf filling it. */
export interface LeafImage {
    /** Image id ("rbxassetid://..."). */
    texture: string;
    /** Size relative to the others: a maple leaf is larger than a birch leaf. Default 1. */
    size?: number;
    /** Multiplies the picture's colours, for more shades from one picture. Default white (unchanged). */
    tint?: Color3;
}
export interface WeatherSounds {
    /** Sound ids ("rbxassetid://..."), replacing the package's own. "" turns one off. */
    rain?: string;
    wind?: string;
    /** One id or several; each strike plays one of them at random. */
    thunder?: string | string[];
    /** Master volume, default 0.5. */
    volume: number;
}
export interface WeatherClientConfig {
    /** Drive `Clouds`, `Atmosphere` and a colour grade. Off for games that manage their own sky. Default on. */
    sky: boolean;
    /** Drive `Workspace.GlobalWind` (sways grass, moves clouds). Default on. */
    wind: boolean;
    /** Particle rate multiplier. Default 1, or 0.5 on touch devices. */
    particles: number;
    /** Rain and snow stop at roofs and stay out of caves. Default on. */
    shelter: boolean;
    /** Water drops on the screen while the camera is out in the rain. Default off. */
    screenDrops: boolean;
    /** Heavy storm clouds overhead in dark, cloudy weather (needs `sky`). Default on. */
    stormClouds: boolean;
    /** Where the weather is sampled and drawn around. Default: the camera. */
    focus?: () => Vector3;
    /** Instances that do not stop rain (besides player characters and invisible parts). */
    ignore: Instance[];
    sounds: WeatherSounds;
    appearance: WeatherAppearance;
}
export type WeatherClientOptions = Partial<Omit<WeatherClientConfig, "sounds" | "appearance">> & {
    sounds?: Partial<WeatherSounds>;
    appearance?: Partial<WeatherAppearance>;
};
export declare function defaultConfig(): WeatherClientConfig;
export declare function mergeConfig(config: WeatherClientConfig, options: WeatherClientOptions): WeatherClientConfig;
