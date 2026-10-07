-- Compiled with roblox-ts v3.0.0
-- What a weather looks like. Every field blends linearly, so any two weathers can be mixed: that is how
-- transitions and zones work.
local FOG_GREY = Color3.fromRGB(199, 205, 214)
local SNOW_WHITE = Color3.fromRGB(226, 231, 238)
local PRESETS = {
	clear = {
		rain = 0,
		snow = 0,
		clouds = 0.3,
		cloudDensity = 0.4,
		cloudColor = Color3.fromRGB(255, 255, 255),
		fog = 0,
		fogColor = FOG_GREY,
		darkness = 0,
		wind = Vector3.new(2, 0, 1),
		lightning = 0,
	},
	cloudy = {
		rain = 0,
		snow = 0,
		clouds = 0.65,
		cloudDensity = 0.6,
		cloudColor = Color3.fromRGB(240, 240, 244),
		fog = 0.05,
		fogColor = FOG_GREY,
		darkness = 0.1,
		wind = Vector3.new(5, 0, 2),
		lightning = 0,
	},
	overcast = {
		rain = 0,
		snow = 0,
		clouds = 0.9,
		cloudDensity = 0.8,
		cloudColor = Color3.fromRGB(200, 201, 206),
		fog = 0.12,
		fogColor = FOG_GREY,
		darkness = 0.25,
		wind = Vector3.new(6, 0, 2),
		lightning = 0,
	},
	fog = {
		rain = 0,
		snow = 0,
		clouds = 0.8,
		cloudDensity = 0.6,
		cloudColor = Color3.fromRGB(215, 217, 222),
		fog = 0.85,
		fogColor = FOG_GREY,
		darkness = 0.2,
		wind = Vector3.new(1, 0, 0),
		lightning = 0,
	},
	drizzle = {
		rain = 0.3,
		snow = 0,
		clouds = 0.9,
		cloudDensity = 0.8,
		cloudColor = Color3.fromRGB(180, 182, 188),
		fog = 0.2,
		fogColor = FOG_GREY,
		darkness = 0.3,
		wind = Vector3.new(4, 0, 2),
		lightning = 0,
	},
	rain = {
		rain = 0.7,
		snow = 0,
		clouds = 0.95,
		cloudDensity = 0.9,
		cloudColor = Color3.fromRGB(150, 152, 160),
		fog = 0.3,
		fogColor = Color3.fromRGB(170, 176, 186),
		darkness = 0.45,
		wind = Vector3.new(8, 0, 3),
		lightning = 0,
	},
	storm = {
		rain = 1,
		snow = 0,
		clouds = 1,
		cloudDensity = 1,
		cloudColor = Color3.fromRGB(40, 42, 50),
		fog = 0.4,
		fogColor = Color3.fromRGB(78, 84, 96),
		darkness = 0.7,
		wind = Vector3.new(22, 0, 8),
		lightning = 0.6,
	},
	snow = {
		rain = 0,
		snow = 0.6,
		clouds = 0.9,
		cloudDensity = 0.7,
		cloudColor = Color3.fromRGB(220, 222, 228),
		fog = 0.35,
		fogColor = SNOW_WHITE,
		darkness = 0.2,
		wind = Vector3.new(3, 0, 1),
		lightning = 0,
	},
	blizzard = {
		rain = 0,
		snow = 1,
		clouds = 1,
		cloudDensity = 1,
		cloudColor = Color3.fromRGB(200, 204, 212),
		fog = 0.8,
		fogColor = SNOW_WHITE,
		darkness = 0.4,
		wind = Vector3.new(30, 0, 10),
		lightning = 0,
	},
}
-- The field `intensity` sets for each preset. Presets without one ignore it.
local INTENSITY_FIELD = {
	cloudy = "clouds",
	overcast = "clouds",
	fog = "fog",
	drizzle = "rain",
	rain = "rain",
	storm = "rain",
	snow = "snow",
	blizzard = "snow",
}
--* Season fields, accepted by the global weather's calls alongside the weather (zones have no season). 
--* What `Weather.sample()` returns: the weather and the season. 
local PARAM_KEYS = { "rain", "snow", "clouds", "cloudDensity", "cloudColor", "fog", "fogColor", "darkness", "wind", "lightning" }
local function copyParams(params)
	local _object = table.clone(params)
	setmetatable(_object, nil)
	return _object
end
local function lerpParams(a, b, t)
	if t <= 0 then
		return copyParams(a)
	end
	if t >= 1 then
		return copyParams(b)
	end
	return {
		rain = a.rain + (b.rain - a.rain) * t,
		snow = a.snow + (b.snow - a.snow) * t,
		clouds = a.clouds + (b.clouds - a.clouds) * t,
		cloudDensity = a.cloudDensity + (b.cloudDensity - a.cloudDensity) * t,
		cloudColor = a.cloudColor:Lerp(b.cloudColor, t),
		fog = a.fog + (b.fog - a.fog) * t,
		fogColor = a.fogColor:Lerp(b.fogColor, t),
		darkness = a.darkness + (b.darkness - a.darkness) * t,
		wind = a.wind:Lerp(b.wind, t),
		lightning = a.lightning + (b.lightning - a.lightning) * t,
	}
end
-- The weather a `set` call asks for: a preset, or fields merged over `base` (the weather already targeted),
-- then intensity, then explicit fields.
local function resolveTarget(base, weather, options)
	local _weather = weather
	local _result
	if type(_weather) == "string" then
		_result = copyParams(PRESETS[weather])
	else
		local _object = table.clone(base)
		setmetatable(_object, nil)
		for _k, _v in weather do
			_object[_k] = _v
		end
		_result = _object
	end
	local result = _result
	if options then
		local _weather_1 = weather
		local field = if type(_weather_1) == "string" then INTENSITY_FIELD[weather] else nil
		if field ~= nil and options.intensity ~= nil then
			result[field] = options.intensity
		end
		for _, key in PARAM_KEYS do
			local value = options[key]
			if value ~= nil then
				result[key] = value
			end
		end
	end
	for _, key in { "rain", "snow", "clouds", "cloudDensity", "fog", "darkness", "lightning" } do
		result[key] = math.clamp(result[key], 0, 1)
	end
	return result
end
return {
	copyParams = copyParams,
	lerpParams = lerpParams,
	resolveTarget = resolveTarget,
	PRESETS = PRESETS,
	PARAM_KEYS = PARAM_KEYS,
}
