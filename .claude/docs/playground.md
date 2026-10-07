# Playground (lives in `dev-packages`, not in this repo)

The package is play tested from the parent `dev-packages` repo. That repo is separate, so everything needed to recreate the playground is recorded here. Keep this file in step with the script whenever it changes.

## Wiring in `dev-packages`

1. `default.project.json`, under `ReplicatedStorage.rbxts_include.node_modules.@rbxts`:

    ```json
    "rbxts-weather": {
    	"$path": "Packages/rbxts-weather/out"
    }
    ```

2. `tsconfig.json`, under `compilerOptions.paths`:

    ```json
    "@rbxts/weather": [
    	"../Packages/rbxts-weather/out"
    ]
    ```

3. `@rbxts/services` must be a dependency of `dev-packages` (it is).

Run `npm run watch` in this package **and** in `dev-packages`, with `rojo serve` running in `dev-packages` (port 34880, set by `servePort` in `default.project.json`; Hearthstead uses 34871 and 34872), connected to `Place1`.

## The script: `dev-packages/src/client/weather.client.ts`

Turns on screen drops and calls `Weather.start()`, then keys set this client's own weather (over the server's, which is clear unless set from the server):

| Key         | Does                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------- |
| **1**-**9** | clear, cloudy, overcast, fog, drizzle, rain, storm, snow, blizzard (3-second transition) |
| **Z**       | a 40-stud fog zone (blend 30) at the camera focus; again removes it                      |
| **X**       | `Weather.reset()`: back to the server's weather                                          |
| **J**       | toggles screen drops                                                                     |
| **I**       | prints `Weather.sample()` and `Weather.getExposure()`                                    |

Server weather is tested from the Studio MCP in the Server datamodel, e.g.
`require(game.ReplicatedStorage.rbxts_include.node_modules["@rbxts"]["rbxts-weather"]).Weather:storm()`.

```ts
import { UserInputService, Workspace } from "@rbxts/services";
import { Weather, WeatherPreset, WeatherZone } from "@rbxts/weather";

Weather.configure({ screenDrops: true });
Weather.start();

const KEYS = new Map<Enum.KeyCode, WeatherPreset>([
	[Enum.KeyCode.One, "clear"],
	[Enum.KeyCode.Two, "cloudy"],
	[Enum.KeyCode.Three, "overcast"],
	[Enum.KeyCode.Four, "fog"],
	[Enum.KeyCode.Five, "drizzle"],
	[Enum.KeyCode.Six, "rain"],
	[Enum.KeyCode.Seven, "storm"],
	[Enum.KeyCode.Eight, "snow"],
	[Enum.KeyCode.Nine, "blizzard"],
]);

let zone: WeatherZone | undefined;

UserInputService.InputBegan.Connect((input, processed) => {
	if (processed) return;
	const preset = KEYS.get(input.KeyCode);
	if (preset) {
		Weather.set(preset, { transition: 3 });
		print(`[weather] ${preset}`);
	} else if (input.KeyCode === Enum.KeyCode.Z) {
		if (zone) {
			zone.destroy();
			zone = undefined;
			print("[weather] zone removed");
			return;
		}
		const camera = Workspace.CurrentCamera;
		if (!camera) return;
		zone = Weather.zone({ position: camera.Focus.Position, radius: 40 }, { blend: 30 }).fog({ transition: 0 });
		print("[weather] fog zone at", camera.Focus.Position);
	} else if (input.KeyCode === Enum.KeyCode.X) {
		Weather.reset();
		print("[weather] reset to the server's weather");
	} else if (input.KeyCode === Enum.KeyCode.J) {
		const screenDrops = !Weather.getConfig().screenDrops;
		Weather.configure({ screenDrops });
		print(`[weather] screen drops: ${screenDrops}`);
	} else if (input.KeyCode === Enum.KeyCode.I) {
		print("[weather] drawn", Weather.sample(), "exposure", Weather.getExposure());
	}
});
```
