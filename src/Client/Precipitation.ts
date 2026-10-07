import {
	CELL_SIZE,
	CHECKS_PER_FRAME,
	COVER_SEARCH,
	GRID_RADIUS,
	GROUND_SEARCH,
	NO_GROUND_DEPTH,
	RAIN_CURVE,
	RAIN_CLEARING,
	RAIN_HEIGHT,
	RAIN_RATE,
	RAIN_SPEED,
	RATE_FALLOFF,
	SEE_THROUGH,
	SNOW_GRID_RADIUS,
	SNOW_HEIGHT,
	SNOW_RATE,
	SNOW_SPEED,
	SPLASH_RADIUS,
	SPLASH_RATE,
} from "../config";
import { WeatherParams } from "../Params";
import { WeatherAppearance, WeatherClientConfig } from "./ClientConfig";

const Workspace = game.GetService("Workspace");
const Players = game.GetService("Players");

// A rain emitter part and where it sits in its column, relative to the column's centre.
interface RainPiece {
	part: Part;
	emitter: ParticleEmitter;
	offset: Vector3;
	/** Share of the column's area, so a column split into pieces emits as much as a whole one. */
	share: number;
}

// One column of the grid around the camera: rain and snow emitters above it, and one on the ground for
// splashes. See the Precipitation section of config.ts.
interface Column {
	dx: number;
	dz: number;
	rain: RainPiece[];
	snowPart: Part;
	snow: ParticleEmitter;
	/** Splashes, only on the columns near enough to see them. */
	groundPart?: Part;
	splash?: ParticleEmitter;
	/** Something is above the emitters: nothing falls here. */
	covered: boolean;
	/** Height of the first thing below the emitters, undefined when nothing was found. */
	groundY?: number;
	// Last values written, to skip writes that change nothing.
	rainRate: number;
	snowRate: number;
	splashRate: number;
}

function makePart(name: string, folder: Instance, size: Vector3): Part {
	const part = new Instance("Part");
	part.Name = name;
	part.Anchored = true;
	part.CanCollide = false;
	part.CanQuery = false;
	part.CanTouch = false;
	part.CastShadow = false;
	part.Transparency = 1;
	part.Size = size;
	part.Parent = folder;
	return part;
}

function constant(value: number) {
	return new NumberSequence(value);
}

function styleRain(emitter: ParticleEmitter, look: WeatherAppearance) {
	emitter.Texture = look.rainTexture;
	emitter.Color = new ColorSequence(look.rainColor);
	emitter.Size = constant(look.rainSize);
	emitter.Squash = constant(look.rainSquash);
	emitter.Transparency = constant(look.rainTransparency);
}

function styleSnow(emitter: ParticleEmitter, look: WeatherAppearance) {
	emitter.Texture = look.snowTexture;
	emitter.Color = new ColorSequence(look.snowColor);
	emitter.Size = new NumberSequence([
		new NumberSequenceKeypoint(0, look.snowSize, look.snowSize * 0.4),
		new NumberSequenceKeypoint(1, look.snowSize, look.snowSize * 0.4),
	]);
}

function styleSplash(emitter: ParticleEmitter, look: WeatherAppearance) {
	emitter.Texture = look.rainTexture;
	emitter.Color = new ColorSequence(look.splashColor);
}

function makeEmitter(part: Part): ParticleEmitter {
	const emitter = new Instance("ParticleEmitter");
	emitter.Enabled = false;
	emitter.Rate = 0;
	emitter.Shape = Enum.ParticleEmitterShape.Box;
	emitter.ShapeInOut = Enum.ParticleEmitterShapeInOut.Outward;
	emitter.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume;
	emitter.Parent = part;
	return emitter;
}

function makeRainPiece(folder: Instance, look: WeatherAppearance, size: Vector3, offset: Vector3): RainPiece {
	const part = makePart("Rain", folder, size);
	const emitter = makeEmitter(part);
	emitter.EmissionDirection = Enum.NormalId.Bottom;
	emitter.Orientation = Enum.ParticleOrientation.VelocityParallel;
	emitter.SpreadAngle = new Vector2(1, 1);
	emitter.LightEmission = 0.15;
	emitter.LightInfluence = 0.8;
	styleRain(emitter, look);
	return { part, emitter, offset, share: (size.X * size.Z) / (CELL_SIZE * CELL_SIZE) };
}

