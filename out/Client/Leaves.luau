-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _config = TS.import(script, script.Parent.Parent, "config")
local LEAF_EDDY_MIN = _config.LEAF_EDDY_MIN
local LEAF_EDDY_SCALE = _config.LEAF_EDDY_SCALE
local LEAF_EDDY_SHARE = _config.LEAF_EDDY_SHARE
local LEAF_EDDY_SPEED = _config.LEAF_EDDY_SPEED
local LEAF_FADE = _config.LEAF_FADE
local LEAF_GALE = _config.LEAF_GALE
local LEAF_GUST = _config.LEAF_GUST
local LEAF_GUST_SPEED = _config.LEAF_GUST_SPEED
local LEAF_HEIGHT_CEILING = _config.LEAF_HEIGHT_CEILING
local LEAF_HEIGHT_MAX = _config.LEAF_HEIGHT_MAX
local LEAF_HEIGHT_MIN = _config.LEAF_HEIGHT_MIN
local LEAF_LIFE = _config.LEAF_LIFE
local LEAF_MAX = _config.LEAF_MAX
local LEAF_RATE = _config.LEAF_RATE
local LEAF_REST = _config.LEAF_REST
local LEAF_SINK_MAX = _config.LEAF_SINK_MAX
local LEAF_SINK_MIN = _config.LEAF_SINK_MIN
local LEAF_SPAWN_MAX = _config.LEAF_SPAWN_MAX
local LEAF_SPAWN_MIN = _config.LEAF_SPAWN_MIN
local LEAF_WIND_FOLLOW = _config.LEAF_WIND_FOLLOW
local Workspace = game:GetService("Workspace")
-- See where it is set: the least transparency that keeps a leaf in the transparent render pass.
local MIN_TRANSPARENCY = 0.02
local Players = game:GetService("Players")
-- A leaf: one of the curved leaf meshes with one of the pictures as its texture. A SpecialMesh takes both
-- by id at run time, with no EditableMesh or EditableImage; its texture's transparent background leaves only
-- the leaf's own outline.
local function makeLeaf(image, meshId, size, shade)
	local part = Instance.new("Part")
	part.Name = "Leaf"
	part.Size = Vector3.new(size, size * 0.3, size)
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CanTouch = false
	part.CastShadow = false
	part.Transparency = MIN_TRANSPARENCY
	local mesh = Instance.new("SpecialMesh")
	mesh.MeshType = Enum.MeshType.FileMesh
	mesh.MeshId = meshId
	mesh.TextureId = image.texture
	mesh.Scale = Vector3.new(size, size, size)
	-- A little darker or duller now and then, so two leaves from one picture still differ.
	local tint = (image.tint or Color3.new(1, 1, 1)):Lerp(Color3.new(0.72, 0.62, 0.5), shade)
	mesh.VertexColor = Vector3.new(tint.R, tint.G, tint.B)
	mesh.Parent = part
	return part
