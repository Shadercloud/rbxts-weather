# rbxts-weather

A roblox-ts package (`@rbxts/weather`): weather in one call (`Weather.rain()`), set on the server and drawn by every client, with zones for local weather and shelter under roofs.

## What it must stay

- **Totally independent**: no imports from, or assumptions about, any particular game. Anything game-specific (sounds, textures, what the focus is, what stops rain) comes in through the public API.
- **Looks only**: the package draws weather and reports it (`Weather.sample`). What weather _does_ in a game (wet crops, cold) stays in the game.
- **No runtime dependencies**, no assets that need uploading. Services come from `game.GetService`.

## Repository layout

This directory is **its own git repo** (branch `main`), nested during development inside the separate `dev-packages` repo, like its siblings `rbxts-react-clean-ui` and `rbxts-highlight-voxel`:

```
src/
  index.ts          public entry point: everything exported here is public API
  Weather.ts        the `Weather` singleton (WeatherApi)
  WeatherZone.ts    zones
  Control.ts        set() and the preset shorthands, shared by Weather and zones
  Params.ts         WeatherParams, presets, lerp, resolving a set() call
  Region.ts         zone shapes and their blend weight
  State.ts          attribute storage, the server/client roots, cached reads, evaluateAt
  config.ts         every tuning constant, with why it has its value
  Client/           drawing: Renderer (per-frame loop), Precipitation, Sky, Lightning, Sound, ScreenDrops, ClientConfig
```

The default sound ids live in `DEFAULT_SOUNDS` in `src/Client/ClientConfig.ts`: recordings from Roblox's public library (Pro Sound Effects; the wind from DistroKid's official account), which any experience may play. Don't use sounds from sites whose licence forbids redistributing the files (ZapSplat, for one): a default id is a public file anyone can take.

Commit package changes here, not in `dev-packages`. The playground script belongs to `dev-packages`.

Machine-specific paths and notes live in `CLAUDE.local.md` (gitignored).

## How it works

- **State is attributes.** The server keeps the weather on `ReplicatedStorage.WeatherState` as attributes (`from_*`, `to_*`, `start`, `duration`); zones are child folders under `Zones` with their shape added. Attributes replicate on their own, so there are no remotes. A client's own calls write to an unparented folder of the same layout, which overrides the server's global weather while it has one.
- **Transitions use the server clock** (`Workspace.GetServerTimeNow`), so late joiners and every client agree. Lightning strikes are seeded from that clock too.
- **Zones** are blended over the global weather at the focus, lowest priority first, weight 1 inside and smoothstep to 0 over `blend` studs.
- **Precipitation** is a world-aligned grid of columns around the focus; each raycasts for cover above and ground below, and its particle lifetime is set so they stop at the ground. Details in `config.ts`.

## Development workflow

1. `npm run watch` **inside this package**, compiling `src/` to `out/`.
2. `dev-packages` syncs it into Studio with Rojo (`default.project.json` maps `Packages/rbxts-weather/out` into `ReplicatedStorage.rbxts_include.node_modules.@rbxts`, and its `tsconfig.json` `paths` points `@rbxts/weather` at that `out`).
3. The playground script `dev-packages/src/client/weather.client.ts` drives it in Studio; see `.claude/docs/playground.md`, and keep that file in step with the script.

The package is never run on its own.

## Commands

| Command                           | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `npm run watch`                   | Compile on change (the normal dev loop)        |
| `npm run build`                   | One-off compile; also runs on `prepublishOnly` |
| `npm run typecheck`               | `tsc --noEmit`                                 |
| `npm run lint`                    | ESLint over `src/`                             |
| `npm run format` / `format:check` | Prettier                                       |

## Conventions

- Tabs, width 4, print width 120, trailing commas (`.prettierrc`, `.editorconfig`).
- `declaration: true`: keep the exports in `src/index.ts` small and deliberate.
- Tuning numbers go in `config.ts` with a comment saying what they do; nothing magic inline.
- The README is the user documentation; update it in the same change as any public API or behaviour change.
- Published as `@rbxts/weather` by ShaderCloud (GitHub org `Shadercloud`), ISC licence.
