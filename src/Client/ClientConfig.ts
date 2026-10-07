import { TOUCH_PARTICLE_SCALE } from "../config";

export interface WeatherAppearance {
	rainTexture: string;
	rainColor: Color3;
	/** Particle size in studs, before squash. */
	rainSize: number;
	/**
	 * `ParticleEmitter.Squash`, -3 to 3. Rain particles face along their velocity, and there a negative squash
	 * stretches the drop along its fall into a streak (positive lays it sideways).
	 */
	rainSquash: number;
	rainTransparency: number;
	snowTexture: string;
	snowColor: Color3;
	snowSize: number;
	splashColor: Color3;
	/** The storm cloud layer's texture: tileable, seen from below. */
	cloudTexture: string;
	/** Autumn leaves: each leaf shows one of these pictures, picked at random. */
	leaves: LeafImage[];
	/** Size of a leaf in studs, before each picture's own `size`. */
	leafSize: number;
	/** Mesh ids of curved leaf cards (one stud across, UV covering the face); each leaf takes one at random. */
	leafMeshes: string[];
}

/** A leaf picture: an image with a transparent background, the leaf filling it. */
export interface LeafImage {
	/** Image id ("rbxassetid://..."). */
	texture: string;
	/** Size relative to the others: a maple leaf is larger than a birch leaf. Default 1. */
	size?: number;
	/** Multiplies the picture's colours, for more shades from one picture. Default white (unchanged). */
	tint?: Color3;
}

export interface WeatherSounds {
	/** Sound ids ("rbxassetid://..."), replacing the package's own. "" turns one off. */
	rain?: string;
	wind?: string;
	/** One id or several; each strike plays one of them at random. */
	thunder?: string | string[];
	/** Master volume, default 0.5. */
	volume: number;
}

// How this client draws the weather. Set with `Weather.configure`; everything is optional there.
export interface WeatherClientConfig {
	/** Drive `Clouds`, `Atmosphere` and a colour grade. Off for games that manage their own sky. Default on. */
	sky: boolean;
	/** Drive `Workspace.GlobalWind` (sways grass, moves clouds). Default on. */
	wind: boolean;
	/** Particle rate multiplier. Default 1, or 0.5 on touch devices. */
	particles: number;
	/** Rain and snow stop at roofs and stay out of caves. Default on. */
	shelter: boolean;
	/** Water drops on the screen while the camera is out in the rain. Default off. */
	screenDrops: boolean;
	/** Heavy storm clouds overhead in dark, cloudy weather (needs `sky`). Default on. */
	stormClouds: boolean;
	/** Where the weather is sampled and drawn around. Default: the camera. */
	focus?: () => Vector3;
	/** Instances that do not stop rain (besides player characters and invisible parts). */
	ignore: Instance[];
	sounds: WeatherSounds;
	appearance: WeatherAppearance;
}

export type WeatherClientOptions = Partial<Omit<WeatherClientConfig, "sounds" | "appearance">> & {
	sounds?: Partial<WeatherSounds>;
	appearance?: Partial<WeatherAppearance>;
};

// Textures that ship with every Roblox client, so the package needs no uploads.
const SQUARE = "rbxasset://textures/particles/SquareParticle.png";
// A soft, lumpy puff: small, it makes a flake with blurred, see-through edges and an irregular outline.
const SOFT_PUFF = "rbxasset://textures/particles/smoke_main.dds";

// Default sounds: recordings in Roblox's own audio library (Pro Sound Effects, licensed by Roblox), which every
// experience may play. Checked to load from an unpublished place.
const DEFAULT_SOUNDS = {
	// "Heavy Rain 3": heavy rain on concrete, 67 s loop
	rain: "rbxassetid://9112793875",
	// "Howling Wind" (DistroKid official account, also in the public library), 147 s
	wind: "rbxassetid://81404060588532",
	thunder: [
		"rbxassetid://9120016241", // "Thunder Cracks Big Rumbling Blasts Booming 4", 11.8 s
		"rbxassetid://9120021539", // "Thunder Sharp Booming Strikes Rumbling 3", 15.4 s
		"rbxassetid://9120018172", // "Thunder Distant Boom Thud Rapid Hits 20", 4.5 s
		"rbxassetid://9120018216", // "Thunder Distant Boom Thud Rapid Hits 21", 5.9 s
	],
};

// The package's leaf pictures (art/leaves, made from ComfyUI photos by tools/leaf_textures.py), uploaded as
// images by ShaderCloud. Sizes are relative: maple largest, birch smallest.
const DEFAULT_LEAVES: LeafImage[] = [
	{ texture: "rbxassetid://109288538134452", size: 1.15 }, // maple, red
	{ texture: "rbxassetid://80805595237760", size: 1.15 }, // maple, orange
	{ texture: "rbxassetid://117335474473728", size: 1.15 }, // maple, green turning
	{ texture: "rbxassetid://73078920043599", size: 1 }, // oak, brown
	{ texture: "rbxassetid://80376924963207", size: 1 }, // oak, green turning
	{ texture: "rbxassetid://76191320469395", size: 0.9 }, // beech, copper
	{ texture: "rbxassetid://92750542325621", size: 0.9 }, // linden, lime green
	{ texture: "rbxassetid://128795998453848", size: 0.8 }, // ginkgo, yellow
	{ texture: "rbxassetid://90979127004666", size: 0.7 }, // birch, yellow
];

// Curved cards the pictures are drawn on (art/leaves/meshes, made by tools/leaf_meshes.py), uploaded as models
// by ShaderCloud; these are the mesh ids inside them.
const DEFAULT_LEAF_MESHES = [
	"rbxassetid://124967419192590", // cupped: folded down either side of the midrib
	"rbxassetid://97859570440573", // curled: rolled along its length, tip up
	"rbxassetid://138236474548144", // twisted about its midrib
];

function defaultParticles(): number {
	const input = game.GetService("UserInputService");
	return input.TouchEnabled && !input.KeyboardEnabled ? TOUCH_PARTICLE_SCALE : 1;
}

export function defaultConfig(): WeatherClientConfig {
	return {
		sky: true,
		wind: true,
		particles: defaultParticles(),
		shelter: true,
		screenDrops: false,
		stormClouds: true,
		focus: undefined,
		ignore: [],
		sounds: { ...DEFAULT_SOUNDS, volume: 0.5 },
		appearance: {
			rainTexture: SQUARE,
			rainColor: Color3.fromRGB(190, 200, 215),
			rainSize: 0.15,
			rainSquash: -3,
			rainTransparency: 0.85,
			snowTexture: SOFT_PUFF,
			snowColor: Color3.fromRGB(255, 255, 255),
			snowSize: 0.22,
			splashColor: Color3.fromRGB(205, 215, 228),
			// art/clouds/storm-clouds.png (tools/cloud_texture.py), uploaded as an image by ShaderCloud.
			cloudTexture: "rbxassetid://131975568554853",
			leaves: DEFAULT_LEAVES,
			leafSize: 1,
			leafMeshes: DEFAULT_LEAF_MESHES,
		},
	};
}

export function mergeConfig(config: WeatherClientConfig, options: WeatherClientOptions): WeatherClientConfig {
	return {
		...config,
		...options,
		sounds: { ...config.sounds, ...options.sounds },
		appearance: { ...config.appearance, ...options.appearance },
	};
}
