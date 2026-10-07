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
| **K**       | cycles the season: summer, autumn, winter, spring (3-second transition)                  |
| **J**       | toggles screen drops                                                                     |
| **I**       | prints `Weather.sample()` and `Weather.getExposure()`                                    |

The current weather's name is shown large in the top-right corner ("Server" after **X**), the season under it.

**Driving it from the Studio MCP:** setting the Workspace attribute `WeatherPreset` (a preset name) or `WeatherSeason` (a season) in the Client datamodel does what the keys do, labels included. The MCP cannot `require` the package from the command bar, so this attribute is the way in.

**Recording a demo:** `dev-packages/demo/record_av.py <out.mp4> <seconds>` records the Studio viewport at 60 fps (ffmpeg `ddagrab`, the GPU Desktop Duplication capture, at 2,167 1916x793 with Studio maximized on the primary monitor; gdigrab only managed 30 fps, which looked choppy) and the speakers (WASAPI loopback, `pip install pyaudiowpatch`) and muxes them in sync; `demo/focus-place1.ps1` brings the Place1 window to the front first. Run it with the Microsoft Store Python from a folder outside `AppData\Local` (it virtualizes that folder and fails silently there). The `soundcard` library crashes on this machine; don't use it.

Server weather is tested from the Studio MCP in the Server datamodel, e.g.
`require(game.ReplicatedStorage.rbxts_include.node_modules["@rbxts"]["rbxts-weather"]).Weather:storm()`.

```ts
import { Players, TweenService, UserInputService, Workspace } from "@rbxts/services";
import { SEASONS, Season, Weather, WeatherPreset, WeatherZone } from "@rbxts/weather";

// Playground for @rbxts/weather. Number keys set this client's weather (local, over the server's):
// 1 clear, 2 cloudy, 3 overcast, 4 fog, 5 drizzle, 6 rain, 7 storm, 8 snow, 9 blizzard.
// Z drops a 40-stud fog zone at the character (again to remove), X resets to the server's weather,
// K cycles the season (summer, autumn, winter, spring), J toggles drops on the screen, I prints what is drawn at the camera and how exposed it is.
// The current weather's name is shown large in the top-right corner, the season under it. Setting the Workspace
// attribute WeatherPreset (a preset name) or WeatherSeason (a season) on the client does what the keys do: for
// driving demos from the Studio MCP.
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

// The weather's name, top right.
const gui = new Instance("ScreenGui");
gui.Name = "WeatherLabel";
gui.ResetOnSpawn = false;
gui.IgnoreGuiInset = true;
const label = new Instance("TextLabel");
label.AnchorPoint = new Vector2(1, 0);
label.Position = new UDim2(1, -40, 0, 32);
label.Size = new UDim2(0, 600, 0, 90);
label.BackgroundTransparency = 1;
label.Font = Enum.Font.GothamBlack;
label.TextSize = 72;
label.TextXAlignment = Enum.TextXAlignment.Right;
label.TextColor3 = new Color3(1, 1, 1);
label.TextStrokeTransparency = 0.55;
label.TextStrokeColor3 = new Color3(0, 0, 0);
label.Text = "Clear";
label.Parent = gui;
const seasonLabel = label.Clone();
seasonLabel.Position = new UDim2(1, -40, 0, 112);
seasonLabel.Size = new UDim2(0, 600, 0, 44);
seasonLabel.TextSize = 36;
seasonLabel.Text = "Summer";
seasonLabel.Parent = gui;
gui.Parent = Players.LocalPlayer.WaitForChild("PlayerGui");

function showName(text: string) {
	label.Text = text;
	label.TextTransparency = 1;
	label.TextStrokeTransparency = 1;
	TweenService.Create(label, new TweenInfo(0.4), { TextTransparency: 0, TextStrokeTransparency: 0.55 }).Play();
}

function setPreset(preset: WeatherPreset) {
	Weather.set(preset, { transition: 3 });
	showName(capitalise(preset));
	print(`[weather] ${preset}`);
}

function capitalise(text: string) {
	return text.sub(1, 1).upper() + text.sub(2);
}

function setSeason(season: Season) {
	Weather.setSeason(season, { transition: 3 });
	seasonLabel.Text = capitalise(season);
	print(`[weather] season ${season}`);
}

Workspace.GetAttributeChangedSignal("WeatherSeason").Connect(() => {
	const season = Workspace.GetAttribute("WeatherSeason");
	if (typeIs(season, "string") && (SEASONS as ReadonlyArray<string>).includes(season)) setSeason(season as Season);
});

const PRESETS = new Set<string>(["clear", "cloudy", "overcast", "fog", "drizzle", "rain", "storm", "snow", "blizzard"]);
Workspace.GetAttributeChangedSignal("WeatherPreset").Connect(() => {
	const preset = Workspace.GetAttribute("WeatherPreset");
	if (typeIs(preset, "string") && PRESETS.has(preset)) setPreset(preset as WeatherPreset);
});

UserInputService.InputBegan.Connect((input, processed) => {
	if (processed) return;
	const preset = KEYS.get(input.KeyCode);
	if (preset) {
		setPreset(preset);
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
		showName("Server");
		print("[weather] reset to the server's weather");
	} else if (input.KeyCode === Enum.KeyCode.K) {
		const order: Season[] = ["summer", "autumn", "winter", "spring"];
		const following = order[(order.indexOf(Weather.getSeason().season) + 1) % order.size()];
		setSeason(following);
	} else if (input.KeyCode === Enum.KeyCode.J) {
		const screenDrops = !Weather.getConfig().screenDrops;
		Weather.configure({ screenDrops });
		print(`[weather] screen drops: ${screenDrops}`);
	} else if (input.KeyCode === Enum.KeyCode.I) {
		print("[weather] drawn", Weather.sample(), "exposure", Weather.getExposure());
	}
});
```
