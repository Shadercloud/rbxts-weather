// State ---------------------------------------------------------------------------------------------------

// The folder the server keeps the weather in, under ReplicatedStorage. Its attributes replicate, so clients
// need no remotes, and a player who joins mid-transition picks it up where it is.
export const ROOT_NAME = "WeatherState";
export const ZONES_NAME = "Zones";

// Seconds a change of weather takes when the call does not say.
export const DEFAULT_TRANSITION = 5;

// Studs beyond a zone's region over which its weather fades out.
export const DEFAULT_BLEND = 40;

// Precipitation -------------------------------------------------------------------------------------------
// Rain and snow fall from a grid of columns centred on the camera and moving with it. Each column raycasts
// down for the ground (or a roof) and gives its particles just enough lifetime to reach it, so rain stops
// on roofs and does not fall inside buildings. A column with anything above its emitter (a cave, a tall
// overhang) emits nothing.

// Studs per column side, and columns from the centre one to the edge: 2 gives a 5 x 5 grid, 80 studs across.
// Roblox caps how many particles it draws at once, across all emitters. A wider grid spends that budget on
// rain too far away to see and leaves the rain around the player thin: measured, 7 x 7 at any rate looked
// like drizzle, while the same budget on the nearest columns looked like a storm.
export const CELL_SIZE = 16;
export const GRID_RADIUS = 2;

// Snow falls ten times slower, so a player walks out of a small patch before new flakes reach them: the
// flakes at eye level were let go a couple of seconds earlier, when the player was further back. Snow gets
// a wider grid, 13 x 13 (208 studs across), at full rate to the edge; 9 x 9 was still outwalked. It fits
// the particle budget because flakes are few: a fraction of rain's rate.
export const SNOW_GRID_RADIUS = 6;

// Studs above the camera the particles start from.
export const RAIN_HEIGHT = 45;
// Snow starts lower than rain so it reaches eye level sooner (2.4 s), before the player has walked far.
export const SNOW_HEIGHT = 22;

// Fall speeds, studs per second.
export const RAIN_SPEED = 90;
// Rain is blown sideways at this many times the wind's speed. Taken literally, a storm wind (23 studs/s)
// against rain this fast tilts it only 14 degrees, which reads as straight down; 2.5 gives about 33.
export const RAIN_WIND = 2.5;
export const SNOW_SPEED = 9;

// Particles per second per column at intensity 1 (an emitter takes at most 400). Snow lives about ten times
// as long as rain, so far fewer are needed for the same look.
export const RAIN_RATE = 350;
export const SNOW_RATE = 22;
export const SPLASH_RATE = 30;

// Rain intensity is raised to this power before it sets the rate, so the levels spread apart: drizzle (0.3)
// gets a fifth of a storm's drops, rain (0.7) almost two thirds.
export const RAIN_CURVE = 1.3;

// Rate lost per column of distance beyond the camera's ring of neighbours.
export const RATE_FALLOFF = 0.5;

// Columns from the camera's that get splashes on the ground.
export const SPLASH_RADIUS = 2;

// Columns re-checked for roofs and ground each frame, round robin: the grid moves with the camera, so a
// column's ground goes stale as it slides. 16 of 169 at 60 fps is every column about 6 times a second. A jump of more
// than a column (a teleport) re-checks them all at once.
export const CHECKS_PER_FRAME = 16;

// Half the side (studs) of the square around the camera where no rain is emitted. Drops passing within a
// few studs of the lens fill the screen as wide white streaks.
export const RAIN_CLEARING = 4;

// How far up a column looks for cover, and how far down for the ground (studs).
export const COVER_SEARCH = 500;
export const GROUND_SEARCH = 300;

// Below the camera by this much when a column finds no ground (the edge of the map).
export const NO_GROUND_DEPTH = 60;

// Parts more transparent than this do not stop rain (invisible zone volumes, triggers).
export const SEE_THROUGH = 0.95;

// Particle rate multiplier on phones and tablets.
export const TOUCH_PARTICLE_SCALE = 0.5;

// Screen drops ------------------------------------------------------------------------------------------
// Water landing on the lens (opt in with `screenDrops`). Drops per second at rain 1, in the open, looking up;
// fewer looking ahead, none looking down or under a roof.
export const SCREEN_DROP_RATE = 9;
export const SCREEN_DROP_MAX = 30;
// Seconds a drop stays.
export const SCREEN_DROP_LIFE_MIN = 1;
export const SCREEN_DROP_LIFE_MAX = 3.5;
export const SCREEN_DROP_FADE_IN = 0.12;
// Drops are glass balls this far in front of the camera (studs), with diameters in this range.
export const SCREEN_DROP_DISTANCE = 0.5;
export const SCREEN_DROP_SIZE_MIN = 0.012;
export const SCREEN_DROP_SIZE_MAX = 0.032;
export const SCREEN_DROP_TRANSPARENCY = 0.35;
// Everything closer to the camera than this (studs) is blurred while drops show: the drops, nothing else.
export const SCREEN_DROP_BLUR_RADIUS = 0.8;
// Share of average-sized drops that run down the screen (big ones more often, small ones less).
export const SCREEN_DROP_SLIDE_CHANCE = 0.3;

