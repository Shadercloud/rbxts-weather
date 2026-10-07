-- Compiled with roblox-ts v3.0.0
-- The season: separate from the weather, so picking a weather preset never changes it, and global only (zones
-- do not have one). For now only autumn is drawn (falling leaves); the others are there for games to read and
-- for effects to come.
local SEASONS = { "spring", "summer", "autumn", "winter" }
local DEFAULT_SEASON = {
	season = "summer",
	intensity = 1,
}
local function isSeason(value)
	local _value = value
	local _condition = type(_value) == "string"
	if _condition then
		local _value_1 = value
		_condition = table.find(SEASONS, _value_1) ~= nil
	end
	return _condition
end
-- Between two different seasons the old one fades out over the first half and the new one in over the second:
-- autumn's leaves stop falling before spring's effects begin.
local function sampleSeason(transition, now)
	local _binding = transition
	local from = _binding.from
	local to = _binding.to
	local raw = if transition.duration <= 0 then 1 else math.clamp((now - transition.start) / transition.duration, 0, 1)
	local t = raw * raw * (3 - 2 * raw)
	if from.season == to.season then
		return {
			season = to.season,
			intensity = from.intensity + (to.intensity - from.intensity) * t,
		}
	end
	return if t < 0.5 then {
		season = from.season,
		intensity = from.intensity * (1 - 2 * t),
	} else {
		season = to.season,
		intensity = to.intensity * (2 * t - 1),
	}
end
local function writeSeason(instance, transition)
	instance:SetAttribute("season_from", transition.from.season)
	instance:SetAttribute("seasonIntensity_from", transition.from.intensity)
	instance:SetAttribute("season_to", transition.to.season)
	instance:SetAttribute("seasonIntensity_to", transition.to.intensity)
	instance:SetAttribute("season_start", transition.start)
	-- Written last: readers treat an instance without it as having no season.
	instance:SetAttribute("season_duration", transition.duration)
end
local function readSeason(instance)
	local duration = instance:GetAttribute("season_duration")
	local start = instance:GetAttribute("season_start")
	local fromSeason = instance:GetAttribute("season_from")
	local toSeason = instance:GetAttribute("season_to")
	if not (type(duration) == "number") or not (type(start) == "number") or not isSeason(fromSeason) or not isSeason(toSeason) then
		return nil
	end
	local fromIntensity = instance:GetAttribute("seasonIntensity_from")
	local toIntensity = instance:GetAttribute("seasonIntensity_to")
	return {
		from = {
			season = fromSeason,
			intensity = if type(fromIntensity) == "number" then fromIntensity else 1,
		},
		to = {
			season = toSeason,
			intensity = if type(toIntensity) == "number" then toIntensity else 1,
		},
		start = start,
		duration = duration,
	}
end
local function clearSeason(instance)
	for _, name in { "season_duration", "season_start", "season_from", "season_to", "seasonIntensity_from", "seasonIntensity_to" } do
		instance:SetAttribute(name, nil)
	end
end
return {
	sampleSeason = sampleSeason,
	writeSeason = writeSeason,
	readSeason = readSeason,
	clearSeason = clearSeason,
	SEASONS = SEASONS,
	DEFAULT_SEASON = DEFAULT_SEASON,
}
