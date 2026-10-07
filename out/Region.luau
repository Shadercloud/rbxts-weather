-- Compiled with roblox-ts v3.0.0
-- Where a zone's weather applies. A part is read for its CFrame and Size (and followed while it moves);
-- it is never required to replicate or to stream in.
local function shapeOf(region)
	local _region = region
	if typeof(_region) == "Instance" then
		return {
			kind = "box",
			cframe = region.CFrame,
			size = region.Size,
		}
	end
	if region.radius ~= nil then
		return {
			kind = "sphere",
			position = region.position,
			radius = region.radius,
		}
	end
	return {
		kind = "box",
		cframe = region.cframe,
		size = region.size,
	}
end
-- Studs from the point to the region; 0 inside.
local function distanceOutside(shape, point)
	if shape.kind == "sphere" then
		local _point = point
		local _position = shape.position
		return math.max(0, (_point - _position).Magnitude - shape.radius)
	end
	local ofs = shape.cframe:PointToObjectSpace(point)
	local half = shape.size / 2
	return Vector3.new(math.max(math.abs(ofs.X) - half.X, 0), math.max(math.abs(ofs.Y) - half.Y, 0), math.max(math.abs(ofs.Z) - half.Z, 0)).Magnitude
end
-- How much of the zone's weather applies at the point: 1 inside, easing to 0 over `blend` studs outside.
local function regionWeight(shape, blend, point)
	local distance = distanceOutside(shape, point)
	if distance <= 0 then
		return 1
	end
	if blend <= 0 then
		return 0
	end
	local t = math.clamp(1 - distance / blend, 0, 1)
	return t * t * (3 - 2 * t)
end
return {
	shapeOf = shapeOf,
	distanceOutside = distanceOutside,
	regionWeight = regionWeight,
}
