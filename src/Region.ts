// Where a zone's weather applies. A part is read for its CFrame and Size (and followed while it moves);
// it is never required to replicate or to stream in.
export type WeatherRegion = BasePart | { cframe: CFrame; size: Vector3 } | { position: Vector3; radius: number };

export type RegionShape =
	{ kind: "box"; cframe: CFrame; size: Vector3 } | { kind: "sphere"; position: Vector3; radius: number };

export function shapeOf(region: WeatherRegion): RegionShape {
	if (typeIs(region, "Instance")) return { kind: "box", cframe: region.CFrame, size: region.Size };
	if ("radius" in region) return { kind: "sphere", position: region.position, radius: region.radius };
	return { kind: "box", cframe: region.cframe, size: region.size };
}

// Studs from the point to the region; 0 inside.
export function distanceOutside(shape: RegionShape, point: Vector3): number {
	if (shape.kind === "sphere") return math.max(0, point.sub(shape.position).Magnitude - shape.radius);
	const ofs = shape.cframe.PointToObjectSpace(point);
	const half = shape.size.div(2);
	return new Vector3(
		math.max(math.abs(ofs.X) - half.X, 0),
		math.max(math.abs(ofs.Y) - half.Y, 0),
		math.max(math.abs(ofs.Z) - half.Z, 0),
	).Magnitude;
}

// How much of the zone's weather applies at the point: 1 inside, easing to 0 over `blend` studs outside.
export function regionWeight(shape: RegionShape, blend: number, point: Vector3): number {
	const distance = distanceOutside(shape, point);
	if (distance <= 0) return 1;
	if (blend <= 0) return 0;
	const t = math.clamp(1 - distance / blend, 0, 1);
	return t * t * (3 - 2 * t);
}
