-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _config = TS.import(script, script.Parent, "config")
local DEFAULT_BLEND = _config.DEFAULT_BLEND
local ROOT_NAME = _config.ROOT_NAME
local ZONES_NAME = _config.ZONES_NAME
local _Params = TS.import(script, script.Parent, "Params")
local PARAM_KEYS = _Params.PARAM_KEYS
local PRESETS = _Params.PRESETS
local copyParams = _Params.copyParams
local lerpParams = _Params.lerpParams
local regionWeight = TS.import(script, script.Parent, "Region").regionWeight
local _Season = TS.import(script, script.Parent, "Season")
local DEFAULT_SEASON = _Season.DEFAULT_SEASON
local readSeason = _Season.readSeason
local sampleSeason = _Season.sampleSeason
-- A weather blending from one look to another, timed on the server clock so every client agrees.
local function clock()
	return game:GetService("Workspace"):GetServerTimeNow()
end
local function sampleTransition(transition, now)
	if transition.duration <= 0 then
		return copyParams(transition.to)
	end
	local t = math.clamp((now - transition.start) / transition.duration, 0, 1)
	return lerpParams(transition.from, transition.to, t * t * (3 - 2 * t))
end
-- Attributes ----------------------------------------------------------------------------------------------
-- A transition is stored as attributes: `to_<field>`, `from_<field>`, `start`, `duration`. Zones add
-- `shape`, `cframe`, `size`, `position`, `radius`, `blend`, `priority`.
local function readParams(instance, prefix)
	local result = copyParams(PRESETS.clear)
	local fields = result
	for _, key in PARAM_KEYS do
		local value = instance:GetAttribute(prefix .. key)
		local _exp = typeof(value)
		local _arg0 = fields[key]
		if _exp == typeof(_arg0) then
			fields[key] = value
		end
	end
	return result
end
local function writeParams(instance, prefix, params)
	local fields = params
	for _, key in PARAM_KEYS do
		instance:SetAttribute(prefix .. key, fields[key])
	end
end
local function writeTransition(instance, transition)
	writeParams(instance, "from_", transition.from)
	writeParams(instance, "to_", transition.to)
	instance:SetAttribute("start", transition.start)
	-- Written last: readers treat an instance without a duration as having no weather.
	instance:SetAttribute("duration", transition.duration)
end
local function readTransition(instance)
	local duration = instance:GetAttribute("duration")
	local start = instance:GetAttribute("start")
	if not (type(duration) == "number") or not (type(start) == "number") then
		return nil
	end
	return {
		from = readParams(instance, "from_"),
		to = readParams(instance, "to_"),
		start = start,
		duration = duration,
	}
end
local function clearTransition(instance)
	instance:SetAttribute("duration", nil)
	instance:SetAttribute("start", nil)
	for _, key in PARAM_KEYS do
		instance:SetAttribute("from_" .. key, nil)
		instance:SetAttribute("to_" .. key, nil)
	end
end
local function writeShape(instance, shape)
	instance:SetAttribute("shape", shape.kind)
	if shape.kind == "box" then
		instance:SetAttribute("cframe", shape.cframe)
		instance:SetAttribute("size", shape.size)
	else
		instance:SetAttribute("position", shape.position)
		instance:SetAttribute("radius", shape.radius)
	end
end
local function readShape(instance)
	local kind = instance:GetAttribute("shape")
	if kind == "box" then
		local cframe = instance:GetAttribute("cframe")
		local size = instance:GetAttribute("size")
		if typeof(cframe) == "CFrame" and typeof(size) == "Vector3" then
			return {
				kind = kind,
				cframe = cframe,
				size = size,
			}
		end
	elseif kind == "sphere" then
		local position = instance:GetAttribute("position")
		local radius = instance:GetAttribute("radius")
		if typeof(position) == "Vector3" and type(radius) == "number" then
			return {
				kind = kind,
				position = position,
				radius = radius,
			}
		end
	end
	return nil
end
-- Roots ---------------------------------------------------------------------------------------------------
-- The server writes into a folder in ReplicatedStorage. A client writes into a folder of its own that is
-- never parented: local weather that overrides the server's for that player only.
local isServer = game:GetService("RunService"):IsServer()
local ownRoot
local function getOwnRoot()
	if ownRoot then
		return ownRoot
	end
	local replicatedStorage = game:GetService("ReplicatedStorage")
	local existing = if isServer then replicatedStorage:FindFirstChild(ROOT_NAME) else nil
	if existing and existing:IsA("Folder") then
		ownRoot = existing
	else
		ownRoot = Instance.new("Folder")
		ownRoot.Name = ROOT_NAME
		if isServer then
			ownRoot.Parent = replicatedStorage
		end
	end
	return ownRoot
