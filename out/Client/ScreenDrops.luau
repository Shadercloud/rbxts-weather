-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _config = TS.import(script, script.Parent.Parent, "config")
local SCREEN_DROP_BLUR_RADIUS = _config.SCREEN_DROP_BLUR_RADIUS
local SCREEN_DROP_DISTANCE = _config.SCREEN_DROP_DISTANCE
local SCREEN_DROP_FADE_IN = _config.SCREEN_DROP_FADE_IN
local SCREEN_DROP_LIFE_MAX = _config.SCREEN_DROP_LIFE_MAX
local SCREEN_DROP_LIFE_MIN = _config.SCREEN_DROP_LIFE_MIN
local SCREEN_DROP_MAX = _config.SCREEN_DROP_MAX
local SCREEN_DROP_RATE = _config.SCREEN_DROP_RATE
local SCREEN_DROP_SIZE_MAX = _config.SCREEN_DROP_SIZE_MAX
local SCREEN_DROP_SIZE_MIN = _config.SCREEN_DROP_SIZE_MIN
local SCREEN_DROP_SLIDE_CHANCE = _config.SCREEN_DROP_SLIDE_CHANCE
local SCREEN_DROP_TRANSPARENCY = _config.SCREEN_DROP_TRANSPARENCY
-- How much rain reaches the lens: most looking up, some looking ahead, none looking down; more facing into
-- the wind.
local function exposureOfView(look, wind)
	local amount = math.clamp(0.35 + look.Y, 0, 1)
	if wind.Magnitude > 1 then
		amount += math.max(0, -look:Dot(wind.Unit)) * math.clamp(wind.Magnitude / 30, 0, 0.6)
	end
	return math.clamp(amount, 0, 1)
end
local function makePart(folder)
	local part = Instance.new("Part")
	part.Name = "Drop"
	part.Shape = Enum.PartType.Ball
	-- Glass refracts what is behind it, so each drop shows a bent, flipped bit of the scene like real water.
	part.Material = Enum.Material.Glass
	part.Color = Color3.fromRGB(240, 244, 248)
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CanTouch = false
	part.CastShadow = false
	part.Transparency = 1
	part.Parent = folder
	return part
