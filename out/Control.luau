-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local DEFAULT_TRANSITION = TS.import(script, script.Parent, "config").DEFAULT_TRANSITION
local _Params = TS.import(script, script.Parent, "Params")
local PRESETS = _Params.PRESETS
local copyParams = _Params.copyParams
local resolveTarget = _Params.resolveTarget
local _State = TS.import(script, script.Parent, "State")
local clock = _State.clock
local readTransition = _State.readTransition
local sampleTransition = _State.sampleTransition
local writeTransition = _State.writeTransition
-- The calls shared by the global weather and by zones: pick a preset or set fields, with a transition.
local WeatherControl
do
	WeatherControl = {}
	function WeatherControl:constructor()
	end
	function WeatherControl:changed()
	end
	function WeatherControl:set(weather, options)
		local holder = self:holder()
		local now = clock()
		local existing = readTransition(holder)
		local current = if existing then sampleTransition(existing, now) else copyParams(PRESETS.clear)
		local _result = existing
		if _result ~= nil then
			_result = _result.to
		end
		local _condition = _result
		if _condition == nil then
			_condition = PRESETS.clear
		end
		local to = resolveTarget(_condition, weather, options)
		local _result_1 = options
		if _result_1 ~= nil then
			_result_1 = _result_1.transition
		end
		local _condition_1 = _result_1
		if _condition_1 == nil then
			_condition_1 = DEFAULT_TRANSITION
		end
		local duration = math.max(0, _condition_1)
		writeTransition(holder, {
			from = current,
			to = to,
			start = now,
			duration = duration,
		})
		self:changed()
		return self
	end
	function WeatherControl:clear(options)
		return self:set("clear", options)
	end
	function WeatherControl:cloudy(options)
		return self:set("cloudy", options)
	end
	function WeatherControl:overcast(options)
		return self:set("overcast", options)
	end
	function WeatherControl:fog(options)
		return self:set("fog", options)
	end
	function WeatherControl:drizzle(options)
		return self:set("drizzle", options)
	end
	function WeatherControl:rain(options)
		return self:set("rain", options)
	end
	function WeatherControl:storm(options)
		return self:set("storm", options)
	end
	function WeatherControl:snow(options)
		return self:set("snow", options)
	end
	function WeatherControl:blizzard(options)
		return self:set("blizzard", options)
	end
	function WeatherControl:get()
		local transition = readTransition(self:holder())
		return if transition then sampleTransition(transition, clock()) else copyParams(PRESETS.clear)
	end
	function WeatherControl:getTarget()
		local _result = readTransition(self:holder())
		if _result ~= nil then
			_result = _result.to
		end
		local _condition = _result
		if _condition == nil then
			_condition = copyParams(PRESETS.clear)
		end
		return _condition
	end
end
return {
	WeatherControl = WeatherControl,
}
