export type Season = "spring" | "summer" | "autumn" | "winter";
export declare const SEASONS: ReadonlyArray<Season>;
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
export declare const DEFAULT_SEASON: Readonly<SeasonState>;
export interface SeasonTransition {
    from: SeasonState;
    to: SeasonState;
    start: number;
    duration: number;
}
export declare function sampleSeason(transition: SeasonTransition, now: number): SeasonState;
export declare function writeSeason(instance: Instance, transition: SeasonTransition): void;
export declare function readSeason(instance: Instance): SeasonTransition | undefined;
export declare function clearSeason(instance: Instance): void;
