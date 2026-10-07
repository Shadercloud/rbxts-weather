-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _config = TS.import(script, script.Parent.Parent, "config")
local CELL_SIZE = _config.CELL_SIZE
local CHECKS_PER_FRAME = _config.CHECKS_PER_FRAME
local COVER_SEARCH = _config.COVER_SEARCH
local GRID_RADIUS = _config.GRID_RADIUS
local GROUND_SEARCH = _config.GROUND_SEARCH
local NO_GROUND_DEPTH = _config.NO_GROUND_DEPTH
local RAIN_CURVE = _config.RAIN_CURVE
local RAIN_CLEARING = _config.RAIN_CLEARING
local RAIN_HEIGHT = _config.RAIN_HEIGHT
local RAIN_RATE = _config.RAIN_RATE
local RAIN_SPEED = _config.RAIN_SPEED
local RATE_FALLOFF = _config.RATE_FALLOFF
local SEE_THROUGH = _config.SEE_THROUGH
local SNOW_GRID_RADIUS = _config.SNOW_GRID_RADIUS
local SNOW_HEIGHT = _config.SNOW_HEIGHT
local SNOW_RATE = _config.SNOW_RATE
local SNOW_SPEED = _config.SNOW_SPEED
local SPLASH_RADIUS = _config.SPLASH_RADIUS
local SPLASH_RATE = _config.SPLASH_RATE
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")
-- A rain emitter part and where it sits in its column, relative to the column's centre.
-- One column of the grid around the camera: rain and snow emitters above it, and one on the ground for
-- splashes. See the Precipitation section of config.ts.
local function makePart(name, folder, size)
	local part = Instance.new("Part")
	part.Name = name
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CanTouch = false
	part.CastShadow = false
	part.Transparency = 1
	part.Size = size
	part.Parent = folder
	return part
end
local function constant(value)
	return NumberSequence.new(value)
end
local function styleRain(emitter, look)
	emitter.Texture = look.rainTexture
	emitter.Color = ColorSequence.new(look.rainColor)
	emitter.Size = constant(look.rainSize)
	emitter.Squash = constant(look.rainSquash)
	emitter.Transparency = constant(look.rainTransparency)
end
local function styleSnow(emitter, look)
	emitter.Texture = look.snowTexture
	emitter.Color = ColorSequence.new(look.snowColor)
	emitter.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, look.snowSize, look.snowSize * 0.4), NumberSequenceKeypoint.new(1, look.snowSize, look.snowSize * 0.4) })
end
local function styleSplash(emitter, look)
	emitter.Texture = look.rainTexture
	emitter.Color = ColorSequence.new(look.splashColor)
end
local function makeEmitter(part)
	local emitter = Instance.new("ParticleEmitter")
	emitter.Enabled = false
	emitter.Rate = 0
	emitter.Shape = Enum.ParticleEmitterShape.Box
	emitter.ShapeInOut = Enum.ParticleEmitterShapeInOut.Outward
	emitter.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume
	emitter.Parent = part
	return emitter
end
local function makeRainPiece(folder, look, size, offset)
	local part = makePart("Rain", folder, size)
	local emitter = makeEmitter(part)
	emitter.EmissionDirection = Enum.NormalId.Bottom
	emitter.Orientation = Enum.ParticleOrientation.VelocityParallel
	emitter.SpreadAngle = Vector2.new(1, 1)
	emitter.LightEmission = 0.15
	emitter.LightInfluence = 0.8
	styleRain(emitter, look)
	return {
		part = part,
		emitter = emitter,
		offset = offset,
		share = (size.X * size.Z) / (CELL_SIZE * CELL_SIZE),
	}
end
-- The camera's own column leaves a square hole around the camera: drops passing within a few studs of the
-- lens fill the screen as wide white streaks. It is four strips around the hole.
local function makeRainPieces(folder, look, clearing)
	local half = CELL_SIZE / 2
	if not clearing or RAIN_CLEARING <= 0 then
		return { makeRainPiece(folder, look, Vector3.new(CELL_SIZE, 0.2, CELL_SIZE), Vector3.zero) }
	end
	local hole = math.min(RAIN_CLEARING, half - 1)
	local band = half - hole
	local middle = hole + band / 2
	return { makeRainPiece(folder, look, Vector3.new(CELL_SIZE, 0.2, band), Vector3.new(0, 0, middle)), makeRainPiece(folder, look, Vector3.new(CELL_SIZE, 0.2, band), Vector3.new(0, 0, -middle)), makeRainPiece(folder, look, Vector3.new(band, 0.2, hole * 2), Vector3.new(middle, 0, 0)), makeRainPiece(folder, look, Vector3.new(band, 0.2, hole * 2), Vector3.new(-middle, 0, 0)) }