end
-- Autumn: leaves drift down from high up all around the player, tumbling and fluttering on the wind; they
-- land, lie a moment and fade. They start out of the camera's view, so none appears out of nothing.
local Leaves
do
	Leaves = setmetatable({}, {
		__tostring = function()
			return "Leaves"
		end,
	})
	Leaves.__index = Leaves
	function Leaves.new(...)
		local self = setmetatable({}, Leaves)
		return self:constructor(...) or self
	end
	function Leaves:constructor()
		self.leaves = {}
		self.random = Random.new()
		self.owed = 0
		self.rayParams = RaycastParams.new()
		self.folder = Instance.new("Folder")
		self.folder.Name = "WeatherLeaves"
		self.folder.Parent = Workspace
	end
	function Leaves:ground(position)
		local _position = position
		local _vector3 = Vector3.new(0, 2, 0)
		local _result = Workspace:Raycast(_position + _vector3, Vector3.new(0, -300, 0), self.rayParams)
		if _result ~= nil then
			_result = _result.Position.Y
		end
		return _result
	end
	function Leaves:onScreen(camera, point)
		local screen, inFront = camera:WorldToViewportPoint(point)
		local viewport = camera.ViewportSize
		local margin = 80
		return inFront and screen.X > -margin and screen.X < viewport.X + margin and screen.Y > -margin and screen.Y < viewport.Y + margin
	end
	function Leaves:flow(position, now, wind)
		-- Gusts: one rhythm for every leaf, so a gust sends them all surging at once.
		local gust = 1 + LEAF_GUST * 2 * math.noise(now * LEAF_GUST_SPEED, 7.3)
		local _vector3 = Vector3.new(wind.X, 0, wind.Z)
		local _arg0 = LEAF_WIND_FOLLOW * gust
		local steady = _vector3 * _arg0
		local strength = math.max(LEAF_EDDY_MIN, steady.Magnitude * LEAF_EDDY_SHARE)
		local x = position.X / LEAF_EDDY_SCALE
		local z = position.Z / LEAF_EDDY_SCALE
		local t = now * LEAF_EDDY_SPEED
		local eddy = Vector3.new(math.noise(x, z, t), 0, math.noise(x + 31.7, z - 17.3, t))
		local _arg0_1 = strength * 2
		local _arg0_2 = eddy * _arg0_1
		return steady + _arg0_2
	end
	function Leaves:spawnPoint(camera, focus, wind)
		local windiness = math.clamp(wind.Magnitude / LEAF_GALE, 0, 1)
		local flat = Vector3.new(wind.X, 0, wind.Z)
		local lower = 1 - 0.75 * windiness
		for attempt = 0, 11 do
			local spot
			if windiness > 0.25 and flat.Magnitude > 0.01 and self.random:NextNumber() < 0.7 then
				-- Most start from a spot in front of the camera, then (below) move upwind until out of sight, so
				-- the wind carries them across the view.
				local look = camera.CFrame.LookVector
				local ahead = if Vector3.new(look.X, 0, look.Z).Magnitude > 0.01 then Vector3.new(look.X, 0, look.Z).Unit else flat.Unit
				local side = Vector3.new(-ahead.Z, 0, ahead.X)
				local _focus = focus
				local _arg0 = self.random:NextNumber(8, 50)
				local _arg0_1 = ahead * _arg0
				local _arg0_2 = self.random:NextNumber(-30, 30)
				local _arg0_3 = side * _arg0_2
				spot = _focus + _arg0_1 + _arg0_3
			elseif windiness > 0.25 and flat.Magnitude > 0.01 then
				local along = flat.Unit
				local across = Vector3.new(-along.Z, 0, along.X)
				local _focus = focus
				local _arg0 = LEAF_SPAWN_MAX * self.random:NextNumber(0.3, 1)
				local _arg0_1 = along * _arg0
				local _arg0_2 = LEAF_SPAWN_MAX * self.random:NextNumber(-0.8, 0.8)
				local _arg0_3 = across * _arg0_2
				spot = _focus - _arg0_1 + _arg0_3
			else
				local angle = self.random:NextNumber(0, 2 * math.pi)
				local inner = LEAF_SPAWN_MIN * LEAF_SPAWN_MIN
				local distance = math.sqrt(self.random:NextNumber(inner, LEAF_SPAWN_MAX * LEAF_SPAWN_MAX))
				local _focus = focus
				local _vector3 = Vector3.new(math.cos(angle) * distance, 0, math.sin(angle) * distance)
				spot = _focus + _vector3
			end
			local windy = windiness > 0.25 and flat.Magnitude > 0.01
			local height = self.random:NextNumber(LEAF_HEIGHT_MIN, LEAF_HEIGHT_MAX) * lower
			local _self = self
			local _spot = spot
			local _vector3 = Vector3.new(0, 100, 0)
			local groundY = _self:ground(_spot + _vector3)
			if groundY == nil then
				continue
			end
			local point = Vector3.new(spot.X, groundY + height, spot.Z)
			-- A start the camera can see is moved out of view: in a strong wind further upwind, keeping it low
			-- (the wind brings it in); otherwise up above the top of the frame, so it drifts down from the sky.
			do
				local tries = 0
				local _shouldIncrement = false
				while true do
					if _shouldIncrement then
						tries += 1
					else
						_shouldIncrement = true
					end
					if not (tries < 16 and self:onScreen(camera, point)) then
						break
					end
					if windy then
						local _spot_1 = spot
						local _arg0 = flat.Unit * 10
						spot = _spot_1 - _arg0
						local _self_1 = self
						local _spot_2 = spot
						local _vector3_1 = Vector3.new(0, 100, 0)
						groundY = _self_1:ground(_spot_2 + _vector3_1)
						if groundY == nil then
							break
						end
					else
						height = math.min(height + 5, LEAF_HEIGHT_CEILING)
					end
					point = Vector3.new(spot.X, groundY + height, spot.Z)
				end
			end
			if groundY ~= nil and not self:onScreen(camera, point) then
				return { point, groundY }
			end
		end
		return nil
	end
	function Leaves:spawn(now, camera, focus, wind, look)
		local images = look.leaves
		if #images == 0 then
			return nil
		end
		local spawned = self:spawnPoint(camera, focus, wind)
		if not spawned then
			return nil
		end
		local _binding = spawned
		local point = _binding[1]
		local groundY = _binding[2]
		local sink = self.random:NextNumber(LEAF_SINK_MIN, LEAF_SINK_MAX)
		local image = images[self.random:NextInteger(0, #images - 1) + 1]
		local _condition = image.size
		if _condition == nil then
			_condition = 1
		end
		local size = _condition * look.leafSize * self.random:NextNumber(0.8, 1.2)
		local meshes = look.leafMeshes
		if #meshes == 0 then
			return nil
		end
		local meshId = meshes[self.random:NextInteger(0, #meshes - 1) + 1]
		local part = makeLeaf(image, meshId, size, self.random:NextNumber(0, 0.45))
		part.Parent = self.folder
		local spin = Vector3.new(self.random:NextNumber(-1, 1), self.random:NextNumber(-1, 1), self.random:NextNumber(-1, 1))
		local _leaves = self.leaves
		local _object = {
			part = part,
			sink = sink,
			born = now,
			position = point,
			velocity = Vector3.zero,
			rotation = CFrame.Angles(self.random:NextNumber(0, 6.28), self.random:NextNumber(0, 6.28), 0),
		}
		local _left = "spin"
		local _result
		if spin.Magnitude > 0.01 then
			local _unit = spin.Unit
			local _arg0 = self.random:NextNumber(2, 6)
			_result = _unit * _arg0
		else
			_result = Vector3.new(0, 4, 0)
		end
		_object[_left] = _result
		_object.seed = self.random:NextNumber(0, 1000)
		_object.groundY = groundY
		table.insert(_leaves, _object)
	end
	function Leaves:update(deltaTime, now, amount, wind, focus, look)
		local camera = Workspace.CurrentCamera
		if not camera then
			return nil
		end
		local ignore = { self.folder }
		for _, player in Players:GetPlayers() do
			if player.Character then
				local _character = player.Character
				table.insert(ignore, _character)
			end
		end
		self.rayParams.FilterType = Enum.RaycastFilterType.Exclude
		self.rayParams.FilterDescendantsInstances = ignore
		-- A strong wind sweeps leaves through quickly, so more set off to keep the air as full.
		local windiness = math.clamp(wind.Magnitude / LEAF_GALE, 0, 1)
		self.owed += LEAF_RATE * amount * (0.5 + 1.5 * windiness) * deltaTime
		while self.owed >= 1 do
			self.owed -= 1
			if #self.leaves < LEAF_MAX * amount then
				self:spawn(now, camera, focus, wind, look)
			end
		end
		local parts = {}
		local cframes = {}
		for i = #self.leaves - 1, 0, -1 do
			local leaf = self.leaves[i + 1]
			local age = now - leaf.born
			local fade = 0
			if leaf.landed ~= nil then
				fade = math.clamp((now - leaf.landed - LEAF_REST) / LEAF_FADE, 0, 1)
			elseif age > LEAF_LIFE then
				fade = math.clamp((age - LEAF_LIFE) / LEAF_FADE, 0, 1)
			end
			-- Drifted far away: dropped at once (at that distance it is a speck, if it is in view at all).
			local _condition = fade >= 1
			if not _condition then
				local _position = leaf.position
				local _focus = focus
				_condition = (_position - _focus).Magnitude > LEAF_SPAWN_MAX * 1.5
			end
			if _condition then
				leaf.part:Destroy()
				local _leaves = self.leaves
				local _i = i
				table.remove(_leaves, _i + 1)
				continue
			end
			-- Never fully opaque: a SpecialMesh only honours its texture's transparent background in the transparent
			-- render pass, and an opaque part draws that background black.
			leaf.part.Transparency = MIN_TRANSPARENCY + (1 - MIN_TRANSPARENCY) * fade
			if leaf.landed == nil then
				-- Carried by the air at its spot, each leaf a little lighter or heavier than the next.
				local _exp = self:flow(leaf.position, now, wind)
				local _arg0 = 0.85 + 0.3 * (math.noise(leaf.seed, age * 0.6) + 0.5)
				local carry = _exp * _arg0
				local sway = Vector3.new(math.noise(leaf.seed, age * 1.5, 3), 0, math.noise(leaf.seed, age * 1.5, 4)) * 2
				local bob = math.sin(age * 3.2 + leaf.seed) * 1.4 + math.noise(leaf.seed, age, 5) * 2
				local _exp_1 = carry + sway
				local _vector3 = Vector3.new(0, bob - leaf.sink, 0)
				local target = _exp_1 + _vector3
				leaf.velocity = leaf.velocity:Lerp(target, math.min(1, deltaTime * 2))
				local _position = leaf.position
				local _velocity = leaf.velocity
				local _deltaTime = deltaTime
				leaf.position = _position + (_velocity * _deltaTime)
				-- Tumbling faster the harder it is blown.
				local tumble = deltaTime * (1 + math.min(leaf.velocity.Magnitude / 10, 2))
				local _rotation = leaf.rotation
				local _arg0_1 = CFrame.Angles(leaf.spin.X * tumble, leaf.spin.Y * tumble, leaf.spin.Z * tumble)
				leaf.rotation = _rotation * _arg0_1
				if math.random() < 0.2 then
					local _condition_1 = self:ground(leaf.position)
					if _condition_1 == nil then
						_condition_1 = leaf.groundY
					end
					leaf.groundY = _condition_1
				end
				if leaf.position.Y <= leaf.groundY + 0.03 then
					leaf.landed = now
					leaf.position = Vector3.new(leaf.position.X, leaf.groundY + 0.03, leaf.position.Z)
					local _, yaw = leaf.rotation:ToOrientation()
					local _exp_2 = CFrame.Angles(0, yaw, 0)
					local _arg0_2 = CFrame.Angles(if math.random() < 0.5 then 0 else math.pi, 0, 0)
					leaf.rotation = _exp_2 * _arg0_2
				end
			end
			local _part = leaf.part
			table.insert(parts, _part)
			local _cFrame = CFrame.new(leaf.position)
			local _rotation = leaf.rotation
			table.insert(cframes, _cFrame * _rotation)
		end
		Workspace:BulkMoveTo(parts, cframes, Enum.BulkMoveMode.FireCFrameChanged)
	end
	function Leaves:destroy()
		self.folder:Destroy()
		table.clear(self.leaves)
	end
end
return {
	Leaves = Leaves,
}
