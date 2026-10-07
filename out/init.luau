-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local exports = {}
exports.WeatherControl = TS.import(script, script, "Control").WeatherControl
local _Params = TS.import(script, script, "Params")
exports.PRESETS = _Params.PRESETS
exports.lerpParams = _Params.lerpParams
local _Weather = TS.import(script, script, "Weather")
exports.Weather = _Weather.Weather
exports.WeatherApi = _Weather.WeatherApi
exports.WeatherZone = TS.import(script, script, "WeatherZone").WeatherZone
return exports
