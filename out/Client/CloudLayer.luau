-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _config = TS.import(script, script.Parent.Parent, "config")
local CLOUD_LAYERS = _config.CLOUD_LAYERS
local CLOUD_LAYER_CLOUDS_FROM = _config.CLOUD_LAYER_CLOUDS_FROM
local CLOUD_LAYER_DARKNESS_FULL = _config.CLOUD_LAYER_DARKNESS_FULL
local CLOUD_LAYER_DRIFT = _config.CLOUD_LAYER_DRIFT
local CLOUD_LAYER_PART = _config.CLOUD_LAYER_PART
local CLOUD_LAYER_TINT = _config.CLOUD_LAYER_TINT
local Workspace = game:GetService("Workspace")
-- Storm clouds: Roblox's own Clouds become a flat sheet at full cover, so heavy weather adds sheets of a real
-- storm-cloud texture overhead. Each layer is a 3 x 3 grid of the largest parts allowed, following the camera
-- in whole tiles so the clouds stay put in the world, drifting with the wind; the lower layer drifts faster,
-- which gives the sky depth. They fade in as the weather's clouds and darkness build: a faint layer when
-- overcast, solid in rain, the full heavy sky in a storm.
local CloudLayer
do
	CloudLayer = setmetatable({}, {
		__tostring = function()
			return "CloudLayer"
		end,
	})
	CloudLayer.__index = CloudLayer
	function CloudLayer.new(...)
		local self = setmetatable({}, CloudLayer)
		return self:constructor(...) or self
	end
	function CloudLayer:constructor(texture)
		self.layers = {}
		self.folder = Instance.new("Folder")
		self.folder.Name = "WeatherCloudLayer"
		self.folder.Parent = Workspace
		for _, spec in CLOUD_LAYERS do
			local layer = {
				parts = {},
				textures = {},
				height = spec.height,
				tile = spec.tile,
				opacity = spec.opacity,
				drift = spec.drift,
				offset = Vector2.zero,
			}
			for i = 0, 8 do
				local part = Instance.new("Part")
				part.Name = "Clouds"
				part.Size = Vector3.new(CLOUD_LAYER_PART, 1, CLOUD_LAYER_PART)
				-- Not quite 1: a Texture on a fully transparent part is not drawn at all.
				part.Transparency = 0.99
				part.Anchored = true
				part.CanCollide = false
				part.CanQuery = false
				part.CanTouch = false
				part.CastShadow = false
				local surface = Instance.new("Texture")
				surface.Texture = texture
				surface.Face = Enum.NormalId.Bottom
				surface.StudsPerTileU = spec.tile
				surface.StudsPerTileV = spec.tile
				surface.Transparency = 1
				surface.Parent = part
				part.Parent = self.folder
				local _exp = layer.parts
				table.insert(_exp, part)
				local _exp_1 = layer.textures
				table.insert(_exp_1, surface)
			end
			local _exp = self.layers
			table.insert(_exp, layer)
		end
	end
	function CloudLayer:setTexture(texture)
		for _, layer in self.layers do
			for _1, surface in layer.textures do
				surface.Texture = texture
			end
		end
	end
	function CloudLayer:update(params, focus, deltaTime, flash)
		local amount = math.clamp((params.clouds - CLOUD_LAYER_CLOUDS_FROM) / (1 - CLOUD_LAYER_CLOUDS_FROM), 0, 1) * math.clamp(params.darkness / CLOUD_LAYER_DARKNESS_FULL, 0, 1)
		-- Lightning lights the clouds from within.
		-- The texture already holds the cloud's shading, so it is tinted lighter than the cloud colour, or the
		-- detail drowns in black: halfway between the cloud colour and a light grey.
		local base = params.cloudColor:Lerp(CLOUD_LAYER_TINT, 0.6)
		local tint = base:Lerp(Color3.new(1, 1, 1), math.clamp(flash, 0, 1) * 0.8)
		local parts = {}
		local cframes = {}
		for _, layer in self.layers do
			local transparency = 1 - amount * layer.opacity
			-- Whole parts' worth of snapping keeps every tile where it was as the camera moves.
			local centreX = math.floor(focus.X / CLOUD_LAYER_PART + 0.5) * CLOUD_LAYER_PART
			local centreZ = math.floor(focus.Z / CLOUD_LAYER_PART + 0.5) * CLOUD_LAYER_PART
			layer.offset = Vector2.new((layer.offset.X + params.wind.X * CLOUD_LAYER_DRIFT * layer.drift * deltaTime) % layer.tile, (layer.offset.Y + params.wind.Z * CLOUD_LAYER_DRIFT * layer.drift * deltaTime) % layer.tile)
			local i = 0
			for dx = -1, 1 do
				for dz = -1, 1 do
					local part = layer.parts[i + 1]
					local surface = layer.textures[i + 1]
					i += 1
					surface.Transparency = transparency
					surface.Color3 = tint
					surface.OffsetStudsU = -layer.offset.X
					surface.OffsetStudsV = -layer.offset.Y
					table.insert(parts, part)
					local _cFrame = CFrame.new(centreX + dx * CLOUD_LAYER_PART, focus.Y + layer.height, centreZ + dz * CLOUD_LAYER_PART)
					table.insert(cframes, _cFrame)
				end
			end
		end
		if amount > 0.001 then
			Workspace:BulkMoveTo(parts, cframes, Enum.BulkMoveMode.FireCFrameChanged)
		end
		self.folder.Parent = if amount > 0.001 then Workspace else nil
		return amount
	end
	function CloudLayer:destroy()
		self.folder:Destroy()
	end
end
return {
	CloudLayer = CloudLayer,
}
