-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local DEFAULT_BLEND = TS.import(script, script.Parent, "config").DEFAULT_BLEND
local WeatherControl = TS.import(script, script.Parent, "Control").WeatherControl
local shapeOf = TS.import(script, script.Parent, "Region").shapeOf
local _State = TS.import(script, script.Parent, "State")
local getOwnRoot = _State.getOwnRoot
local getZonesFolder = _State.getZonesFolder
local writeShape = _State.writeShape
--[[
	*
	 * Weather of its own inside a region, blending into the surrounding weather at its edge. A zone has no
	 * effect until its weather is set: `Weather.zone(marsh).fog()`.
	 
]]
local WeatherZone
do
	local super = WeatherControl
	WeatherZone = setmetatable({}, {
		__tostring = function()
			return "WeatherZone"
		end,
		__index = super,
	})
	WeatherZone.__index = WeatherZone
	function WeatherZone.new(...)
		local self = setmetatable({}, WeatherZone)
		return self:constructor(...) or self
	end
	function WeatherZone:constructor(region, options, onChanged)
		if options == nil then
			options = {}
		end
		super.constructor(self)
		self.regionConnections = {}
		self.destroyed = false
		self.onChanged = onChanged
		self.folder = Instance.new("Folder")
		local _condition = options.name
		if _condition == nil then
			_condition = "Zone"
		end
		self.folder.Name = _condition
		local _folder = self.folder
		local _condition_1 = options.blend
		if _condition_1 == nil then
			_condition_1 = DEFAULT_BLEND
		end
		_folder:SetAttribute("blend", math.max(0, _condition_1))
		local _folder_1 = self.folder
		local _condition_2 = options.priority
		if _condition_2 == nil then
			_condition_2 = 0
		end
		_folder_1:SetAttribute("priority", _condition_2)
		self:setRegion(region)
		self.folder.Parent = getZonesFolder(getOwnRoot())
	end
	function WeatherZone:holder()
		return self.folder
	end
	function WeatherZone:changed()
		local _result = self.onChanged
		if _result ~= nil then
			_result()
		end
	end
	function WeatherZone:setRegion(region)
		if self.destroyed then
			return self
		end
		for _, connection in self.regionConnections do
			connection:Disconnect()
		end
		self.regionConnections = {}
		writeShape(self.folder, shapeOf(region))
		local _region = region
		if typeof(_region) == "Instance" then
			local update = function()
				return writeShape(self.folder, shapeOf(region))
			end
			local _regionConnections = self.regionConnections
			local _arg0 = region:GetPropertyChangedSignal("CFrame"):Connect(update)
			table.insert(_regionConnections, _arg0)
			local _regionConnections_1 = self.regionConnections
			local _arg0_1 = region:GetPropertyChangedSignal("Size"):Connect(update)
			table.insert(_regionConnections_1, _arg0_1)
		end
		return self
	end
	function WeatherZone:setBlend(blend)
		if not self.destroyed then
			self.folder:SetAttribute("blend", math.max(0, blend))
		end
		return self
	end
	function WeatherZone:setPriority(priority)
		if not self.destroyed then
			self.folder:SetAttribute("priority", priority)
		end
		return self
	end
	function WeatherZone:destroy()
		if self.destroyed then
			return nil
		end
		self.destroyed = true
		for _, connection in self.regionConnections do
			connection:Disconnect()
		end
		self.regionConnections = {}
		self.folder:Destroy()
	end
end
return {
	WeatherZone = WeatherZone,
}
