// The season: separate from the weather, so picking a weather preset never changes it, and global only (zones
// do not have one). For now only autumn is drawn (falling leaves); the others are there for games to read and
// for effects to come.
export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASONS: ReadonlyArray<Season> = ["spring", "summer", "autumn", "winter"];

export interface SeasonState {
	season: Season;
	/** How strongly the season shows, 0-1 (for autumn: how many leaves fall). */
	intensity: number;
}

export interface SeasonOptions {
	/** How strongly the season shows, 0-1. Default 1. */
	intensity?: number;
	/** Seconds to change over. Default 5; 0 switches at once. */
	transition?: number;
}

export const DEFAULT_SEASON: Readonly<SeasonState> = { season: "summer", intensity: 1 };

export interface SeasonTransition {
	from: SeasonState;
	to: SeasonState;
	start: number;
	duration: number;
}

function isSeason(value: unknown): value is Season {
	return typeIs(value, "string") && (SEASONS as ReadonlyArray<string>).includes(value);
}

// Between two different seasons the old one fades out over the first half and the new one in over the second:
// autumn's leaves stop falling before spring's effects begin.
export function sampleSeason(transition: SeasonTransition, now: number): SeasonState {
	const { from, to } = transition;
	const raw = transition.duration <= 0 ? 1 : math.clamp((now - transition.start) / transition.duration, 0, 1);
	const t = raw * raw * (3 - 2 * raw);
	if (from.season === to.season) {
		return { season: to.season, intensity: from.intensity + (to.intensity - from.intensity) * t };
	}
	return t < 0.5
		? { season: from.season, intensity: from.intensity * (1 - 2 * t) }
		: { season: to.season, intensity: to.intensity * (2 * t - 1) };
}

export function writeSeason(instance: Instance, transition: SeasonTransition) {
	instance.SetAttribute("season_from", transition.from.season);
	instance.SetAttribute("seasonIntensity_from", transition.from.intensity);
	instance.SetAttribute("season_to", transition.to.season);
	instance.SetAttribute("seasonIntensity_to", transition.to.intensity);
	instance.SetAttribute("season_start", transition.start);
	// Written last: readers treat an instance without it as having no season.
	instance.SetAttribute("season_duration", transition.duration);
}

export function readSeason(instance: Instance): SeasonTransition | undefined {
	const duration = instance.GetAttribute("season_duration");
	const start = instance.GetAttribute("season_start");
	const fromSeason = instance.GetAttribute("season_from");
	const toSeason = instance.GetAttribute("season_to");
	if (!typeIs(duration, "number") || !typeIs(start, "number") || !isSeason(fromSeason) || !isSeason(toSeason)) {
		return undefined;
	}
	const fromIntensity = instance.GetAttribute("seasonIntensity_from");
	const toIntensity = instance.GetAttribute("seasonIntensity_to");
	return {
		from: { season: fromSeason, intensity: typeIs(fromIntensity, "number") ? fromIntensity : 1 },
		to: { season: toSeason, intensity: typeIs(toIntensity, "number") ? toIntensity : 1 },
		start,
		duration,
	};
}

export function clearSeason(instance: Instance) {
	for (const name of [
		"season_duration",
		"season_start",
		"season_from",
		"season_to",
		"seasonIntensity_from",
		"seasonIntensity_to",
	]) {
		instance.SetAttribute(name, undefined);
	}
}
