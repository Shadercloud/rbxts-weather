import {
	LEAF_EDDY_MIN,
	LEAF_EDDY_SCALE,
	LEAF_EDDY_SHARE,
	LEAF_EDDY_SPEED,
	LEAF_FADE,
	LEAF_GALE,
	LEAF_GUST,
	LEAF_GUST_SPEED,
	LEAF_HEIGHT_CEILING,
	LEAF_HEIGHT_MAX,
	LEAF_HEIGHT_MIN,
	LEAF_LIFE,
	LEAF_MAX,
	LEAF_RATE,
	LEAF_REST,
	LEAF_SINK_MAX,
	LEAF_SINK_MIN,
	LEAF_SPAWN_MAX,
	LEAF_SPAWN_MIN,
	LEAF_WIND_FOLLOW,
} from "../config";
import { LeafImage, WeatherAppearance } from "./ClientConfig";

const Workspace = game.GetService("Workspace");

// See where it is set: the least transparency that keeps a leaf in the transparent render pass.
const MIN_TRANSPARENCY = 0.02;
const Players = game.GetService("Players");

interface Leaf {
	part: BasePart;
	/** How fast it sinks (studs per second): leaves that start high come down faster. */
	sink: number;
	born: number;
	position: Vector3;
	velocity: Vector3;
	rotation: CFrame;
	spin: Vector3;
	seed: number;
	landed?: number;
	groundY: number;
}

// A leaf: one of the curved leaf meshes with one of the pictures as its texture. A SpecialMesh takes both
// by id at run time, with no EditableMesh or EditableImage; its texture's transparent background leaves only
// the leaf's own outline.
function makeLeaf(image: LeafImage, meshId: string, size: number, shade: number): BasePart {
	const part = new Instance("Part");
	part.Name = "Leaf";
	part.Size = new Vector3(size, size * 0.3, size);
	part.Anchored = true;
	part.CanCollide = false;
	part.CanQuery = false;
	part.CanTouch = false;
	part.CastShadow = false;
	part.Transparency = MIN_TRANSPARENCY;
	const mesh = new Instance("SpecialMesh");
	mesh.MeshType = Enum.MeshType.FileMesh;
	mesh.MeshId = meshId;
	mesh.TextureId = image.texture;
	mesh.Scale = new Vector3(size, size, size);
	// A little darker or duller now and then, so two leaves from one picture still differ.
	const tint = (image.tint ?? new Color3(1, 1, 1)).Lerp(new Color3(0.72, 0.62, 0.5), shade);
	mesh.VertexColor = new Vector3(tint.R, tint.G, tint.B);
	mesh.Parent = part;
	return part;
}

// Autumn: leaves drift down from high up all around the player, tumbling and fluttering on the wind; they
// land, lie a moment and fade. They start out of the camera's view, so none appears out of nothing.
export class Leaves {
	private readonly folder: Folder;
	private readonly leaves = new Array<Leaf>();
	private readonly random = new Random();
	private owed = 0;
	private readonly rayParams = new RaycastParams();

	constructor() {
		this.folder = new Instance("Folder");
		this.folder.Name = "WeatherLeaves";
		this.folder.Parent = Workspace;
	}

	// Height of the ground under a point, looking well below it (a leaf can start up to LEAF_HEIGHT_CEILING studs up).
	private ground(position: Vector3): number | undefined {
		return Workspace.Raycast(position.add(new Vector3(0, 2, 0)), new Vector3(0, -300, 0), this.rayParams)?.Position
			.Y;
	}

	private onScreen(camera: Camera, point: Vector3): boolean {
		const [screen, inFront] = camera.WorldToViewportPoint(point);
		const viewport = camera.ViewportSize;
		const margin = 80;
		return (
			inFront &&
			screen.X > -margin &&
			screen.X < viewport.X + margin &&
			screen.Y > -margin &&
			screen.Y < viewport.Y + margin
		);
	}

	// The air the leaves ride: the wind, plus eddies that drift slowly through space and time. Every leaf at a
	// point is carried the same way, so they move together, but the eddies swirl them in from all sides instead
	// of every leaf arriving from upwind. On a still day the eddies alone move them.
	private flow(position: Vector3, now: number, wind: Vector3): Vector3 {
		// Gusts: one rhythm for every leaf, so a gust sends them all surging at once.
		const gust = 1 + LEAF_GUST * 2 * math.noise(now * LEAF_GUST_SPEED, 7.3);
		const steady = new Vector3(wind.X, 0, wind.Z).mul(LEAF_WIND_FOLLOW * gust);
		const strength = math.max(LEAF_EDDY_MIN, steady.Magnitude * LEAF_EDDY_SHARE);
		const x = position.X / LEAF_EDDY_SCALE;
		const z = position.Z / LEAF_EDDY_SCALE;
		const t = now * LEAF_EDDY_SPEED;
		const eddy = new Vector3(math.noise(x, z, t), 0, math.noise(x + 31.7, z - 17.3, t));
		return steady.add(eddy.mul(strength * 2));
	}