end
local function createColumn(folder, look, dx, dz)
	local footprint = Vector3.new(CELL_SIZE, 0.2, CELL_SIZE)
	local snowPart = makePart("Snow", folder, footprint)
	local snow = makeEmitter(snowPart)
	snow.EmissionDirection = Enum.NormalId.Bottom
	snow.SpreadAngle = Vector2.new(12, 12)
	-- Flakes are flat and tumble as they fall: each is squashed into a slightly different shape that widens and
	-- narrows over its life while it turns.
	snow.Squash = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.3, 0.25), NumberSequenceKeypoint.new(0.35, -0.25, 0.25), NumberSequenceKeypoint.new(0.7, 0.3, 0.25), NumberSequenceKeypoint.new(1, -0.25, 0.25) })
	snow.Rotation = NumberRange.new(0, 360)
	snow.RotSpeed = NumberRange.new(-90, 90)
	snow.LightEmission = 0.4
	snow.LightInfluence = 1
	-- Flakes fade in and out instead of popping into view at the emitter and out at the ground.
	snow.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.08, 0.25), NumberSequenceKeypoint.new(0.9, 0.25), NumberSequenceKeypoint.new(1, 1) })
	styleSnow(snow, look)
	-- Rain and splashes only on the inner columns that use them; the outer ones are snow only.
	local ring = math.max(math.abs(dx), math.abs(dz))
	local groundPart
	local splash
	if ring <= SPLASH_RADIUS then
		groundPart = makePart("Splash", folder, footprint)
		splash = makeEmitter(groundPart)
		splash.EmissionDirection = Enum.NormalId.Top
		splash.SpreadAngle = Vector2.new(45, 45)
		splash.Speed = NumberRange.new(3, 7)
		splash.Lifetime = NumberRange.new(0.12, 0.25)
		splash.Acceleration = Vector3.new(0, -60, 0)
		splash.Size = NumberSequence.new(0.12, 0.02)
		splash.Transparency = NumberSequence.new(0.4, 1)
		splash.LightInfluence = 0.8
		styleSplash(splash, look)
	end
	return {
		dx = dx,
		dz = dz,
		rain = if ring <= GRID_RADIUS then makeRainPieces(folder, look, ring == 0) else {},
		snowPart = snowPart,
		snow = snow,
		groundPart = groundPart,
		splash = splash,
		covered = false,
		groundY = nil,
		rainRate = 0,
		snowRate = 0,
		splashRate = 0,
	}
end
local function setRate(emitter, rate)
	emitter.Rate = rate
	emitter.Enabled = rate > 0
end
-- Part orientation whose bottom face points along `velocity`, so particles leave along it.
local function facing(position, velocity)
	local up = velocity.Unit * (-1)
	local right = up:Cross(Vector3.zAxis).Unit
	return CFrame.fromMatrix(position, right, up)
