-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _config = TS.import(script, script.Parent.Parent, "config")
local FLASH_SECONDS = _config.FLASH_SECONDS
local LIGHTNING_CHANCE = _config.LIGHTNING_CHANCE
local LIGHTNING_SLOT = _config.LIGHTNING_SLOT
local THUNDER_DELAY_MAX = _config.THUNDER_DELAY_MAX
local THUNDER_DELAY_MIN = _config.THUNDER_DELAY_MIN
-- Strikes are drawn from the server clock: each slot of time seeds its own random numbers, so every client
-- flashes at the same moment without the server sending anything.
local Lightning
do
	Lightning = setmetatable({}, {
		__tostring = function()
			return "Lightning"
		end,
	})
	Lightning.__index = Lightning
	function Lightning.new(...)
		local self = setmetatable({}, Lightning)
		return self:constructor(...) or self
	end
	function Lightning:constructor()
		self.slot = -1
		self.flashAt = -math.huge
		self.thunderAt = math.huge
		self.thunderVolume = 0
	end
	function Lightning:update(lightning, now, thunder)
		local slot = math.floor(now / LIGHTNING_SLOT)
		if slot ~= self.slot then
			self.slot = slot
			local random = Random.new(slot)
			if lightning > 0 and random:NextNumber() < lightning * LIGHTNING_CHANCE then
				self.flashAt = (slot + random:NextNumber() * 0.8) * LIGHTNING_SLOT
				self.thunderAt = self.flashAt + random:NextNumber(THUNDER_DELAY_MIN, THUNDER_DELAY_MAX)
				self.thunderVolume = random:NextNumber(0.5, 1)
			end
		end
		if now >= self.thunderAt then
			self.thunderAt = math.huge
			thunder(self.thunderVolume)
		end
		local elapsed = now - self.flashAt
		if elapsed < 0 or elapsed >= FLASH_SECONDS then
			return 0
		end
		-- A bright strike, a flicker off, then a second glow that fades.
		if elapsed < 0.08 then
			return 1
		end
		if elapsed < 0.14 then
			return 0.2
		end
		return 0.8 * (1 - (elapsed - 0.14) / (FLASH_SECONDS - 0.14))
	end
end
return {
	Lightning = Lightning,
}
