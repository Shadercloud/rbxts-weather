import { DEFAULT_TRANSITION } from "./config";
import { PRESETS, WeatherOptions, WeatherParams, WeatherPreset, copyParams, resolveTarget } from "./Params";
import { clock, readTransition, sampleTransition, writeTransition } from "./State";

// The calls shared by the global weather and by zones: pick a preset or set fields, with a transition.
export abstract class WeatherControl {
	/** The instance whose attributes hold this weather. */
	protected abstract holder(): Instance;

	/** Called after the weather changed. */
	protected changed() {}

	/**
	 * Change the weather to a preset, or change some fields of the current one.
	 *
	 * ```ts
	 * Weather.set("storm", { transition: 20 });
	 * Weather.set({ fog: 0.5 }); // keeps everything else
	 * ```
	 */
	set(weather: WeatherPreset | Partial<WeatherParams>, options?: WeatherOptions): this {
		const holder = this.holder();
		const now = clock();
		const existing = readTransition(holder);
		const current = existing ? sampleTransition(existing, now) : copyParams(PRESETS.clear);
		const to = resolveTarget(existing?.to ?? PRESETS.clear, weather, options);
		const duration = math.max(0, options?.transition ?? DEFAULT_TRANSITION);
		writeTransition(holder, { from: current, to, start: now, duration });
		this.changed();
		return this;
	}

	clear(options?: WeatherOptions): this {
		return this.set("clear", options);
	}

	cloudy(options?: WeatherOptions): this {
		return this.set("cloudy", options);
	}

	overcast(options?: WeatherOptions): this {
		return this.set("overcast", options);
	}

	fog(options?: WeatherOptions): this {
		return this.set("fog", options);
	}

	drizzle(options?: WeatherOptions): this {
		return this.set("drizzle", options);
	}

	rain(options?: WeatherOptions): this {
		return this.set("rain", options);
	}

	storm(options?: WeatherOptions): this {
		return this.set("storm", options);
	}

	snow(options?: WeatherOptions): this {
		return this.set("snow", options);
	}

	blizzard(options?: WeatherOptions): this {
		return this.set("blizzard", options);
	}

	/** The weather this control is at right now, partway through a transition if one is running. */
	get(): WeatherParams {
		const transition = readTransition(this.holder());
		return transition ? sampleTransition(transition, clock()) : copyParams(PRESETS.clear);
	}

	/** The weather this control is heading to (the end of the running transition). */
	getTarget(): WeatherParams {
		return readTransition(this.holder())?.to ?? copyParams(PRESETS.clear);
	}
}
