import { DARK_BRIGHTNESS, DARK_CONTRAST, DARK_SATURATION, FLASH_BRIGHTNESS, FOG_DENSITY, FOG_HAZE } from "../config";
import { WeatherParams } from "../Params";

interface AtmosphereBase {
	Density: number;
	Haze: number;
	Glare: number;
	Color: Color3;
	Decay: Color3;
}

interface CloudsBase {
	Enabled: boolean;
	Cover: number;
	Density: number;
	Color: Color3;
}

// Clouds, Atmosphere and a colour grade. Fog is laid over the game's own Atmosphere, so a game's clear-day
// haze is kept; clouds are set outright. Everything is put back by `stop`, and instances the sky created are
// removed. The game's Lighting.Brightness is never touched, so a day/night cycle keeps working.
export class Sky {
	private atmosphere?: Atmosphere;
	private atmosphereBase?: AtmosphereBase;
	private clouds?: Clouds;
	private cloudsBase?: CloudsBase;
	private readonly created = new Array<Instance>();
	private readonly grade: ColorCorrectionEffect;

	constructor() {
		const lighting = game.GetService("Lighting");
		const terrain = game.GetService("Workspace").Terrain;

		this.atmosphere = lighting.FindFirstChildOfClass("Atmosphere");
		if (this.atmosphere) {
			const a = this.atmosphere;
			this.atmosphereBase = { Density: a.Density, Haze: a.Haze, Glare: a.Glare, Color: a.Color, Decay: a.Decay };
		} else {
			this.atmosphere = new Instance("Atmosphere");
			this.atmosphere.Density = 0;
			this.atmosphere.Haze = 0;
			this.atmosphere.Glare = 0;
			this.atmosphere.Parent = lighting;
			this.created.push(this.atmosphere);
			this.atmosphereBase = {
				Density: 0,
				Haze: 0,
				Glare: 0,
				Color: this.atmosphere.Color,
				Decay: this.atmosphere.Decay,
			};
		}

		this.clouds = terrain.FindFirstChildOfClass("Clouds");
		if (this.clouds) {
			const c = this.clouds;
			this.cloudsBase = { Enabled: c.Enabled, Cover: c.Cover, Density: c.Density, Color: c.Color };
		} else {
			this.clouds = new Instance("Clouds");
			this.clouds.Parent = terrain;
			this.created.push(this.clouds);
		}

		this.grade = new Instance("ColorCorrectionEffect");
		this.grade.Name = "WeatherGrade";
		this.grade.Parent = lighting;
		this.created.push(this.grade);
	}

	update(params: WeatherParams, flash: number) {
		const atmosphere = this.atmosphere;
		const base = this.atmosphereBase;
		if (atmosphere && base) {
			const fog = params.fog;
			atmosphere.Density = base.Density + (FOG_DENSITY - base.Density) * fog;
			atmosphere.Haze = base.Haze + (FOG_HAZE - base.Haze) * fog;
			atmosphere.Glare = base.Glare * (1 - math.max(params.darkness, params.clouds * 0.5));
			atmosphere.Color = base.Color.Lerp(params.fogColor, fog);
			atmosphere.Decay = base.Decay.Lerp(params.fogColor.Lerp(new Color3(), 0.3), fog);
		}

		if (this.clouds) {
			this.clouds.Enabled = params.clouds > 0.01;
			this.clouds.Cover = params.clouds;
			this.clouds.Density = params.cloudDensity;
			this.clouds.Color = params.cloudColor;
		}

		this.grade.Brightness = DARK_BRIGHTNESS * params.darkness + FLASH_BRIGHTNESS * flash;
		this.grade.Saturation = DARK_SATURATION * params.darkness;
		this.grade.Contrast = DARK_CONTRAST * params.darkness;
	}

	stop() {
		const atmosphere = this.atmosphere;
		const base = this.atmosphereBase;
		if (atmosphere && base && !this.created.includes(atmosphere)) {
			atmosphere.Density = base.Density;
			atmosphere.Haze = base.Haze;
			atmosphere.Glare = base.Glare;
			atmosphere.Color = base.Color;
			atmosphere.Decay = base.Decay;
		}
		const clouds = this.clouds;
		const cloudsBase = this.cloudsBase;
		if (clouds && cloudsBase) {
			clouds.Enabled = cloudsBase.Enabled;
			clouds.Cover = cloudsBase.Cover;
			clouds.Density = cloudsBase.Density;
			clouds.Color = cloudsBase.Color;
		}
		for (const instance of this.created) instance.Destroy();
		this.created.clear();
	}
}
