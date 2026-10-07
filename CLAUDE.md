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
  Season.ts         the season (separate from the weather, global only) and its transitions
  State.ts          attribute storage, the server/client roots, cached reads, evaluateAt
  config.ts         every tuning constant, with why it has its value
  Client/           drawing: Renderer (per-frame loop), Precipitation, Sky, CloudLayer, Lightning, Sound, ScreenDrops, Leaves, ClientConfig
art/leaves/          the autumn leaf textures (transparent PNG); source/ holds the ComfyUI photos and their prompts
tools/leaf_textures.py  turns art/leaves/source/*.png into art/leaves/*.png (white keyed out, cropped, 256x256)
tools/leaf_meshes.py    writes art/leaves/meshes/*.gltf: the curved leaf cards (cupped, curled, twisted), two-sided
art/clouds/          the storm cloud texture (source/ holds the ComfyUI photo and prompt)
tools/cloud_texture.py  makes art/clouds/storm-clouds.png tileable, with thin patches see-through
```

The leaf textures are uploaded to Roblox as images (by ShaderCloud); their image ids (not the decal ids) are
`DEFAULT_LEAVES` in `src/Client/ClientConfig.ts`. The meshes are uploaded as models; the mesh ids inside them are `DEFAULT_LEAF_MESHES`.
Each leaf is a Part with a SpecialMesh (mesh id + texture id), so no EditableMesh or EditableImage is used.
A leaf part must never be fully opaque: an opaque part draws the texture's transparent background black. A new leaf: generate it on white, run the tool, upload the PNG,
read the image id inside the decal (`game:GetObjects("rbxassetid://<decal id>")[1].Texture` in Studio), add it.

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

The storm cloud layer (`Client/CloudLayer.ts`) is Textures on huge parts overhead. Two things that hid it in testing: a part at Transparency 1 does not draw its Texture (use 0.99), and dense Atmosphere fades anything 100+ studs off into the sky (so the fog is capped under the layer, see `CLOUD_LAYER_FOG_*`). The Studio MCP's screen capture with a camera position does not show these parts; drive the game camera instead.

**Every asset the package loads must be Open Use**, or other people's games cannot load it. After uploading an image, mesh or decal, grant it: `PATCH https://apis.roblox.com/asset-permissions-api/v1/assets/permissions` with `{"subjectType":"All","subjectId":"","action":"Use","requests":[{"assetId":"<id>"}]}` (no `grantToDependencies`: that is only for an experience subject). Images and meshes first; a decal can only be Open Use once its image is. The key needs the asset-permissions write scope. It is permanent. Models cannot be Open Use; the package only loads the meshes inside them. All 23 current assets were granted on 2026-10-07.