	// Where a leaf starts: high up, anywhere in a wide ring around the camera (spread evenly over its area),
	// but never where the camera can see it, so no leaf appears out of nothing; in front, that means above
	// the top of the frame. Returns the point and the
	// ground under it.
	//
	// In a strong wind a leaf crosses the area in seconds, so it starts on the upwind side (to sweep across it)
	// and lower (to be near the ground while it does), down to a quarter of the usual height in a gale.
	private spawnPoint(camera: Camera, focus: Vector3, wind: Vector3): [Vector3, number] | undefined {
		const windiness = math.clamp(wind.Magnitude / LEAF_GALE, 0, 1);
		const flat = new Vector3(wind.X, 0, wind.Z);
		const lower = 1 - 0.75 * windiness;
		for (let attempt = 0; attempt < 12; attempt++) {
			let spot: Vector3;
			if (windiness > 0.25 && flat.Magnitude > 0.01 && this.random.NextNumber() < 0.7) {
				// Most start from a spot in front of the camera, then (below) move upwind until out of sight, so
				// the wind carries them across the view.
				const look = camera.CFrame.LookVector;
				const ahead =
					new Vector3(look.X, 0, look.Z).Magnitude > 0.01 ? new Vector3(look.X, 0, look.Z).Unit : flat.Unit;
				const side = new Vector3(-ahead.Z, 0, ahead.X);
				spot = focus
					.add(ahead.mul(this.random.NextNumber(8, 50)))
					.add(side.mul(this.random.NextNumber(-30, 30)));
			} else if (windiness > 0.25 && flat.Magnitude > 0.01) {
				const along = flat.Unit;
				const across = new Vector3(-along.Z, 0, along.X);
				spot = focus
					.sub(along.mul(LEAF_SPAWN_MAX * this.random.NextNumber(0.3, 1)))
					.add(across.mul(LEAF_SPAWN_MAX * this.random.NextNumber(-0.8, 0.8)));
			} else {
				const angle = this.random.NextNumber(0, 2 * math.pi);
				const inner = LEAF_SPAWN_MIN * LEAF_SPAWN_MIN;
				const distance = math.sqrt(this.random.NextNumber(inner, LEAF_SPAWN_MAX * LEAF_SPAWN_MAX));
				spot = focus.add(new Vector3(math.cos(angle) * distance, 0, math.sin(angle) * distance));
			}
			const windy = windiness > 0.25 && flat.Magnitude > 0.01;
			let height = this.random.NextNumber(LEAF_HEIGHT_MIN, LEAF_HEIGHT_MAX) * lower;
			let groundY = this.ground(spot.add(new Vector3(0, 100, 0)));
			if (groundY === undefined) continue;
			let point = new Vector3(spot.X, groundY + height, spot.Z);
			// A start the camera can see is moved out of view: in a strong wind further upwind, keeping it low
			// (the wind brings it in); otherwise up above the top of the frame, so it drifts down from the sky.
			for (let tries = 0; tries < 16 && this.onScreen(camera, point); tries++) {
				if (windy) {
					spot = spot.sub(flat.Unit.mul(10));
					groundY = this.ground(spot.add(new Vector3(0, 100, 0)));
					if (groundY === undefined) break;
				} else {
					height = math.min(height + 5, LEAF_HEIGHT_CEILING);
				}
				point = new Vector3(spot.X, groundY + height, spot.Z);
			}
			if (groundY !== undefined && !this.onScreen(camera, point)) return [point, groundY];
		}
		return undefined;
	}

	private spawn(now: number, camera: Camera, focus: Vector3, wind: Vector3, look: WeatherAppearance) {
		const images = look.leaves;
		if (images.isEmpty()) return;
		const spawned = this.spawnPoint(camera, focus, wind);
		if (!spawned) return;
		const [point, groundY] = spawned;
		const sink = this.random.NextNumber(LEAF_SINK_MIN, LEAF_SINK_MAX);

		const image = images[this.random.NextInteger(0, images.size() - 1)];
		const size = (image.size ?? 1) * look.leafSize * this.random.NextNumber(0.8, 1.2);
		const meshes = look.leafMeshes;
		if (meshes.isEmpty()) return;
		const meshId = meshes[this.random.NextInteger(0, meshes.size() - 1)];
		const part = makeLeaf(image, meshId, size, this.random.NextNumber(0, 0.45));
		part.Parent = this.folder;

		const spin = new Vector3(
			this.random.NextNumber(-1, 1),
			this.random.NextNumber(-1, 1),
			this.random.NextNumber(-1, 1),
		);
		this.leaves.push({
			part,
			sink,
			born: now,
			position: point,
			velocity: Vector3.zero,
			rotation: CFrame.Angles(this.random.NextNumber(0, 6.28), this.random.NextNumber(0, 6.28), 0),
			spin: spin.Magnitude > 0.01 ? spin.Unit.mul(this.random.NextNumber(2, 6)) : new Vector3(0, 4, 0),
			seed: this.random.NextNumber(0, 1000),
			groundY,
		});
	}

