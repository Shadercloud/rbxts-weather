import { FLASH_SECONDS, LIGHTNING_CHANCE, LIGHTNING_SLOT, THUNDER_DELAY_MAX, THUNDER_DELAY_MIN } from "../config";

// Strikes are drawn from the server clock: each slot of time seeds its own random numbers, so every client
// flashes at the same moment without the server sending anything.
export class Lightning {
	private slot = -1;
	private flashAt = -math.huge;
	private thunderAt = math.huge;
	private thunderVolume = 0;

	/** Returns the flash brightness now, 0-1; calls `thunder` once per strike, some time after its flash. */
	update(lightning: number, now: number, thunder: (volume: number) => void): number {
		const slot = math.floor(now / LIGHTNING_SLOT);
		if (slot !== this.slot) {
			this.slot = slot;
			const random = new Random(slot);
			if (lightning > 0 && random.NextNumber() < lightning * LIGHTNING_CHANCE) {
				this.flashAt = (slot + random.NextNumber() * 0.8) * LIGHTNING_SLOT;
				this.thunderAt = this.flashAt + random.NextNumber(THUNDER_DELAY_MIN, THUNDER_DELAY_MAX);
				this.thunderVolume = random.NextNumber(0.5, 1);
			}
		}

		if (now >= this.thunderAt) {
			this.thunderAt = math.huge;
			thunder(this.thunderVolume);
		}

		const elapsed = now - this.flashAt;
		if (elapsed < 0 || elapsed >= FLASH_SECONDS) return 0;
		// A bright strike, a flicker off, then a second glow that fades.
		if (elapsed < 0.08) return 1;
		if (elapsed < 0.14) return 0.2;
		return 0.8 * (1 - (elapsed - 0.14) / (FLASH_SECONDS - 0.14));
	}
}