// The camera's own column leaves a square hole around the camera: drops passing within a few studs of the
// lens fill the screen as wide white streaks. It is four strips around the hole.
function makeRainPieces(folder: Instance, look: WeatherAppearance, clearing: boolean): RainPiece[] {
	const half = CELL_SIZE / 2;
	if (!clearing || RAIN_CLEARING <= 0) {
		return [makeRainPiece(folder, look, new Vector3(CELL_SIZE, 0.2, CELL_SIZE), Vector3.zero)];
	}
	const hole = math.min(RAIN_CLEARING, half - 1);
	const band = half - hole;
	const middle = hole + band / 2;
	return [
		makeRainPiece(folder, look, new Vector3(CELL_SIZE, 0.2, band), new Vector3(0, 0, middle)),
		makeRainPiece(folder, look, new Vector3(CELL_SIZE, 0.2, band), new Vector3(0, 0, -middle)),
		makeRainPiece(folder, look, new Vector3(band, 0.2, hole * 2), new Vector3(middle, 0, 0)),
		makeRainPiece(folder, look, new Vector3(band, 0.2, hole * 2), new Vector3(-middle, 0, 0)),
	];
}

function createColumn(folder: Instance, look: WeatherAppearance, dx: number, dz: number): Column {
	const footprint = new Vector3(CELL_SIZE, 0.2, CELL_SIZE);
	const snowPart = makePart("Snow", folder, footprint);
	const snow = makeEmitter(snowPart);
	snow.EmissionDirection = Enum.NormalId.Bottom;
	snow.SpreadAngle = new Vector2(12, 12);
	// Flakes are flat and tumble as they fall: each is squashed into a slightly different shape that widens and
	// narrows over its life while it turns.
	snow.Squash = new NumberSequence([
		new NumberSequenceKeypoint(0, 0.3, 0.25),
		new NumberSequenceKeypoint(0.35, -0.25, 0.25),
		new NumberSequenceKeypoint(0.7, 0.3, 0.25),
		new NumberSequenceKeypoint(1, -0.25, 0.25),
	]);
	snow.Rotation = new NumberRange(0, 360);
	snow.RotSpeed = new NumberRange(-90, 90);
	snow.LightEmission = 0.4;
	snow.LightInfluence = 1;
	// Flakes fade in and out instead of popping into view at the emitter and out at the ground.
	snow.Transparency = new NumberSequence([
		new NumberSequenceKeypoint(0, 1),
		new NumberSequenceKeypoint(0.08, 0.25),
		new NumberSequenceKeypoint(0.9, 0.25),
		new NumberSequenceKeypoint(1, 1),
	]);
	styleSnow(snow, look);

	// Rain and splashes only on the inner columns that use them; the outer ones are snow only.
	const ring = math.max(math.abs(dx), math.abs(dz));
	let groundPart: Part | undefined;
	let splash: ParticleEmitter | undefined;
	if (ring <= SPLASH_RADIUS) {
		groundPart = makePart("Splash", folder, footprint);
		splash = makeEmitter(groundPart);
		splash.EmissionDirection = Enum.NormalId.Top;
		splash.SpreadAngle = new Vector2(45, 45);
		splash.Speed = new NumberRange(3, 7);
		splash.Lifetime = new NumberRange(0.12, 0.25);
		splash.Acceleration = new Vector3(0, -60, 0);
		splash.Size = new NumberSequence(0.12, 0.02);
		splash.Transparency = new NumberSequence(0.4, 1);
		splash.LightInfluence = 0.8;
		styleSplash(splash, look);
	}

	return {
		dx,
		dz,
		rain: ring <= GRID_RADIUS ? makeRainPieces(folder, look, ring === 0) : [],
		snowPart,
		snow,
		groundPart,
		splash,
		covered: false,
		groundY: undefined,
		rainRate: 0,
		snowRate: 0,
		splashRate: 0,
	};
}

function setRate(emitter: ParticleEmitter, rate: number) {
	emitter.Rate = rate;
	emitter.Enabled = rate > 0;
}

// Part orientation whose bottom face points along `velocity`, so particles leave along it.
function facing(position: Vector3, velocity: Vector3): CFrame {
	const up = velocity.Unit.mul(-1);
	const right = up.Cross(Vector3.zAxis).Unit;
	return CFrame.fromMatrix(position, right, up);
}