	// `amount` is autumn's intensity, 0-1.
	update(deltaTime: number, now: number, amount: number, wind: Vector3, focus: Vector3, look: WeatherAppearance) {
		const camera = Workspace.CurrentCamera;
		if (!camera) return;

		const ignore: Instance[] = [this.folder];
		for (const player of Players.GetPlayers()) if (player.Character) ignore.push(player.Character);
		this.rayParams.FilterType = Enum.RaycastFilterType.Exclude;
		this.rayParams.FilterDescendantsInstances = ignore;

		// A strong wind sweeps leaves through quickly, so more set off to keep the air as full.
		const windiness = math.clamp(wind.Magnitude / LEAF_GALE, 0, 1);
		this.owed += LEAF_RATE * amount * (0.5 + 1.5 * windiness) * deltaTime;
		while (this.owed >= 1) {
			this.owed -= 1;
			if (this.leaves.size() < LEAF_MAX * amount) this.spawn(now, camera, focus, wind, look);
		}

		const parts = new Array<BasePart>();
		const cframes = new Array<CFrame>();
		for (let i = this.leaves.size() - 1; i >= 0; i--) {
			const leaf = this.leaves[i];
			const age = now - leaf.born;

			let fade = 0;
			if (leaf.landed !== undefined) fade = math.clamp((now - leaf.landed - LEAF_REST) / LEAF_FADE, 0, 1);
			else if (age > LEAF_LIFE) fade = math.clamp((age - LEAF_LIFE) / LEAF_FADE, 0, 1);
			// Drifted far away: dropped at once (at that distance it is a speck, if it is in view at all).
			if (fade >= 1 || leaf.position.sub(focus).Magnitude > LEAF_SPAWN_MAX * 1.5) {
				leaf.part.Destroy();
				this.leaves.remove(i);
				continue;
			}
			// Never fully opaque: a SpecialMesh only honours its texture's transparent background in the transparent
			// render pass, and an opaque part draws that background black.
			leaf.part.Transparency = MIN_TRANSPARENCY + (1 - MIN_TRANSPARENCY) * fade;

			if (leaf.landed === undefined) {
				// Carried by the air at its spot, each leaf a little lighter or heavier than the next.
				const carry = this.flow(leaf.position, now, wind).mul(
					0.85 + 0.3 * (math.noise(leaf.seed, age * 0.6) + 0.5),
				);
				const sway = new Vector3(
					math.noise(leaf.seed, age * 1.5, 3),
					0,
					math.noise(leaf.seed, age * 1.5, 4),
				).mul(2);
				const bob = math.sin(age * 3.2 + leaf.seed) * 1.4 + math.noise(leaf.seed, age, 5) * 2;
				const target = carry.add(sway).add(new Vector3(0, bob - leaf.sink, 0));
				leaf.velocity = leaf.velocity.Lerp(target, math.min(1, deltaTime * 2));
				leaf.position = leaf.position.add(leaf.velocity.mul(deltaTime));
				// Tumbling faster the harder it is blown.
				const tumble = deltaTime * (1 + math.min(leaf.velocity.Magnitude / 10, 2));
				leaf.rotation = leaf.rotation.mul(
					CFrame.Angles(leaf.spin.X * tumble, leaf.spin.Y * tumble, leaf.spin.Z * tumble),
				);

				if (math.random() < 0.2) leaf.groundY = this.ground(leaf.position) ?? leaf.groundY;
				if (leaf.position.Y <= leaf.groundY + 0.03) {
					leaf.landed = now;
					leaf.position = new Vector3(leaf.position.X, leaf.groundY + 0.03, leaf.position.Z);
					const [, yaw] = leaf.rotation.ToOrientation();
					leaf.rotation = CFrame.Angles(0, yaw, 0).mul(
						CFrame.Angles(math.random() < 0.5 ? 0 : math.pi, 0, 0),
					);
				}
			}
			parts.push(leaf.part);
			cframes.push(new CFrame(leaf.position).mul(leaf.rotation));
		}
		Workspace.BulkMoveTo(parts, cframes, Enum.BulkMoveMode.FireCFrameChanged);
	}

	destroy() {
		this.folder.Destroy();
		this.leaves.clear();
	}
}
