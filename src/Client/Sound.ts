import { SHELTER_MUFFLE, WIND_FULL_SPEED } from "../config";
import { WeatherParams } from "../Params";
import { WeatherSounds } from "./ClientConfig";

function makeSound(id: string | undefined, looped: boolean, group: SoundGroup): Sound | undefined {
	if (id === undefined || id === "") return undefined;
	const sound = new Instance("Sound");
	sound.SoundId = id;
	sound.Looped = looped;
	sound.Volume = 0;
	sound.SoundGroup = group;
	sound.Parent = group;
	return sound;
}

function setLoop(sound: Sound | undefined, volume: number) {
	if (!sound) return;
	sound.Volume = volume;
	if (volume > 0.001 && !sound.IsPlaying) sound.Play();
	else if (volume <= 0.001 && sound.IsPlaying) sound.Stop();
}

// Rain and wind loops plus thunder, played in the listener's head (not in the world). Under a roof the
// loops get quieter and lose their high end.
export class WeatherAudio {
	private readonly group: SoundGroup;
	private readonly muffle: EqualizerSoundEffect;
	private readonly rain?: Sound;
	private readonly wind?: Sound;
	private readonly thunder = new Array<Sound>();
	private readonly volume: number;
	private readonly random = new Random();

	constructor(sounds: WeatherSounds) {
		this.volume = sounds.volume;
		this.group = new Instance("SoundGroup");
		this.group.Name = "Weather";
		this.muffle = new Instance("EqualizerSoundEffect");
		this.muffle.LowGain = 0;
		this.muffle.MidGain = 0;
		this.muffle.HighGain = 0;
		this.muffle.Parent = this.group;
		this.group.Parent = game.GetService("SoundService");
		this.rain = makeSound(sounds.rain, true, this.group);
		this.wind = makeSound(sounds.wind, true, this.group);
		const thunder = typeIs(sounds.thunder, "string") ? [sounds.thunder] : (sounds.thunder ?? []);
		for (const id of thunder) {
			const sound = makeSound(id, false, this.group);
			if (sound) this.thunder.push(sound);
		}
	}

	update(params: WeatherParams, exposure: number) {
		const sheltered = 1 - exposure;
		this.muffle.HighGain = SHELTER_MUFFLE * sheltered;
		this.muffle.MidGain = SHELTER_MUFFLE * 0.4 * sheltered;
		setLoop(this.rain, this.volume * params.rain * (0.35 + 0.65 * exposure));
		const windAmount = math.clamp(params.wind.Magnitude / WIND_FULL_SPEED, 0, 1);
		setLoop(this.wind, this.volume * 0.6 * windAmount * windAmount * (0.4 + 0.6 * exposure));
	}

	playThunder(volume: number) {
		if (this.thunder.isEmpty()) return;
		// A random recording, pitched a little differently each time so repeats are hard to spot.
		const sound = this.thunder[this.random.NextInteger(0, this.thunder.size() - 1)];
		sound.Volume = this.volume * volume;
		sound.PlaybackSpeed = this.random.NextNumber(0.9, 1.05);
		sound.TimePosition = 0;
		sound.Play();
	}

	destroy() {
		this.group.Destroy();
	}
}
