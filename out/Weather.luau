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
local WeatherControl = TS.import(script, script.Parent, "Control").WeatherControl
local _State = TS.import(script, script.Parent, "State")
local clearTransition = _State.clearTransition
local clock = _State.clock
local evaluateAt = _State.evaluateAt
local evaluateGlobal = _State.evaluateGlobal
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
	function WeatherApi:zone(region, options)
		return WeatherZone.new(region, options, function()
			return self:changed()
		end)
	end
	function WeatherApi:reset()
		clearTransition(getOwnRoot())
	end
	function WeatherApi:sample(position)
		if position then
			return evaluateAt(position, clock())
		end
		return (isRendering() and getRendered()) or evaluateGlobal(clock())
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
