import { WeatherClientConfig, WeatherClientOptions } from "./Client/ClientConfig";
import {
	configureRenderer,
	getConfig,
	getExposure,
	getRendered,
	isRendering,
	startRenderer,
	stopRenderer,
} from "./Client/Renderer";
import { DEFAULT_TRANSITION } from "./config";
import { WeatherControl } from "./Control";
import { PARAM_KEYS, SeasonFields, WeatherOptions, WeatherParams, WeatherPreset, WeatherSample } from "./Params";
import { WeatherRegion } from "./Region";
import { Season, SeasonOptions, SeasonState, clearSeason, readSeason, sampleSeason, writeSeason } from "./Season";
import { clearTransition, clock, evaluateAt, evaluateGlobal, evaluateSeason, getOwnRoot } from "./State";
import { WeatherZone, WeatherZoneOptions } from "./WeatherZone";

const isServer = game.GetService("RunService").IsServer();

/**
 * The weather. Called on the server it changes the weather for everyone; called on a client it changes it
 * for that player only, over whatever the server set, until `reset()`.
 *
 * ```ts
 * Weather.rain({ intensity: 0.8, transition: 10 });
 * Weather.zone(marshPart, { blend: 30 }).fog();
 * Weather.setSeason("autumn", { intensity: 0.7 });
 * ```
 *
 * Clients draw the weather once `Weather.start()` has been called on them (any client-side call starts it too).
 */
export class WeatherApi extends WeatherControl {
	protected holder(): Instance {
		return getOwnRoot();
	}

	protected changed() {
		if (!isServer) startRenderer();
	}

	/**
	 * As for zones, plus the season: `season` and `seasonIntensity` may be passed in the fields or the options,
	 * e.g. `Weather.rain({ season: "autumn" })` or `Weather.set({ season: "winter", seasonIntensity: 0.5 })`.
	 */
	set(weather: WeatherPreset | (Partial<WeatherParams> & SeasonFields), options?: WeatherOptions): this {
		const fields = typeIs(weather, "string") ? undefined : weather;
		const season = options?.season ?? fields?.season;
		const intensity = options?.seasonIntensity ?? fields?.seasonIntensity;
		if (season !== undefined || intensity !== undefined) {
			const target = readSeason(getOwnRoot())?.to ?? evaluateSeason(clock());
			this.setSeason(season ?? target.season, {
				intensity: intensity ?? (season !== undefined ? 1 : target.intensity),
				transition: options?.transition,
			});
		}
		if (typeIs(weather, "string")) return super.set(weather, options);
		// Only the weather fields go on to the weather; a call that only set the season stops here.
		const rest: Partial<WeatherParams> = {};
		let any = false;
		for (const key of PARAM_KEYS) {
			const value = weather[key];
			if (value !== undefined) {
				(rest as Record<string, unknown>)[key] = value;
				any = true;
			}
		}
		return any ? super.set(rest, options) : this;
	}

	/**
	 * Change the season. It is separate from the weather (presets keep it) and has no zones. Only autumn is drawn
	 * for now: leaves fall, more with a higher intensity. Changing season fades the old one out, then the new in.
	 */
	setSeason(season: Season, options?: SeasonOptions): this {
		const holder = getOwnRoot();
		const now = clock();
		const existing = readSeason(holder);
		// A client's first season starts from the server's, so it changes smoothly from what is showing.
		const current = existing ? sampleSeason(existing, now) : evaluateSeason(now);
		const to = { season, intensity: math.clamp(options?.intensity ?? 1, 0, 1) };
		const duration = math.max(0, options?.transition ?? DEFAULT_TRANSITION);
		writeSeason(holder, { from: current, to, start: now, duration });
		this.changed();
		return this;
	}

	/** The season right now, partway through a change if one is running. */
	getSeason(): SeasonState {
		return evaluateSeason(clock());
	}

	/** Weather of its own inside a region. Set its weather on the returned zone. */
	zone(region: WeatherRegion, options?: WeatherZoneOptions): WeatherZone {
		return new WeatherZone(region, options, () => this.changed());
	}

	/**
	 * Drop the weather and season this side has set: a client goes back to the server's, the server back to
	 * clear weather in summer.
	 */
	reset() {
		clearTransition(getOwnRoot());
		clearSeason(getOwnRoot());
	}

	/**
	 * The weather at a point right now, zones included: for gameplay that depends on it (wet ground, cold).
	 * Without a position, the global weather; on a client drawing the weather, what is drawn at the camera.
	 */
	sample(position?: Vector3): WeatherSample {
		const now = clock();
		const weather = position ? evaluateAt(position, now) : (isRendering() && getRendered()) || evaluateGlobal(now);
		const season = evaluateSeason(now);
		return { ...weather, season: season.season, seasonIntensity: season.intensity };
	}

	/** Client: start drawing the weather. Safe to call more than once; does nothing on the server. */
	start() {
		startRenderer();
	}

	/** Client: stop drawing and put the sky, wind and lighting back as they were. */
	stop() {
		stopRenderer();
	}

	/** Client: how the weather is drawn. Merges into the current settings and applies at once. */
	configure(options: WeatherClientOptions) {
		configureRenderer(options);
	}

	getConfig(): Readonly<WeatherClientConfig> {
		return getConfig();
	}

	/** Client: how exposed the camera is to the sky, 0 under a roof to 1 in the open. */
	getExposure(): number {
		return getExposure();
	}
}

export const Weather = new WeatherApi();