// The grid is centred on the camera and moves with it, so the camera's column (and its hole) is always
// under the camera. Columns are re-checked round robin as they move; a jump re-checks them all.
//
// Rain uses the inner GRID_RADIUS columns, snow all SNOW_GRID_RADIUS of them: see config.ts.
export class Precipitation {
	private readonly folder: Folder;
	private readonly columns = new Array<Column>();
	private checkCursor = 0;
	private lastFocus?: Vector3;
	private active = false;
	private rayParams?: RaycastParams;

	constructor(look: WeatherAppearance) {
		this.folder = new Instance("Folder");
		this.folder.Name = "Weather";
		this.folder.Parent = Workspace.CurrentCamera ?? Workspace;
		const radius = math.max(GRID_RADIUS, SNOW_GRID_RADIUS);
		for (let dx = -radius; dx <= radius; dx++) {
			for (let dz = -radius; dz <= radius; dz++) {
				this.columns.push(createColumn(this.folder, look, dx, dz));
			}
		}
	}

	setAppearance(look: WeatherAppearance) {
		for (const column of this.columns) {
			for (const piece of column.rain) styleRain(piece.emitter, look);
			styleSnow(column.snow, look);
			if (column.splash) styleSplash(column.splash, look);
		}
	}

	// Moves the grid, re-checks some columns and sets every emitter. Returns how exposed the focus is to the
	// sky, 0-1 (sheltered under a roof is 0).
	update(params: WeatherParams, focus: Vector3, config: WeatherClientConfig): number {
		if (this.folder.Parent !== Workspace.CurrentCamera && Workspace.CurrentCamera) {
			this.folder.Parent = Workspace.CurrentCamera;
		}
		this.rayParams = undefined;
		const raining = params.rain > 0.001;
		const snowing = params.snow > 0.001;
		if (!raining && !snowing) {
			this.stopAll();
			return 1;
		}

		// Round-robin re-checks: the grid moving, roofs built, terrain dug. All at once after a jump.
		const jumped = !this.active || !this.lastFocus || this.lastFocus.sub(focus).Magnitude > CELL_SIZE;
		this.active = true;
		this.lastFocus = focus;

		const checks = jumped ? this.columns.size() : CHECKS_PER_FRAME;
		for (let i = 0; i < checks; i++) {
			this.checkCursor = (this.checkCursor + 1) % this.columns.size();
			this.check(this.columns[this.checkCursor], focus, config);
		}

		const scale = config.particles;
		const windFlat = new Vector3(params.wind.X, 0, params.wind.Z);
		const rainVelocity = new Vector3(params.wind.X, -RAIN_SPEED, params.wind.Z);
		const snowVelocity = new Vector3(params.wind.X, -SNOW_SPEED, params.wind.Z);
		const rainTop = focus.Y + RAIN_HEIGHT;
		const snowTop = focus.Y + SNOW_HEIGHT;
		const fallback = focus.Y - NO_GROUND_DEPTH;

		const parts = new Array<BasePart>();
		const cframes = new Array<CFrame>();
		let exposedWeight = 0;
		let totalWeight = 0;

		for (const column of this.columns) {
			const ring = math.max(math.abs(column.dx), math.abs(column.dz));
			const falloff = math.max(0, 1 - RATE_FALLOFF * math.max(0, ring - 1));
			const centre = new Vector3(focus.X + column.dx * CELL_SIZE, 0, focus.Z + column.dz * CELL_SIZE);
			const rains = ring <= GRID_RADIUS;
			const sheltered = config.shelter && column.covered;
			const ground = config.shelter ? (column.groundY ?? fallback) : fallback;

			if (ring <= 1) {
				const weight = ring === 0 ? 3 : 1;
				totalWeight += weight;
				if (!sheltered && ground < focus.Y + 1) exposedWeight += weight;
			}

			// Rain: emitted upwind so it lands in this column, living just long enough to reach the ground.
			let rainRate = 0;
			const rainFall = rainTop - ground;
			if (raining && rains && !sheltered && rainFall > 0) {
				const life = rainFall / RAIN_SPEED;
				rainRate = params.rain ** RAIN_CURVE * RAIN_RATE * scale * falloff;
				const top = centre.add(new Vector3(0, rainTop, 0)).sub(windFlat.mul(life));
				const lifetime = new NumberRange(life);
				const speed = new NumberRange(rainVelocity.Magnitude);
				for (const piece of column.rain) {
					piece.emitter.Lifetime = lifetime;
					piece.emitter.Speed = speed;
					parts.push(piece.part);
					cframes.push(facing(top.add(piece.offset), rainVelocity));
				}
			}
			if (rainRate !== column.rainRate) {
				column.rainRate = rainRate;
				for (const piece of column.rain) setRate(piece.emitter, rainRate * piece.share);
			}

			let snowRate = 0;
			const snowFall = snowTop - ground;
			if (snowing && !sheltered && snowFall > 0) {
				const life = snowFall / SNOW_SPEED;
				column.snow.Lifetime = new NumberRange(life);
				column.snow.Speed = new NumberRange(snowVelocity.Magnitude * 0.85, snowVelocity.Magnitude * 1.15);
				// Snow keeps its full rate out to the edge: it is slow, and a thin edge is soon outrun.
				snowRate = params.snow * SNOW_RATE * scale;
				parts.push(column.snowPart);
				cframes.push(facing(centre.add(new Vector3(0, snowTop, 0)).sub(windFlat.mul(life)), snowVelocity));
			}
			if (snowRate !== column.snowRate) setRate(column.snow, (column.snowRate = snowRate));

			let splashRate = 0;
			if (rainRate > 0 && column.groundPart && column.groundY !== undefined && config.shelter) {
				splashRate = params.rain * SPLASH_RATE * scale;
				parts.push(column.groundPart);
				cframes.push(new CFrame(centre.add(new Vector3(0, column.groundY + 0.2, 0))));
			}
			if (splashRate !== column.splashRate && column.splash) {
				setRate(column.splash, (column.splashRate = splashRate));
			}
		}

		Workspace.BulkMoveTo(parts, cframes, Enum.BulkMoveMode.FireCFrameChanged);
		return totalWeight > 0 ? exposedWeight / totalWeight : 1;
	}

