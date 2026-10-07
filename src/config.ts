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
