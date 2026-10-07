import {
	CLOUD_LAYERS,
	CLOUD_LAYER_CLOUDS_FROM,
	CLOUD_LAYER_DARKNESS_FULL,
	CLOUD_LAYER_DRIFT,
	CLOUD_LAYER_PART,
	CLOUD_LAYER_TINT,
} from "../config";
import { WeatherParams } from "../Params";

const Workspace = game.GetService("Workspace");

interface Layer {
	parts: Part[];
	textures: Texture[];
	height: number;
	tile: number;
	opacity: number;
	drift: number;
	offset: Vector2;
}

// Storm clouds: Roblox's own Clouds become a flat sheet at full cover, so heavy weather adds sheets of a real
// storm-cloud texture overhead. Each layer is a 3 x 3 grid of the largest parts allowed, following the camera
// in whole tiles so the clouds stay put in the world, drifting with the wind; the lower layer drifts faster,
// which gives the sky depth. They fade in as the weather's clouds and darkness build: a faint layer when
// overcast, solid in rain, the full heavy sky in a storm.
export class CloudLayer {
	private readonly folder: Folder;
	private readonly layers = new Array<Layer>();

	constructor(texture: string) {
		this.folder = new Instance("Folder");
		this.folder.Name = "WeatherCloudLayer";
		this.folder.Parent = Workspace;
		for (const spec of CLOUD_LAYERS) {
			const layer: Layer = {
				parts: [],
				textures: [],
				height: spec.height,
				tile: spec.tile,
				opacity: spec.opacity,
				drift: spec.drift,
				offset: Vector2.zero,
			};
			for (let i = 0; i < 9; i++) {
				const part = new Instance("Part");
				part.Name = "Clouds";
				part.Size = new Vector3(CLOUD_LAYER_PART, 1, CLOUD_LAYER_PART);
				// Not quite 1: a Texture on a fully transparent part is not drawn at all.
				part.Transparency = 0.99;
				part.Anchored = true;
				part.CanCollide = false;
				part.CanQuery = false;
				part.CanTouch = false;
				part.CastShadow = false;
				const surface = new Instance("Texture");
				surface.Texture = texture;
				surface.Face = Enum.NormalId.Bottom;
				surface.StudsPerTileU = spec.tile;
				surface.StudsPerTileV = spec.tile;
				surface.Transparency = 1;
				surface.Parent = part;
				part.Parent = this.folder;
				layer.parts.push(part);
				layer.textures.push(surface);
			}
			this.layers.push(layer);
		}
	}

	setTexture(texture: string) {
		for (const layer of this.layers) for (const surface of layer.textures) surface.Texture = texture;
	}

	// Returns how strongly the layer shows, 0-1.
	update(params: WeatherParams, focus: Vector3, deltaTime: number, flash: number): number {
		const amount =
			math.clamp((params.clouds - CLOUD_LAYER_CLOUDS_FROM) / (1 - CLOUD_LAYER_CLOUDS_FROM), 0, 1) *
			math.clamp(params.darkness / CLOUD_LAYER_DARKNESS_FULL, 0, 1);
		// Lightning lights the clouds from within.
		// The texture already holds the cloud's shading, so it is tinted lighter than the cloud colour, or the
		// detail drowns in black: halfway between the cloud colour and a light grey.
		const base = params.cloudColor.Lerp(CLOUD_LAYER_TINT, 0.6);
		const tint = base.Lerp(new Color3(1, 1, 1), math.clamp(flash, 0, 1) * 0.8);
		const parts = new Array<BasePart>();
		const cframes = new Array<CFrame>();
		for (const layer of this.layers) {
			const transparency = 1 - amount * layer.opacity;
			// Whole parts' worth of snapping keeps every tile where it was as the camera moves.
			const centreX = math.floor(focus.X / CLOUD_LAYER_PART + 0.5) * CLOUD_LAYER_PART;
			const centreZ = math.floor(focus.Z / CLOUD_LAYER_PART + 0.5) * CLOUD_LAYER_PART;
			layer.offset = new Vector2(
				(layer.offset.X + params.wind.X * CLOUD_LAYER_DRIFT * layer.drift * deltaTime) % layer.tile,
				(layer.offset.Y + params.wind.Z * CLOUD_LAYER_DRIFT * layer.drift * deltaTime) % layer.tile,
			);
			let i = 0;
			for (let dx = -1; dx <= 1; dx++) {
				for (let dz = -1; dz <= 1; dz++) {
					const part = layer.parts[i];
					const surface = layer.textures[i];
					i++;
					surface.Transparency = transparency;
					surface.Color3 = tint;
					surface.OffsetStudsU = -layer.offset.X;
					surface.OffsetStudsV = -layer.offset.Y;
					parts.push(part);
					cframes.push(
						new CFrame(
							centreX + dx * CLOUD_LAYER_PART,
							focus.Y + layer.height,
							centreZ + dz * CLOUD_LAYER_PART,
						),
					);
				}
			}
		}
		if (amount > 0.001) Workspace.BulkMoveTo(parts, cframes, Enum.BulkMoveMode.FireCFrameChanged);
		this.folder.Parent = amount > 0.001 ? Workspace : undefined;
		return amount;
	}

	destroy() {
		this.folder.Destroy();
	}
}
