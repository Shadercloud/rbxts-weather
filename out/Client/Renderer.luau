-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local SMOOTHING = TS.import(script, script.Parent.Parent, "config").SMOOTHING
local _State = TS.import(script, script.Parent.Parent, "State")
local clock = _State.clock
local evaluateAt = _State.evaluateAt
local sweepCache = _State.sweepCache
local _ClientConfig = TS.import(script, script.Parent, "ClientConfig")
local defaultConfig = _ClientConfig.defaultConfig
local mergeConfig = _ClientConfig.mergeConfig
local Lightning = TS.import(script, script.Parent, "Lightning").Lightning
local Precipitation = TS.import(script, script.Parent, "Precipitation").Precipitation
local ScreenDrops = TS.import(script, script.Parent, "ScreenDrops").ScreenDrops
local Sky = TS.import(script, script.Parent, "Sky").Sky
local WeatherAudio = TS.import(script, script.Parent, "Sound").WeatherAudio
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local STEP_NAME = "Weather"
local SWEEP_SECONDS = 5
local config = defaultConfig()
local running = false
local sky
local precipitation
local audio
local screenDrops
local lightning = Lightning.new()
local exposure = 1
local lastSweep = 0
local baseWind
local current
local function step(deltaTime)
	local camera = Workspace.CurrentCamera
	if not camera then
		return nil
	end
	local focus = if config.focus then config.focus() else camera.CFrame.Position
	local now = clock()
	local params = evaluateAt(focus, now)
	current = params
	if config.wind then
		Workspace.GlobalWind = params.wind
	end
	local target = if precipitation then precipitation:update(params, focus, config) else 1
	exposure += (target - exposure) * math.min(1, deltaTime * SMOOTHING)
	local flash = lightning:update(params.lightning, now, function(volume)
		local _result = audio
		if _result ~= nil then
			_result = _result:playThunder(volume)
		end
		return _result
	end)
	local _result = sky
	if _result ~= nil then
		_result:update(params, flash * (0.4 + 0.6 * exposure))
	end
	local _result_1 = audio
	if _result_1 ~= nil then
		_result_1:update(params, exposure)
	end
	local _result_2 = screenDrops
	if _result_2 ~= nil then
		_result_2:update(deltaTime, now, params, target, camera)
	end
	if now - lastSweep > SWEEP_SECONDS then
		lastSweep = now
		sweepCache()
	end
end
local function isRendering()
	return running
end
local function startRenderer()
	if running or RunService:IsServer() then
		return nil
	end
	running = true
	baseWind = Workspace.GlobalWind
	if config.sky then
		sky = Sky.new()
	end
	precipitation = Precipitation.new(config.appearance)
	audio = WeatherAudio.new(config.sounds)
	if config.screenDrops then
		screenDrops = ScreenDrops.new()
	end
	lightning = Lightning.new()
	RunService:BindToRenderStep(STEP_NAME, Enum.RenderPriority.Camera.Value + 1, step)
end
local function stopRenderer()
	if not running then
		return nil
	end
	running = false
	RunService:UnbindFromRenderStep(STEP_NAME)
	local _result = sky
	if _result ~= nil then
		_result:stop()
	end
	sky = nil
	local _result_1 = precipitation
	if _result_1 ~= nil then
		_result_1:destroy()
	end
	precipitation = nil
	local _result_2 = audio
	if _result_2 ~= nil then
		_result_2:destroy()
	end
	audio = nil
	local _result_3 = screenDrops
	if _result_3 ~= nil then
		_result_3:destroy()
	end
	screenDrops = nil
	current = nil
	if baseWind and config.wind then
		Workspace.GlobalWind = baseWind
	end
end
local function configureRenderer(options)
	local previous = config
	config = mergeConfig(config, options)
	if not running then
		return nil
	end
	if previous.sky ~= config.sky then
		local _result = sky
		if _result ~= nil then
			_result:stop()
		end
		sky = if config.sky then Sky.new() else nil
	end
	if previous.screenDrops ~= config.screenDrops then
		local _result = screenDrops
		if _result ~= nil then
			_result:destroy()
		end
		screenDrops = if config.screenDrops then ScreenDrops.new() else nil
	end
	if previous.wind and not config.wind and baseWind then
		Workspace.GlobalWind = baseWind
	end
	if options.appearance then
		local _result = precipitation
		if _result ~= nil then
			_result:setAppearance(config.appearance)
		end
	end
	if options.sounds then
		local _result = audio
		if _result ~= nil then
			_result:destroy()
		end
		audio = WeatherAudio.new(config.sounds)
	end
end
local function getConfig()
	return config
end
--* The weather drawn on the last frame, zones included; undefined while not rendering. 
local function getRendered()
	return current
end
--* How exposed the camera is to the sky, 0 (under a roof) to 1, smoothed. 
local function getExposure()
	return exposure
end
return {
	isRendering = isRendering,
	startRenderer = startRenderer,
	stopRenderer = stopRenderer,
	configureRenderer = configureRenderer,
	getConfig = getConfig,
	getRendered = getRendered,
	getExposure = getExposure,
}
