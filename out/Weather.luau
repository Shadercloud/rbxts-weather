-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _Renderer = TS.import(script, script.Parent, "Client", "Renderer")
local configureRenderer = _Renderer.configureRenderer
local getConfig = _Renderer.getConfig
local getExposure = _Renderer.getExposure
local getRendered = _Renderer.getRendered
local isRendering = _Renderer.isRendering
local startRenderer = _Renderer.startRenderer
local stopRenderer = _Renderer.stopRenderer
local DEFAULT_TRANSITION = TS.import(script, script.Parent, "config").DEFAULT_TRANSITION
local WeatherControl = TS.import(script, script.Parent, "Control").WeatherControl
local PARAM_KEYS = TS.import(script, script.Parent, "Params").PARAM_KEYS
local _Season = TS.import(script, script.Parent, "Season")
local clearSeason = _Season.clearSeason
local readSeason = _Season.readSeason
local sampleSeason = _Season.sampleSeason
local writeSeason = _Season.writeSeason
local _State = TS.import(script, script.Parent, "State")
local clearTransition = _State.clearTransition
local clock = _State.clock
local evaluateAt = _State.evaluateAt
local evaluateGlobal = _State.evaluateGlobal
local evaluateSeason = _State.evaluateSeason
local getOwnRoot = _State.getOwnRoot
local WeatherZone = TS.import(script, script.Parent, "WeatherZone").WeatherZone
local isServer = game:GetService("RunService"):IsServer()
--[[
	*
	 * The weather. Called on the server it changes the weather for everyone; called on a client it changes it
	 * for that player only, over whatever the server set, until `reset()`.
	 *
	 * ```ts
	 * Weather.rain({ intensity: 0.8, transition: 10 });
	 * Weather.zone(marshPart, { blend: 30 }).fog();
	 * Weather.setSeason("autumn", { intensity: 0.7 });
	 * ```
	 *
	 * Clients draw the weather once `Weather.start()` has been called on them (any client-side call starts it too).
	 
]]
local WeatherApi
do
	local super = WeatherControl
	WeatherApi = setmetatable({}, {
		__tostring = function()
			return "WeatherApi"
		end,
		__index = super,
	})
	WeatherApi.__index = WeatherApi
	function WeatherApi.new(...)
		local self = setmetatable({}, WeatherApi)
		return self:constructor(...) or self
	end
	function WeatherApi:constructor(...)
		super.constructor(self, ...)
	end
	function WeatherApi:holder()
		return getOwnRoot()
	end
	function WeatherApi:changed()
		if not isServer then
			startRenderer()
		end
	end
	function WeatherApi:set(weather, options)
		local _weather = weather
		local fields = if type(_weather) == "string" then nil else weather
		local _result = options
		if _result ~= nil then
			_result = _result.season
		end
		local _condition = _result
		if _condition == nil then
			local _result_1 = fields
			if _result_1 ~= nil then
				_result_1 = _result_1.season
			end
			_condition = _result_1
		end
		local season = _condition
		local _result_1 = options
		if _result_1 ~= nil then
			_result_1 = _result_1.seasonIntensity
		end
		local _condition_1 = _result_1
		if _condition_1 == nil then
			local _result_2 = fields
			if _result_2 ~= nil then
				_result_2 = _result_2.seasonIntensity
			end
			_condition_1 = _result_2
		end
		local intensity = _condition_1
		if season ~= nil or intensity ~= nil then
			local _result_2 = readSeason(getOwnRoot())
			if _result_2 ~= nil then
				_result_2 = _result_2.to
			end
			local _condition_2 = _result_2
			if _condition_2 == nil then
				_condition_2 = evaluateSeason(clock())
			end
			local target = _condition_2
			local _self = self
			local _exp = season or target.season
			local _object = {}
			local _left = "intensity"
			local _condition_3 = intensity
			if _condition_3 == nil then
				_condition_3 = (if season ~= nil then 1 else target.intensity)
			end
			_object[_left] = _condition_3
			local _left_1 = "transition"
			local _result_3 = options
			if _result_3 ~= nil then
				_result_3 = _result_3.transition
			end
			_object[_left_1] = _result_3
			_self:setSeason(_exp, _object)
		end
		local _weather_1 = weather
		if type(_weather_1) == "string" then
			return super.set(self, weather, options)
		end
		-- Only the weather fields go on to the weather; a call that only set the season stops here.
		local rest = {}
		local any = false
		for _, key in PARAM_KEYS do
			local value = weather[key]
			if value ~= nil then
				rest[key] = value
				any = true
			end
		end
		return if any then super.set(self, rest, options) else self
	end
	function WeatherApi:setSeason(season, options)
		local holder = getOwnRoot()
		local now = clock()
		local existing = readSeason(holder)
		-- A client's first season starts from the server's, so it changes smoothly from what is showing.
		local current = if existing then sampleSeason(existing, now) else evaluateSeason(now)
		local _object = {
			season = season,
		}
		local _left = "intensity"
		local _result = options
		if _result ~= nil then
			_result = _result.intensity
		end
		local _condition = _result
		if _condition == nil then
			_condition = 1
		end
		_object[_left] = math.clamp(_condition, 0, 1)
		local to = _object
		local _result_1 = options
		if _result_1 ~= nil then
			_result_1 = _result_1.transition
		end
		local _condition_1 = _result_1
		if _condition_1 == nil then
			_condition_1 = DEFAULT_TRANSITION
		end
		local duration = math.max(0, _condition_1)
		writeSeason(holder, {
			from = current,
			to = to,
			start = now,
			duration = duration,
		})
		self:changed()
		return self
	end
	function WeatherApi:getSeason()
		return evaluateSeason(clock())
	end
	function WeatherApi:zone(region, options)
		return WeatherZone.new(region, options, function()
			return self:changed()
		end)
	end
	function WeatherApi:reset()
		clearTransition(getOwnRoot())
		clearSeason(getOwnRoot())
	end
	function WeatherApi:sample(position)
		local now = clock()
		local weather = if position then evaluateAt(position, now) else (isRendering() and getRendered()) or evaluateGlobal(now)
		local season = evaluateSeason(now)
		local _object = table.clone(weather)
		setmetatable(_object, nil)
		_object.season = season.season
		_object.seasonIntensity = season.intensity
		return _object
	end
	function WeatherApi:start()
		startRenderer()
	end
	function WeatherApi:stop()
		stopRenderer()
	end
	function WeatherApi:configure(options)
		configureRenderer(options)
	end
	function WeatherApi:getConfig()
		return getConfig()
	end
	function WeatherApi:getExposure()
		return getExposure()
	end
end
local Weather = WeatherApi.new()
return {
	WeatherApi = WeatherApi,
	Weather = Weather,
}