end
-- Water on the lens while it rains: glass beads just in front of the camera, blurred out of focus by a
-- depth of field that only reaches the first stud, so the world stays sharp. They appear, sometimes run
-- down, and fade. Opt in with `Weather.configure({ screenDrops: true })`.
local ScreenDrops
do
	ScreenDrops = setmetatable({}, {
		__tostring = function()
			return "ScreenDrops"
		end,
	})
	ScreenDrops.__index = ScreenDrops
	function ScreenDrops.new(...)
		local self = setmetatable({}, ScreenDrops)
		return self:constructor(...) or self
	end
	function ScreenDrops:constructor()
		self.drops = {}
		self.pool = {}
		self.random = Random.new()
		self.owed = 0
		self.folder = Instance.new("Folder")
		self.folder.Name = "WeatherScreenDrops"
		self.blur = Instance.new("DepthOfFieldEffect")
		self.blur.Name = "WeatherScreenDrops"
		self.blur.FarIntensity = 0
		self.blur.NearIntensity = 1
		self.blur.FocusDistance = SCREEN_DROP_BLUR_RADIUS + 3
		self.blur.InFocusRadius = 3
		self.blur.Enabled = false
		self.blur.Parent = game:GetService("Lighting")
	end
	function ScreenDrops:update(deltaTime, now, params, exposure, camera)
		if self.folder.Parent ~= camera then
			self.folder.Parent = camera
		end
		local rate = SCREEN_DROP_RATE * params.rain * exposure * exposureOfView(camera.CFrame.LookVector, params.wind)
		self.owed += rate * deltaTime
		while self.owed >= 1 do
			self.owed -= 1
			if #self.drops < SCREEN_DROP_MAX then
				self:spawn(now)
			end
		end
		-- The blur is only on while there are drops, so a game's own depth of field is left alone otherwise.
		self.blur.Enabled = not (#self.drops == 0)
		local halfHeight = SCREEN_DROP_DISTANCE * math.tan(math.rad(camera.FieldOfView / 2))
		local aspect = camera.ViewportSize.X / math.max(camera.ViewportSize.Y, 1)
		for i = #self.drops - 1, 0, -1 do
			local drop = self.drops[i + 1]
			local age = now - drop.born
			if age >= drop.life then
				drop.part.Transparency = 1
				local _pool = self.pool
				local _part = drop.part
				table.insert(_pool, _part)
				local _drops = self.drops
				local _i = i
				table.remove(_drops, _i + 1)
				continue
			end
			self:draw(drop, age, deltaTime, camera.CFrame, halfHeight, aspect)
		end
	end
	function ScreenDrops:spawn(now)
		local _exp = self.pool
		-- ▼ Array.pop ▼
		local _length = #_exp
		local _result = _exp[_length]
		_exp[_length] = nil
		-- ▲ Array.pop ▲
		local _condition = _result
		if _condition == nil then
			_condition = makePart(self.folder)
		end
		local part = _condition
		local size = self.random:NextNumber(SCREEN_DROP_SIZE_MIN, SCREEN_DROP_SIZE_MAX)
		-- Bigger drops are heavier: more likely to run, and faster.
		local heft = (size - SCREEN_DROP_SIZE_MIN) / (SCREEN_DROP_SIZE_MAX - SCREEN_DROP_SIZE_MIN)
		local slides = self.random:NextNumber() < SCREEN_DROP_SLIDE_CHANCE * (0.5 + heft)
		local _drops = self.drops
		local _arg0 = {
			part = part,
			born = now,
			life = self.random:NextNumber(SCREEN_DROP_LIFE_MIN, SCREEN_DROP_LIFE_MAX),
			x = self.random:NextNumber(-0.95, 0.95),
			y = -0.95 + 1.9 * self.random:NextNumber() ^ 2,
			size = size,
			slide = if slides then self.random:NextNumber(0.15, 0.45) * (0.6 + heft) else 0,
			cling = self.random:NextNumber(0, 1.2),
			ran = 0,
			drift = 0,
			seed = self.random:NextNumber(0, 1000),
		}
		table.insert(_drops, _arg0)
	end
	function ScreenDrops:draw(drop, age, deltaTime, view, halfHeight, aspect)
		-- Fade in quickly, hold, fade out over the last 40% of its life.
		local fadeOut = math.clamp((drop.life - age) / (drop.life * 0.4), 0, 1)
		local landing = math.clamp(age / SCREEN_DROP_FADE_IN, 0, 1)
		local visible = math.min(landing, fadeOut)
		-- Water runs in fits and starts: it catches, lets go, speeds up and stops again, wandering a little
		-- sideways. Noise over time drives the speed; below zero the drop holds still.
		if drop.slide > 0 and age > drop.cling then
			local urge = math.noise(drop.seed, age * 2.3) * 2.5 + 0.15
			local speed = drop.slide * math.clamp(urge, 0, 1.6)
			drop.ran += speed * deltaTime
			drop.drift += math.noise(drop.seed, age * 1.1, 7) * speed * deltaTime * 0.6
		end
		-- It spreads as it lands, and shrinks a little as it dries. A ball part is always round, whatever its
		-- size says, so drops cannot stretch as they run.
		local size = drop.size * (0.6 + 0.4 * landing) * (0.85 + 0.15 * fadeOut)
		drop.part.Size = Vector3.one * size
		local x = (drop.x + drop.drift) * halfHeight * aspect
		local _view = view
		local _cFrame = CFrame.new(x, (drop.y - drop.ran) * halfHeight, -SCREEN_DROP_DISTANCE)
		drop.part.CFrame = _view * _cFrame
		drop.part.Transparency = 1 - (1 - SCREEN_DROP_TRANSPARENCY) * visible
	end
	function ScreenDrops:destroy()
		self.folder:Destroy()
		self.blur:Destroy()
		table.clear(self.drops)
		table.clear(self.pool)
	end
end
return {
	ScreenDrops = ScreenDrops,
}
