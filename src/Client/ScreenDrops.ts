import {
	SCREEN_DROP_BLUR_RADIUS,
	SCREEN_DROP_DISTANCE,
	SCREEN_DROP_FADE_IN,
	SCREEN_DROP_LIFE_MAX,
	SCREEN_DROP_LIFE_MIN,
	SCREEN_DROP_MAX,
	SCREEN_DROP_RATE,
	SCREEN_DROP_SIZE_MAX,
	SCREEN_DROP_SIZE_MIN,
	SCREEN_DROP_SLIDE_CHANCE,
	SCREEN_DROP_TRANSPARENCY,
} from "../config";
import { WeatherParams } from "../Params";

interface Drop {
	part: Part;
	born: number;
	life: number;
	/** Position on the screen, -1 to 1 from the centre (x scaled by the aspect ratio when placed). */
	x: number;
	y: number;
	/** Diameter in studs at SCREEN_DROP_DISTANCE. */
	size: number;
	/** Top sliding speed in screen halves per second; 0 for a drop that clings where it landed. */
	slide: number;
	/** Seconds it clings before it can start to run. */
	cling: number;
	/** Distance run so far, and sideways drift, in screen halves. */
	ran: number;
	drift: number;
	/** Picks this drop's own stretch of noise, so no two run alike. */
	seed: number;
}

// How much rain reaches the lens: most looking up, some looking ahead, none looking down; more facing into
// the wind.
function exposureOfView(look: Vector3, wind: Vector3): number {
	let amount = math.clamp(0.35 + look.Y, 0, 1);
	if (wind.Magnitude > 1) amount += math.max(0, -look.Dot(wind.Unit)) * math.clamp(wind.Magnitude / 30, 0, 0.6);
	return math.clamp(amount, 0, 1);
}

function makePart(folder: Instance): Part {
	const part = new Instance("Part");
	part.Name = "Drop";
	part.Shape = Enum.PartType.Ball;
	// Glass refracts what is behind it, so each drop shows a bent, flipped bit of the scene like real water.
	part.Material = Enum.Material.Glass;
	part.Color = Color3.fromRGB(240, 244, 248);
	part.Anchored = true;
	part.CanCollide = false;
	part.CanQuery = false;
	part.CanTouch = false;
	part.CastShadow = false;
	part.Transparency = 1;
	part.Parent = folder;
	return part;
}

// Water on the lens while it rains: glass beads just in front of the camera, blurred out of focus by a
// depth of field that only reaches the first stud, so the world stays sharp. They appear, sometimes run
// down, and fade. Opt in with `Weather.configure({ screenDrops: true })`.
export class ScreenDrops {
	private readonly folder: Folder;
	private readonly blur: DepthOfFieldEffect;
	private readonly drops = new Array<Drop>();
	private readonly pool = new Array<Part>();
	private readonly random = new Random();
	private owed = 0;

	constructor() {
		this.folder = new Instance("Folder");
		this.folder.Name = "WeatherScreenDrops";
		this.blur = new Instance("DepthOfFieldEffect");
		this.blur.Name = "WeatherScreenDrops";
		this.blur.FarIntensity = 0;
		this.blur.NearIntensity = 1;
		this.blur.FocusDistance = SCREEN_DROP_BLUR_RADIUS + 3;
		this.blur.InFocusRadius = 3;
		this.blur.Enabled = false;
		this.blur.Parent = game.GetService("Lighting");
	}

	update(deltaTime: number, now: number, params: WeatherParams, exposure: number, camera: Camera) {
		if (this.folder.Parent !== camera) this.folder.Parent = camera;

		const rate = SCREEN_DROP_RATE * params.rain * exposure * exposureOfView(camera.CFrame.LookVector, params.wind);
		this.owed += rate * deltaTime;
		while (this.owed >= 1) {
			this.owed -= 1;
			if (this.drops.size() < SCREEN_DROP_MAX) this.spawn(now);
		}

		// The blur is only on while there are drops, so a game's own depth of field is left alone otherwise.
		this.blur.Enabled = !this.drops.isEmpty();

		const halfHeight = SCREEN_DROP_DISTANCE * math.tan(math.rad(camera.FieldOfView / 2));
		const aspect = camera.ViewportSize.X / math.max(camera.ViewportSize.Y, 1);
		for (let i = this.drops.size() - 1; i >= 0; i--) {
			const drop = this.drops[i];
			const age = now - drop.born;
			if (age >= drop.life) {
				drop.part.Transparency = 1;
				this.pool.push(drop.part);
				this.drops.remove(i);
				continue;
			}
			this.draw(drop, age, deltaTime, camera.CFrame, halfHeight, aspect);
		}
	}

	private spawn(now: number) {
		const part = this.pool.pop() ?? makePart(this.folder);
		const size = this.random.NextNumber(SCREEN_DROP_SIZE_MIN, SCREEN_DROP_SIZE_MAX);
		// Bigger drops are heavier: more likely to run, and faster.
		const heft = (size - SCREEN_DROP_SIZE_MIN) / (SCREEN_DROP_SIZE_MAX - SCREEN_DROP_SIZE_MIN);
		const slides = this.random.NextNumber() < SCREEN_DROP_SLIDE_CHANCE * (0.5 + heft);
		this.drops.push({
			part,
			born: now,
			life: this.random.NextNumber(SCREEN_DROP_LIFE_MIN, SCREEN_DROP_LIFE_MAX),
			x: this.random.NextNumber(-0.95, 0.95),
			// Squared, so most land low on the screen.
			y: -0.95 + 1.9 * this.random.NextNumber() ** 2,
			size,
			slide: slides ? this.random.NextNumber(0.15, 0.45) * (0.6 + heft) : 0,
			cling: this.random.NextNumber(0, 1.2),
			ran: 0,
			drift: 0,
			seed: this.random.NextNumber(0, 1000),
		});
	}

	private draw(drop: Drop, age: number, deltaTime: number, view: CFrame, halfHeight: number, aspect: number) {
		// Fade in quickly, hold, fade out over the last 40% of its life.
		const fadeOut = math.clamp((drop.life - age) / (drop.life * 0.4), 0, 1);
		const landing = math.clamp(age / SCREEN_DROP_FADE_IN, 0, 1);
		const visible = math.min(landing, fadeOut);

		// Water runs in fits and starts: it catches, lets go, speeds up and stops again, wandering a little
		// sideways. Noise over time drives the speed; below zero the drop holds still.
		if (drop.slide > 0 && age > drop.cling) {
			const urge = math.noise(drop.seed, age * 2.3) * 2.5 + 0.15;
			const speed = drop.slide * math.clamp(urge, 0, 1.6);
			drop.ran += speed * deltaTime;
			drop.drift += math.noise(drop.seed, age * 1.1, 7) * speed * deltaTime * 0.6;
		}

		// It spreads as it lands, and shrinks a little as it dries. A ball part is always round, whatever its
		// size says, so drops cannot stretch as they run.
		const size = drop.size * (0.6 + 0.4 * landing) * (0.85 + 0.15 * fadeOut);
		drop.part.Size = Vector3.one.mul(size);
		const x = (drop.x + drop.drift) * halfHeight * aspect;
		drop.part.CFrame = view.mul(new CFrame(x, (drop.y - drop.ran) * halfHeight, -SCREEN_DROP_DISTANCE));
		drop.part.Transparency = 1 - (1 - SCREEN_DROP_TRANSPARENCY) * visible;
	}

	destroy() {
		this.folder.Destroy();
		this.blur.Destroy();
		this.drops.clear();
		this.pool.clear();
	}
}
