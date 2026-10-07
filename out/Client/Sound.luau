-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _config = TS.import(script, script.Parent.Parent, "config")
local SHELTER_MUFFLE = _config.SHELTER_MUFFLE
local WIND_FULL_SPEED = _config.WIND_FULL_SPEED
local function makeSound(id, looped, group)
	if id == nil or id == "" then
		return nil
	end
	local sound = Instance.new("Sound")
	sound.SoundId = id
	sound.Looped = looped
	sound.Volume = 0
	sound.SoundGroup = group
	sound.Parent = group
	return sound
end
local function setLoop(sound, volume)
	if not sound then
		return nil
	end
	sound.Volume = volume
	if volume > 0.001 and not sound.IsPlaying then
		sound:Play()
	elseif volume <= 0.001 and sound.IsPlaying then
		sound:Stop()
	end
end
-- Rain and wind loops plus thunder, played in the listener's head (not in the world). Under a roof the
-- loops get quieter and lose their high end.
local WeatherAudio
do
	WeatherAudio = setmetatable({}, {
		__tostring = function()
			return "WeatherAudio"
		end,
	})
	WeatherAudio.__index = WeatherAudio
	function WeatherAudio.new(...)
		local self = setmetatable({}, WeatherAudio)
		return self:constructor(...) or self
	end
	function WeatherAudio:constructor(sounds)
		self.thunder = {}
		self.random = Random.new()
		self.volume = sounds.volume
		self.group = Instance.new("SoundGroup")
		self.group.Name = "Weather"
		self.muffle = Instance.new("EqualizerSoundEffect")
		self.muffle.LowGain = 0
		self.muffle.MidGain = 0
		self.muffle.HighGain = 0
		self.muffle.Parent = self.group
		self.group.Parent = game:GetService("SoundService")
		self.rain = makeSound(sounds.rain, true, self.group)
		self.wind = makeSound(sounds.wind, true, self.group)
		local _thunder = sounds.thunder
		local thunder = if type(_thunder) == "string" then { sounds.thunder } else (sounds.thunder or {})
		for _, id in thunder do
			local sound = makeSound(id, false, self.group)
			if sound then
				local _exp = self.thunder
				table.insert(_exp, sound)
			end
		end
	end
	function WeatherAudio:update(params, exposure)
		local sheltered = 1 - exposure
		self.muffle.HighGain = SHELTER_MUFFLE * sheltered
		self.muffle.MidGain = SHELTER_MUFFLE * 0.4 * sheltered
		setLoop(self.rain, self.volume * params.rain * (0.35 + 0.65 * exposure))
		local windAmount = math.clamp(params.wind.Magnitude / WIND_FULL_SPEED, 0, 1)
		setLoop(self.wind, self.volume * 0.6 * windAmount * windAmount * (0.4 + 0.6 * exposure))
	end
	function WeatherAudio:playThunder(volume)
		if #self.thunder == 0 then
			return nil
		end
		-- A random recording, pitched a little differently each time so repeats are hard to spot.
		local sound = self.thunder[self.random:NextInteger(0, #self.thunder - 1) + 1]
		sound.Volume = self.volume * volume
		sound.PlaybackSpeed = self.random:NextNumber(0.9, 1.05)
		sound.TimePosition = 0
		sound:Play()
	end
	function WeatherAudio:destroy()
		self.group:Destroy()
	end
end
return {
	WeatherAudio = WeatherAudio,
}
