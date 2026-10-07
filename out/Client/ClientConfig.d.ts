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