	private stopAll() {
		if (!this.active) return;
		this.active = false;
		for (const column of this.columns) {
			column.rainRate = 0;
			for (const piece of column.rain) setRate(piece.emitter, 0);
			setRate(column.snow, (column.snowRate = 0));
			if (column.splash) setRate(column.splash, (column.splashRate = 0));
		}
	}

	private params(config: WeatherClientConfig): RaycastParams {
		if (this.rayParams) return this.rayParams;
		const ignore: Instance[] = [this.folder, ...config.ignore];
		for (const player of Players.GetPlayers()) if (player.Character) ignore.push(player.Character);
		const params = new RaycastParams();
		params.FilterType = Enum.RaycastFilterType.Exclude;
		params.FilterDescendantsInstances = ignore;
		params.IgnoreWater = false;
		this.rayParams = params;
		return params;
	}

	// Raycast that passes through see-through parts (which are added to the frame's filter as found).
	private cast(origin: Vector3, direction: Vector3, params: RaycastParams): RaycastResult | undefined {
		for (let i = 0; i < 6; i++) {
			const result = Workspace.Raycast(origin, direction, params);
			if (!result) return undefined;
			const hit = result.Instance;
			if (hit.IsA("BasePart") && !hit.IsA("Terrain") && hit.Transparency >= SEE_THROUGH) {
				params.AddToFilter(hit);
				continue;
			}
			return result;
		}
		return undefined;
	}

	private check(column: Column, focus: Vector3, config: WeatherClientConfig) {
		if (!config.shelter) return;
		const params = this.params(config);
		const top = new Vector3(
			focus.X + column.dx * CELL_SIZE,
			focus.Y + math.max(RAIN_HEIGHT, SNOW_HEIGHT),
			focus.Z + column.dz * CELL_SIZE,
		);
		column.covered = this.cast(top, new Vector3(0, COVER_SEARCH, 0), params) !== undefined;
		column.groundY = this.cast(top, new Vector3(0, -(GROUND_SEARCH + RAIN_HEIGHT), 0), params)?.Position.Y;
	}

	destroy() {
		this.folder.Destroy();
		this.columns.clear();
	}
}
