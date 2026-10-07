export declare class Lightning {
    private slot;
    private flashAt;
    private thunderAt;
    private thunderVolume;
    /** Returns the flash brightness now, 0-1; calls `thunder` once per strike, some time after its flash. */
    update(lightning: number, now: number, thunder: (volume: number) => void): number;
}
