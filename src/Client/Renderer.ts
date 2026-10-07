import { SMOOTHING } from "../config";
import { WeatherParams } from "../Params";
import { clock, evaluateAt, evaluateSeason, sweepCache } from "../State";
import { WeatherClientConfig, WeatherClientOptions, defaultConfig, mergeConfig } from "./ClientConfig";
import { CloudLayer } from "./CloudLayer";
import { Leaves } from "./Leaves";
import { Lightning } from "./Lightning";
import { Precipitation } from "./Precipitation";
import { ScreenDrops } from "./ScreenDrops";
import { Sky } from "./Sky";
import { WeatherAudio } from "./Sound";

const RunService = game.GetService("RunService");
const Workspace = game.GetService("Workspace");

const STEP_NAME = "Weather";
const SWEEP_SECONDS = 5;

let config = defaultConfig();
let running = false;
let sky: Sky | undefined;
let precipitation: Precipitation | undefined;
let audio: WeatherAudio | undefined;
let screenDrops: ScreenDrops | undefined;
let leaves: Leaves | undefined;
let cloudLayer: CloudLayer | undefined;
let lightning = new Lightning();
let exposure = 1;
let lastSweep = 0;
let baseWind: Vector3 | undefined;
let current: WeatherParams | undefined;

function step(deltaTime: number) {
	const camera = Workspace.CurrentCamera;
	if (!camera) return;
	const focus = config.focus ? config.focus() : camera.CFrame.Position;
	const now = clock();
	const params = evaluateAt(focus, now);
	current = params;

	if (config.wind) Workspace.GlobalWind = params.wind;

	const season = evaluateSeason(now);
	const target = precipitation ? precipitation.update(params, focus, config) : 1;
	leaves?.update(
		deltaTime,
		now,
		season.season === "autumn" ? season.intensity : 0,
		params.wind,
		focus,
		config.appearance,
	);
	exposure += (target - exposure) * math.min(1, deltaTime * SMOOTHING);

	const flash = lightning.update(params.lightning, now, (volume) => audio?.playThunder(volume));
	const layer = cloudLayer?.update(params, focus, deltaTime, flash) ?? 0;
	sky?.update(params, flash * (0.4 + 0.6 * exposure), layer);
	audio?.update(params, exposure);
	screenDrops?.update(deltaTime, now, params, target, camera);

	if (now - lastSweep > SWEEP_SECONDS) {
		lastSweep = now;
		sweepCache();
	}
}

export function isRendering(): boolean {
	return running;
}

export function startRenderer() {
	if (running || RunService.IsServer()) return;
	running = true;
	baseWind = Workspace.GlobalWind;
	if (config.sky) sky = new Sky();
	precipitation = new Precipitation(config.appearance);
	audio = new WeatherAudio(config.sounds);
	if (config.screenDrops) screenDrops = new ScreenDrops();
	leaves = new Leaves();
	if (config.sky && config.stormClouds) cloudLayer = new CloudLayer(config.appearance.cloudTexture);
	lightning = new Lightning();
	RunService.BindToRenderStep(STEP_NAME, Enum.RenderPriority.Camera.Value + 1, step);
}

export function stopRenderer() {
	if (!running) return;
	running = false;
	RunService.UnbindFromRenderStep(STEP_NAME);
	sky?.stop();
	sky = undefined;
	precipitation?.destroy();
	precipitation = undefined;
	audio?.destroy();
	audio = undefined;
	screenDrops?.destroy();
	screenDrops = undefined;
	leaves?.destroy();
	leaves = undefined;
	cloudLayer?.destroy();
	cloudLayer = undefined;
	current = undefined;
	if (baseWind && config.wind) Workspace.GlobalWind = baseWind;
}

export function configureRenderer(options: WeatherClientOptions) {
	const previous = config;
	config = mergeConfig(config, options);
	if (!running) return;
	if (previous.sky !== config.sky) {
		sky?.stop();
		sky = config.sky ? new Sky() : undefined;
	}
	const wantClouds = config.sky && config.stormClouds;
	if (wantClouds !== (cloudLayer !== undefined)) {
		cloudLayer?.destroy();
		cloudLayer = wantClouds ? new CloudLayer(config.appearance.cloudTexture) : undefined;
	} else if (options.appearance?.cloudTexture !== undefined) {
		cloudLayer?.setTexture(config.appearance.cloudTexture);
	}
	if (previous.screenDrops !== config.screenDrops) {
		screenDrops?.destroy();
		screenDrops = config.screenDrops ? new ScreenDrops() : undefined;
	}
	if (previous.wind && !config.wind && baseWind) Workspace.GlobalWind = baseWind;
	if (options.appearance) {
		precipitation?.setAppearance(config.appearance);
	}
	if (options.sounds) {
		audio?.destroy();
		audio = new WeatherAudio(config.sounds);
	}
}

export function getConfig(): Readonly<WeatherClientConfig> {
	return config;
}

/** The weather drawn on the last frame, zones included; undefined while not rendering. */
export function getRendered(): WeatherParams | undefined {
	return current;
}

/** How exposed the camera is to the sky, 0 (under a roof) to 1, smoothed. */
export function getExposure(): number {
	return exposure;
}
