-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _config = TS.import(script, script.Parent.Parent, "config")
local CLOUD_LAYER_FOG_DENSITY = _config.CLOUD_LAYER_FOG_DENSITY
local CLOUD_LAYER_FOG_HAZE = _config.CLOUD_LAYER_FOG_HAZE
local DARK_BRIGHTNESS = _config.DARK_BRIGHTNESS
local DARK_CONTRAST = _config.DARK_CONTRAST
local DARK_SATURATION = _config.DARK_SATURATION
local FLASH_BRIGHTNESS = _config.FLASH_BRIGHTNESS
local FOG_DENSITY = _config.FOG_DENSITY
local FOG_HAZE = _config.FOG_HAZE
-- Clouds, Atmosphere and a colour grade. Fog is laid over the game's own Atmosphere, so a game's clear-day
-- haze is kept; clouds are set outright. Everything is put back by `stop`, and instances the sky created are
-- removed. The game's Lighting.Brightness is never touched, so a day/night cycle keeps working.
local Sky
do
	Sky = setmetatable({}, {
		__tostring = function()
			return "Sky"
		end,
	})
	Sky.__index = Sky
	function Sky.new(...)
		local self = setmetatable({}, Sky)
		return self:constructor(...) or self
	end
	function Sky:constructor()
		self.created = {}
		local lighting = game:GetService("Lighting")
		local terrain = game:GetService("Workspace").Terrain
		self.atmosphere = lighting:FindFirstChildOfClass("Atmosphere")
		if self.atmosphere then
			local a = self.atmosphere
			self.atmosphereBase = {
				Density = a.Density,
				Haze = a.Haze,
				Glare = a.Glare,
				Color = a.Color,
				Decay = a.Decay,
			}
		else
			self.atmosphere = Instance.new("Atmosphere")
			self.atmosphere.Density = 0
			self.atmosphere.Haze = 0
			self.atmosphere.Glare = 0
			self.atmosphere.Parent = lighting
			local _created = self.created
			local _atmosphere = self.atmosphere
			table.insert(_created, _atmosphere)
			self.atmosphereBase = {
				Density = 0,
				Haze = 0,
				Glare = 0,
				Color = self.atmosphere.Color,
				Decay = self.atmosphere.Decay,
			}
		end
		self.clouds = terrain:FindFirstChildOfClass("Clouds")
		if self.clouds then
			local c = self.clouds
			self.cloudsBase = {
				Enabled = c.Enabled,
				Cover = c.Cover,
				Density = c.Density,
				Color = c.Color,
			}
		else
			self.clouds = Instance.new("Clouds")
			self.clouds.Parent = terrain
			local _created = self.created
			local _clouds = self.clouds
			table.insert(_created, _clouds)
		end
		self.grade = Instance.new("ColorCorrectionEffect")
		self.grade.Name = "WeatherGrade"
		self.grade.Parent = lighting
		local _created = self.created
		local _grade = self.grade
		table.insert(_created, _grade)
	end
	function Sky:update(params, flash, cloudLayer)
		if cloudLayer == nil then
			cloudLayer = 0
		end
		local atmosphere = self.atmosphere
		local base = self.atmosphereBase
		if atmosphere and base then
			local fog = params.fog
			local density = base.Density + (FOG_DENSITY - base.Density) * fog
			local haze = base.Haze + (FOG_HAZE - base.Haze) * fog
			atmosphere.Density = density + (math.min(density, CLOUD_LAYER_FOG_DENSITY) - density) * cloudLayer
			atmosphere.Haze = haze + (math.min(haze, CLOUD_LAYER_FOG_HAZE) - haze) * cloudLayer
			atmosphere.Glare = base.Glare * (1 - math.max(params.darkness, params.clouds * 0.5))
			atmosphere.Color = base.Color:Lerp(params.fogColor, fog)
			atmosphere.Decay = base.Decay:Lerp(params.fogColor:Lerp(Color3.new(), 0.3), fog)
		end
		if self.clouds then
			self.clouds.Enabled = params.clouds > 0.01
			self.clouds.Cover = params.clouds
			self.clouds.Density = params.cloudDensity
			self.clouds.Color = params.cloudColor
		end
		self.grade.Brightness = DARK_BRIGHTNESS * params.darkness + FLASH_BRIGHTNESS * flash
		self.grade.Saturation = DARK_SATURATION * params.darkness
		self.grade.Contrast = DARK_CONTRAST * params.darkness
	end
	function Sky:stop()
		local atmosphere = self.atmosphere
		local base = self.atmosphereBase
		if atmosphere and base and not (table.find(self.created, atmosphere) ~= nil) then
			atmosphere.Density = base.Density
			atmosphere.Haze = base.Haze
			atmosphere.Glare = base.Glare
			atmosphere.Color = base.Color
			atmosphere.Decay = base.Decay
		end
		local clouds = self.clouds
		local cloudsBase = self.cloudsBase
		if clouds and cloudsBase then
			clouds.Enabled = cloudsBase.Enabled
			clouds.Cover = cloudsBase.Cover
			clouds.Density = cloudsBase.Density
			clouds.Color = cloudsBase.Color
		end
		for _, instance in self.created do
			instance:Destroy()
		end
		table.clear(self.created)
	end
end
return {
	Sky = Sky,
}