// Autumn leaves ------------------------------------------------------------------------------------------
// Leaves fall from high up all around the player and drift down on the air: this many start per second at
// season intensity 1 (half of it on a still day, twice it in a gale), at most this many at once.
// A wind of LEAF_GALE studs/s counts as a gale: leaves then start upwind and low (see Leaves.spawnPoint).
export const LEAF_RATE = 4;
export const LEAF_MAX = 80;
export const LEAF_GALE = 20;
// They start this far from the camera (studs, anywhere around but out of view), this high above the ground,
// and are dropped once they drift further than LEAF_SPAWN_MAX x 1.5.
export const LEAF_SPAWN_MIN = 15;
export const LEAF_SPAWN_MAX = 80;
export const LEAF_HEIGHT_MIN = 20;
export const LEAF_HEIGHT_MAX = 35;
// In front of the camera a start is raised (up to this high) until it is above the top of the frame.
export const LEAF_HEIGHT_CEILING = 90;
// Share of the wind's speed a leaf travels at, and how fast leaves sink (studs/s, each one between these).
export const LEAF_WIND_FOLLOW = 1;
export const LEAF_SINK_MIN = 0.9;
export const LEAF_SINK_MAX = 1.8;
// Eddies in the air the leaves ride, so they swirl a little rather than moving in lockstep: as strong as
// this share of the wind (at least LEAF_EDDY_MIN studs/s, which is all that moves them on a still day), this
// many studs across, changing at this rate. Kept well under the wind, or a storm scatters leaves every way
// instead of driving them sideways.
export const LEAF_EDDY_SHARE = 0.4;
export const LEAF_EDDY_MIN = 3;
export const LEAF_EDDY_SCALE = 30;
export const LEAF_EDDY_SPEED = 0.08;
// Gusts: the wind the leaves feel swings this far either side of its strength (0.35 = 65% to 135%), at this
// rate. One rhythm for all leaves.
export const LEAF_GUST = 0.35;
export const LEAF_GUST_SPEED = 0.4;
// Seconds a leaf lies on the ground before fading, the fade, and the longest one stays in the air.
export const LEAF_REST = 3;
export const LEAF_FADE = 1;
export const LEAF_LIFE = 80;

// Storm cloud layer ---------------------------------------------------------------------------------------
// Sheets of storm-cloud texture overhead (Client/CloudLayer). Each layer: studs above the camera, studs per
// texture tile (must divide CLOUD_LAYER_PART / 2), opacity at full strength, and how fast it drifts relative
// to the other (the lower one faster, for depth).
export const CLOUD_LAYERS: ReadonlyArray<{ height: number; tile: number; opacity: number; drift: number }> = [
	{ height: 130, tile: 1024, opacity: 1, drift: 1 },
	{ height: 95, tile: 512, opacity: 0.55, drift: 1.6 },
];
// Side of each of a layer's 3 x 3 parts (the largest a part may be).
export const CLOUD_LAYER_PART = 2048;
// The layers show once the weather's clouds pass CLOUD_LAYER_CLOUDS_FROM, and are full at clouds 1 with
// darkness CLOUD_LAYER_DARKNESS_FULL: overcast gives a faint layer, rain a solid one, a storm the full sky.
export const CLOUD_LAYER_CLOUDS_FROM = 0.7;
export const CLOUD_LAYER_DARKNESS_FULL = 0.5;
// Studs the texture drifts per stud of wind.
export const CLOUD_LAYER_DRIFT = 0.6;
// Atmosphere density and haze are held at most at these under a full cloud layer: denser fog fades the layer
// into the sky. Measured: at the storm's 0.43 it vanished; at 0.28 with the layers 95-130 studs up it shows.
export const CLOUD_LAYER_FOG_DENSITY = 0.28;
export const CLOUD_LAYER_FOG_HAZE = 0.8;
// The light grey the layer's tint is pulled towards from the weather's cloud colour.
export const CLOUD_LAYER_TINT = Color3.fromRGB(190, 196, 210);

// Sky -----------------------------------------------------------------------------------------------------

// Atmosphere values at fog 1.
export const FOG_DENSITY = 0.62;
export const FOG_HAZE = 3;

// Colour grade at darkness 1.
export const DARK_BRIGHTNESS = -0.12;
export const DARK_SATURATION = -0.35;
export const DARK_CONTRAST = 0.05;

// Colour grade brightness added by a lightning flash at its peak.
export const FLASH_BRIGHTNESS = 0.45;

// Lightning -----------------------------------------------------------------------------------------------
// Time is cut into slots of this many seconds; at lightning 1 a slot has this chance of a strike. The
// strike is chosen from the server clock, so every player sees the same one.
export const LIGHTNING_SLOT = 1.25;
export const LIGHTNING_CHANCE = 0.35;
export const FLASH_SECONDS = 0.35;
export const THUNDER_DELAY_MIN = 0.4;
export const THUNDER_DELAY_MAX = 3;

// Sound ---------------------------------------------------------------------------------------------------

// Wind speed (studs per second) at which the wind loop is at full volume.
export const WIND_FULL_SPEED = 35;

// How much the high frequencies drop (dB) when fully sheltered.
export const SHELTER_MUFFLE = -25;

// How fast sound and shelter follow changes (per second, exponential).
export const SMOOTHING = 3;
