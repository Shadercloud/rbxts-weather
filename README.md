# @rbxts/weather

Weather for [roblox-ts](https://roblox-ts.com): rain, snow, fog and storms in one call.

```ts
Weather.rain();
Weather.snow({ intensity: 0.4, transition: 20 });
Weather.zone(marshPart).fog();
```

- **One call per weather.** Nine presets, every field adjustable, smooth transitions between any two.
- **Server-driven, no remotes.** Set the weather on the server and every client follows. A player who joins mid-transition picks it up where it is. Lightning flashes at the same moment for everyone.
- **Local weather.** Zones give a region weather of its own (fog in the marsh, snow on the peak), fading into the surrounding weather at the edge.
- **Shelter.** Rain stops on roofs instead of falling through them, nothing falls in caves, and sounds are muffled indoors.
- **No assets to upload, no dependencies.** Particles use textures that ship with every Roblox client; the default sounds come from Roblox's own audio library.

## Install

```
npm install @rbxts/weather
```

## Quick start

On the server, set the weather:

```ts
import { Weather } from "@rbxts/weather";

Weather.rain({ transition: 10 });
task.wait(120);
Weather.storm();
```

On every client, start drawing it once:

```ts
import { Weather } from "@rbxts/weather";

Weather.start();
```

## Presets

| Call                 | Looks like                                   | `intensity` sets |
| -------------------- | -------------------------------------------- | ---------------- |
| `Weather.clear()`    | A few white clouds, light breeze             | -                |
| `Weather.cloudy()`   | Broken cloud                                 | `clouds`         |
| `Weather.overcast()` | Grey sky, slightly dim                       | `clouds`         |
| `Weather.fog()`      | Thick fog                                    | `fog`            |
| `Weather.drizzle()`  | Light rain, grey sky                         | `rain`           |
| `Weather.rain()`     | Steady rain, dark clouds                     | `rain`           |
| `Weather.storm()`    | Heavy rain, strong wind, lightning           | `rain`           |
| `Weather.snow()`     | Falling snow, white haze                     | `snow`           |
| `Weather.blizzard()` | Driving snow, strong wind, little visibility | `snow`           |

Each takes the same options:

```ts
Weather.rain({
	intensity: 0.4, // the preset's main amount, 0-1
	transition: 15, // seconds to blend in (default 5, 0 = at once)
	wind: new Vector3(20, 0, 0), // and any weather field below
});
```

`Weather.set` takes a preset name, or some fields to change on the current weather:

```ts
Weather.set("storm", { transition: 30 });
Weather.set({ fog: 0.6 }); // everything else stays
```

### Weather fields

| Field          | Range            | Drives                                                  |
| -------------- | ---------------- | ------------------------------------------------------- |
| `rain`         | 0-1              | Rain particles, splashes, rain sound                    |
| `snow`         | 0-1              | Snow particles                                          |
| `clouds`       | 0-1              | `Clouds.Cover`                                          |
| `cloudDensity` | 0-1              | `Clouds.Density`                                        |
| `cloudColor`   | Color3           | `Clouds.Color`                                          |
| `fog`          | 0-1              | `Atmosphere` density, haze and colour                   |
| `fogColor`     | Color3           | The colour fog tints towards                            |
| `darkness`     | 0-1              | A colour grade that darkens and desaturates the scene   |
| `wind`         | Vector3, studs/s | Tilts rain and snow, `Workspace.GlobalWind`, wind sound |
| `lightning`    | 0-1              | How often lightning flashes                             |

`Weather.get()` is the weather right now (partway through a transition), `Weather.getTarget()` where it is heading. `PRESETS` holds the presets' values and `lerpParams` blends two weathers.

## Zones

A zone gives a region its own weather. Inside it, its weather replaces the global one; outside, it fades out over `blend` studs.

```ts
const marsh = Weather.zone(workspace.Marsh, { blend: 30 }).fog();
const peak = Weather.zone({ position: new Vector3(0, 400, 0), radius: 150 }).blizzard();
const valley = Weather.zone({ cframe: valleyCFrame, size: new Vector3(300, 200, 300) }).clear();
```

- A region is a part (its box; followed while it moves), a `{ cframe, size }` box or a `{ position, radius }` sphere. The part does not have to replicate or stream in, and while it is invisible (or `CanQuery` is off) it does not stop rain.
- A zone has no effect until its weather is set. Change it like the global weather: `marsh.rain({ transition: 10 })`.
- Where zones overlap, higher `priority` wins; equal priorities apply in the order they were made.
- `setRegion`, `setBlend`, `setPriority` and `destroy` change it later.

## Server and client

Called on the **server**, everything changes the weather for all players.

Called on a **client**, it changes the weather for that player only, over the server's: a cutscene, an indoor dream, a per-player setting. `Weather.reset()` hands the player back to the server's weather. Client zones work the same way.

Any client-side call starts drawing; otherwise call `Weather.start()`.

### Gameplay

`Weather.sample(position)` is the weather at a point right now, zones included, on either side. Use it for rules that depend on the weather: crops watered by rain, fires that will not light, cold in a blizzard.

```ts
if (Weather.sample(field.Position).rain > 0.3) waterCrops(field);
```

On a client, `Weather.sample()` with no position is what is being drawn at the camera, and `Weather.getExposure()` is how exposed the camera is to the sky: 0 under a roof, 1 in the open.

## How it is drawn (client)

- **Rain and snow** fall from a grid of columns that follows the camera: 5 x 5 (80 studs across) for rain, 13 x 13 (208 studs) for slow-falling snow, so you cannot walk out of it. Each column finds the first thing below it and gives its particles just enough life to reach it: rain lands on roofs and treetops, not inside houses. A column with something above it (a cave, an overhang) stays dry. Parts that are almost invisible are ignored, as are player characters.
- **Splashes** on the ground near the camera while it rains.
- **Sky.** Fog is laid over the game's own `Atmosphere` (or one the package adds), clouds are set on `Terrain.Clouds` (added if missing), and a `ColorCorrectionEffect` darkens the scene. `Lighting.Brightness` and `ClockTime` are left alone, so a day/night cycle keeps working.
- **Wind** sets `Workspace.GlobalWind`, which sways terrain grass and moves clouds.
- **Screen drops** (opt in with `screenDrops: true`): water lands on the lens while the camera is out in the rain, most when looking up or into the wind, none under a roof. The drops are small glass balls just in front of the camera, so they refract the scene behind them, blurred out of focus by a `DepthOfFieldEffect` that only reaches the first stud. Some run down the screen; all fade. The blur is only enabled while drops are showing. Refraction needs a graphics quality that renders glass; on low settings the drops are plain translucent blobs.
- **Lightning** flashes the colour grade; thunder follows a moment later if you gave it a sound.

`Weather.stop()` puts everything back as it was.

### Configuration

```ts
Weather.configure({
	sky: true, // drive Clouds, Atmosphere and the colour grade
	wind: true, // drive Workspace.GlobalWind
	particles: 1, // rate multiplier (default 0.5 on touch devices)
	shelter: true, // stop rain at roofs, keep caves dry
	screenDrops: false, // water drops on the screen in the rain
	focus: () => character.GetPivot().Position, // where weather is drawn around (default: camera)
	ignore: [workspace.Effects], // more instances that do not stop rain
	sounds: {
		rain: "rbxassetid://...",
		wind: "rbxassetid://...",
		thunder: ["rbxassetid://...", "rbxassetid://..."], // one is picked per strike
		volume: 0.5,
	},
	appearance: {
		rainTexture: "rbxassetid://...", // a streak texture; then set rainSquash to 0
		rainColor: Color3.fromRGB(190, 200, 215),
		rainSize: 0.15,
		rainSquash: -3, // negative stretches drops into streaks
		rainTransparency: 0.85,
		snowTexture: "rbxassetid://...",
		snowColor: Color3.fromRGB(255, 255, 255),
		snowSize: 0.22,
		splashColor: Color3.fromRGB(205, 215, 228),
	},
});
```

Turn `sky` off if your game manages its own Atmosphere and Clouds and only wants precipitation, wind and sound from the package. Read the weather with `Weather.sample()` and drive your sky from it.

**Sounds** default to recordings from Roblox's public audio library, free for every experience: a heavy rain loop and four thunder strikes from Pro Sound Effects, and a howling wind from DistroKid's official account. Pass your own ids to replace them (`thunder` takes one id or a list to pick from at random), or `""` to turn one off. Each strike is pitched a little differently.

## Licence

ISC