end
local function getServerRoot()
	return if isServer then nil else game:GetService("ReplicatedStorage"):FindFirstChild(ROOT_NAME)
end
local function getZonesFolder(root)
	local existing = root:FindFirstChild(ZONES_NAME)
	if existing and existing:IsA("Folder") then
		return existing
	end
	local folder = Instance.new("Folder")
	folder.Name = ZONES_NAME
	folder.Parent = root
	return folder
end
-- Cached reads --------------------------------------------------------------------------------------------
-- Reading some 25 attributes per instance every frame would add up, so each instance is parsed once and
-- again only after one of its attributes changes.
local cache = {}
local function read(instance)
	local _instance = instance
	local entry = cache[_instance]
	if not entry then
		local created
		created = {
			dirty = true,
			data = {
				blend = DEFAULT_BLEND,
				priority = 0,
			},
			connection = instance.AttributeChanged:Connect(function()
				created.dirty = true
				return created.dirty
			end),
		}
		entry = created
		local _instance_1 = instance
		local _entry = entry
		cache[_instance_1] = _entry
	end
	if entry.dirty then
		entry.dirty = false
		local blend = instance:GetAttribute("blend")
		local priority = instance:GetAttribute("priority")
		entry.data = {
			transition = readTransition(instance),
			season = readSeason(instance),
			shape = readShape(instance),
			blend = if type(blend) == "number" then blend else DEFAULT_BLEND,
			priority = if type(priority) == "number" then priority else 0,
		}
	end
	return entry.data
end
-- Drops cached zones that were destroyed. The roots are kept: a client's own root is never parented.
local function sweepCache()
	for instance, entry in cache do
		if instance.Parent == nil and instance ~= ownRoot then
			entry.connection:Disconnect()
			cache[instance] = nil
		end
	end
end
-- Evaluation ----------------------------------------------------------------------------------------------
-- The weather everywhere, ignoring zones: this side's own if it has set one, else the server's, else clear.
local function evaluateGlobal(now)
	local own = read(getOwnRoot()).transition
	if own then
		return sampleTransition(own, now)
	end
	local serverRoot = getServerRoot()
	local server = serverRoot and read(serverRoot).transition
	return if server then sampleTransition(server, now) else copyParams(PRESETS.clear)
end
-- The season: this side's own if it has set one, else the server's, else summer.
local function evaluateSeason(now)
	local own = read(getOwnRoot()).season
	if own then
		return sampleSeason(own, now)
	end
	local serverRoot = getServerRoot()
	local server = serverRoot and read(serverRoot).season
	local _result
	if server then
		_result = sampleSeason(server, now)
	else
		local _object = table.clone(DEFAULT_SEASON)
		setmetatable(_object, nil)
		_result = _object
	end
	return _result
end
-- The weather at a point: the global weather with every zone around the point blended over it, lowest
-- priority first. On a client, both the server's zones and its own count.
local function evaluateAt(position, now)
	local params = evaluateGlobal(now)
	local zones = {}
	for _, root in { getServerRoot(), getOwnRoot() } do
		local _folder = root
		if _folder ~= nil then
			_folder = _folder:FindFirstChild(ZONES_NAME)
		end
		local folder = _folder
		if not folder then
			continue
		end
		for _1, child in folder:GetChildren() do
			local data = read(child)
			if data.transition and data.shape then
				local _object = table.clone(data)
				setmetatable(_object, nil)
				_object.order = #zones
				table.insert(zones, _object)
			end
		end
	end
	table.sort(zones, function(a, b)
		return if a.priority ~= b.priority then a.priority < b.priority else a.order < b.order
	end)
	for _, zone in zones do
		local weight = regionWeight(zone.shape, zone.blend, position)
		if weight > 0 then
			params = lerpParams(params, sampleTransition(zone.transition, now), weight)
		end
	end
	return params
end
return {
	clock = clock,
	sampleTransition = sampleTransition,
	writeTransition = writeTransition,
	readTransition = readTransition,
	clearTransition = clearTransition,
	writeShape = writeShape,
	getOwnRoot = getOwnRoot,
	getZonesFolder = getZonesFolder,
	sweepCache = sweepCache,
	evaluateGlobal = evaluateGlobal,
	evaluateSeason = evaluateSeason,
	evaluateAt = evaluateAt,
}