end
-- The grid is centred on the camera and moves with it, so the camera's column (and its hole) is always
-- under the camera. Columns are re-checked round robin as they move; a jump re-checks them all.
--
-- Rain uses the inner GRID_RADIUS columns, snow all SNOW_GRID_RADIUS of them: see config.ts.
local Precipitation
do
	Precipitation = setmetatable({}, {
		__tostring = function()
			return "Precipitation"
		end,
	})
	Precipitation.__index = Precipitation
	function Precipitation.new(...)
		local self = setmetatable({}, Precipitation)
		return self:constructor(...) or self
	end
	function Precipitation:constructor(look)
		self.columns = {}
		self.checkCursor = 0
		self.active = false
		self.folder = Instance.new("Folder")
		self.folder.Name = "Weather"
		self.folder.Parent = Workspace.CurrentCamera or Workspace
		local radius = math.max(GRID_RADIUS, SNOW_GRID_RADIUS)
		do
			local dx = -radius
			local _shouldIncrement = false
			while true do
				if _shouldIncrement then
					dx += 1
				else
					_shouldIncrement = true
				end
				if not (dx <= radius) then
					break
				end
				do
					local dz = -radius
					local _shouldIncrement_1 = false
					while true do
						if _shouldIncrement_1 then
							dz += 1
						else
							_shouldIncrement_1 = true
						end
						if not (dz <= radius) then
							break
						end
						local _columns = self.columns
						local _arg0 = createColumn(self.folder, look, dx, dz)
						table.insert(_columns, _arg0)
					end
				end
			end
		end
	end
	function Precipitation:setAppearance(look)
		for _, column in self.columns do
			for _1, piece in column.rain do
				styleRain(piece.emitter, look)
			end
			styleSnow(column.snow, look)
			if column.splash then
				styleSplash(column.splash, look)
			end
		end
	end
	function Precipitation:update(params, focus, config)
		if self.folder.Parent ~= Workspace.CurrentCamera and Workspace.CurrentCamera then
			self.folder.Parent = Workspace.CurrentCamera
		end
		self.rayParams = nil
		local raining = params.rain > 0.001
		local snowing = params.snow > 0.001
		if not raining and not snowing then
			self:stopAll()
			return 1
		end
		-- Round-robin re-checks: the grid moving, roofs built, terrain dug. All at once after a jump.
		local _condition = not self.active or not self.lastFocus
		if not _condition then
			local _lastFocus = self.lastFocus
			local _focus = focus
			_condition = (_lastFocus - _focus).Magnitude > CELL_SIZE
		end
		local jumped = _condition
		self.active = true
		self.lastFocus = focus
		local checks = if jumped then #self.columns else CHECKS_PER_FRAME
		do
			local i = 0
			local _shouldIncrement = false
			while true do
				if _shouldIncrement then
					i += 1
				else
					_shouldIncrement = true
				end
				if not (i < checks) then
					break
				end
				self.checkCursor = (self.checkCursor + 1) % #self.columns
				self:check(self.columns[self.checkCursor + 1], focus, config)
			end
		end
		local scale = config.particles
		local windFlat = Vector3.new(params.wind.X, 0, params.wind.Z)
		local rainVelocity = Vector3.new(params.wind.X, -RAIN_SPEED, params.wind.Z)
		local snowVelocity = Vector3.new(params.wind.X, -SNOW_SPEED, params.wind.Z)
		local rainTop = focus.Y + RAIN_HEIGHT
		local snowTop = focus.Y + SNOW_HEIGHT
		local fallback = focus.Y - NO_GROUND_DEPTH
		local parts = {}
		local cframes = {}
		local exposedWeight = 0
		local totalWeight = 0
		for _, column in self.columns do
			local ring = math.max(math.abs(column.dx), math.abs(column.dz))
			local falloff = math.max(0, 1 - RATE_FALLOFF * math.max(0, ring - 1))
			local centre = Vector3.new(focus.X + column.dx * CELL_SIZE, 0, focus.Z + column.dz * CELL_SIZE)
			local rains = ring <= GRID_RADIUS
			local sheltered = config.shelter and column.covered
			local _result
			if config.shelter then
				local _condition_1 = column.groundY
				if _condition_1 == nil then
					_condition_1 = fallback
				end
				_result = _condition_1
			else
				_result = fallback
			end
			local ground = _result
			if ring <= 1 then
				local weight = if ring == 0 then 3 else 1
				totalWeight += weight
				if not sheltered and ground < focus.Y + 1 then
					exposedWeight += weight
				end
			end
			-- Rain: emitted upwind so it lands in this column, living just long enough to reach the ground.
			local rainRate = 0
			local rainFall = rainTop - ground
			if raining and rains and not sheltered and rainFall > 0 then
				local life = rainFall / RAIN_SPEED
				rainRate = params.rain ^ RAIN_CURVE * RAIN_RATE * scale * falloff
				local _vector3 = Vector3.new(0, rainTop, 0)
				local _exp = centre + _vector3
				local _arg0 = windFlat * life
				local top = _exp - _arg0
				local lifetime = NumberRange.new(life)
				local speed = NumberRange.new(rainVelocity.Magnitude)
				for _1, piece in column.rain do
					piece.emitter.Lifetime = lifetime
					piece.emitter.Speed = speed
					local _part = piece.part
					table.insert(parts, _part)
					local _offset = piece.offset
					local _arg0_1 = facing(top + _offset, rainVelocity)
					table.insert(cframes, _arg0_1)
				end
			end
			if rainRate ~= column.rainRate then
				column.rainRate = rainRate
				for _1, piece in column.rain do
					setRate(piece.emitter, rainRate * piece.share)
				end
			end
			local snowRate = 0
			local snowFall = snowTop - ground
			if snowing and not sheltered and snowFall > 0 then
				local life = snowFall / SNOW_SPEED
				column.snow.Lifetime = NumberRange.new(life)
				column.snow.Speed = NumberRange.new(snowVelocity.Magnitude * 0.85, snowVelocity.Magnitude * 1.15)
				-- Snow keeps its full rate out to the edge: it is slow, and a thin edge is soon outrun.
				snowRate = params.snow * SNOW_RATE * scale
				local _snowPart = column.snowPart
				table.insert(parts, _snowPart)
				local _vector3 = Vector3.new(0, snowTop, 0)
				local _exp = centre + _vector3
				local _arg0 = windFlat * life
				local _arg0_1 = facing(_exp - _arg0, snowVelocity)
				table.insert(cframes, _arg0_1)
			end
			if snowRate ~= column.snowRate then
				local _exp = column.snow
				column.snowRate = snowRate
				setRate(_exp, (column.snowRate))
			end
			local splashRate = 0
			if rainRate > 0 and column.groundPart and column.groundY ~= nil and config.shelter then
				splashRate = params.rain * SPLASH_RATE * scale
				local _groundPart = column.groundPart
				table.insert(parts, _groundPart)
				local _vector3 = Vector3.new(0, column.groundY + 0.2, 0)
				local _cFrame = CFrame.new(centre + _vector3)
				table.insert(cframes, _cFrame)
			end
			if splashRate ~= column.splashRate and column.splash then
				local _exp = column.splash
				column.splashRate = splashRate
				setRate(_exp, (column.splashRate))
			end
		end
		Workspace:BulkMoveTo(parts, cframes, Enum.BulkMoveMode.FireCFrameChanged)
		return if totalWeight > 0 then exposedWeight / totalWeight else 1
	end
	function Precipitation:stopAll()
		if not self.active then
			return nil
		end
		self.active = false
		for _, column in self.columns do
			column.rainRate = 0
			for _1, piece in column.rain do
				setRate(piece.emitter, 0)
			end
			local _exp = column.snow
			column.snowRate = 0
			setRate(_exp, (column.snowRate))
			if column.splash then
				local _exp_1 = column.splash
				column.splashRate = 0
				setRate(_exp_1, (column.splashRate))
			end
		end
	end
	function Precipitation:params(config)
		if self.rayParams then
			return self.rayParams
		end
		local _array = { self.folder }
		local _length = #_array
		local _array_1 = config.ignore
		table.move(_array_1, 1, #_array_1, _length + 1, _array)
		local ignore = _array
		for _, player in Players:GetPlayers() do
			if player.Character then
				local _character = player.Character
				table.insert(ignore, _character)
			end
		end
		local params = RaycastParams.new()
		params.FilterType = Enum.RaycastFilterType.Exclude
		params.FilterDescendantsInstances = ignore
		params.IgnoreWater = false
		self.rayParams = params
		return params
	end
	function Precipitation:cast(origin, direction, params)
		for i = 0, 5 do
			local result = Workspace:Raycast(origin, direction, params)
			if not result then
				return nil
			end
			local hit = result.Instance
			if hit:IsA("BasePart") and not hit:IsA("Terrain") and hit.Transparency >= SEE_THROUGH then
				params:AddToFilter(hit)
				continue
			end
			return result
		end
		return nil
	end
	function Precipitation:check(column, focus, config)
		if not config.shelter then
			return nil
		end
		local params = self:params(config)
		local top = Vector3.new(focus.X + column.dx * CELL_SIZE, focus.Y + math.max(RAIN_HEIGHT, SNOW_HEIGHT), focus.Z + column.dz * CELL_SIZE)
		column.covered = self:cast(top, Vector3.new(0, COVER_SEARCH, 0), params) ~= nil
		local _result = self:cast(top, Vector3.new(0, -(GROUND_SEARCH + RAIN_HEIGHT), 0), params)
		if _result ~= nil then
			_result = _result.Position.Y
		end
		column.groundY = _result
	end
	function Precipitation:destroy()
		self.folder:Destroy()
		table.clear(self.columns)
	end
end
return {
	Precipitation = Precipitation,
}
