-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local TOUCH_PARTICLE_SCALE = TS.import(script, script.Parent.Parent, "config").TOUCH_PARTICLE_SCALE
-- How this client draws the weather. Set with `Weather.configure`; everything is optional there.
-- Textures that ship with every Roblox client, so the package needs no uploads.
local SQUARE = "rbxasset://textures/particles/SquareParticle.png"
-- A soft, lumpy puff: small, it makes a flake with blurred, see-through edges and an irregular outline.
local SOFT_PUFF = "rbxasset://textures/particles/smoke_main.dds"
-- Default sounds: recordings in Roblox's own audio library (Pro Sound Effects, licensed by Roblox), which every
-- experience may play. Checked to load from an unpublished place.
local DEFAULT_SOUNDS = {
	rain = "rbxassetid://9112793875",
	wind = "rbxassetid://81404060588532",
	thunder = { "rbxassetid://9120016241", "rbxassetid://9120021539", "rbxassetid://9120018172", "rbxassetid://9120018216" },
}
local function defaultParticles()
	local input = game:GetService("UserInputService")
	return if input.TouchEnabled and not input.KeyboardEnabled then TOUCH_PARTICLE_SCALE else 1
end
local function defaultConfig()
	local _object = {
		sky = true,
		wind = true,
		particles = defaultParticles(),
		shelter = true,
		screenDrops = false,
		focus = nil,
		ignore = {},
	}
	local _left = "sounds"
	local _object_1 = table.clone(DEFAULT_SOUNDS)
	setmetatable(_object_1, nil)
	_object_1.volume = 0.5
	_object[_left] = _object_1
	_object.appearance = {
		rainTexture = SQUARE,
		rainColor = Color3.fromRGB(190, 200, 215),
		rainSize = 0.15,
		rainSquash = -3,
		rainTransparency = 0.85,
		snowTexture = SOFT_PUFF,
		snowColor = Color3.fromRGB(255, 255, 255),
		snowSize = 0.22,
		splashColor = Color3.fromRGB(205, 215, 228),
	}
	return _object
end
local function mergeConfig(config, options)
	local _object = table.clone(config)
	setmetatable(_object, nil)
	for _k, _v in options do
		_object[_k] = _v
	end
	local _left = "sounds"
	local _object_1 = table.clone(config.sounds)
	setmetatable(_object_1, nil)
	local _spread = options.sounds
	if _spread then
		for _k, _v in _spread do
			_object_1[_k] = _v
		end
	end
	_object[_left] = _object_1
	local _left_1 = "appearance"
	local _object_2 = table.clone(config.appearance)
	setmetatable(_object_2, nil)
	local _spread_1 = options.appearance
	if _spread_1 then
		for _k, _v in _spread_1 do
			_object_2[_k] = _v
		end
	end
	_object[_left_1] = _object_2
	return _object
end
return {
	defaultConfig = defaultConfig,
	mergeConfig = mergeConfig,
}
