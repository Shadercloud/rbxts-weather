import { DEFAULT_BLEND } from "./config";
import { WeatherControl } from "./Control";
import { WeatherRegion, shapeOf } from "./Region";
import { getOwnRoot, getZonesFolder, writeShape } from "./State";

export interface WeatherZoneOptions {
	/** Studs outside the region over which its weather fades out. Default 40. */
	blend?: number;
	/** Where zones overlap, higher priority is applied over lower. Default 0. */
	priority?: number;
	/** Name of the zone's folder, for finding it in the explorer. Default "Zone". */
	name?: string;
}

/**
 * Weather of its own inside a region, blending into the surrounding weather at its edge. A zone has no
 * effect until its weather is set: `Weather.zone(marsh).fog()`.
 */
export class WeatherZone extends WeatherControl {
	private readonly folder: Folder;
	private readonly onChanged?: () => void;
	private regionConnections = new Array<RBXScriptConnection>();
	private destroyed = false;

	/** @hidden Use `Weather.zone(region, options)`. */
	constructor(region: WeatherRegion, options: WeatherZoneOptions = {}, onChanged?: () => void) {
		super();
		this.onChanged = onChanged;
		this.folder = new Instance("Folder");
		this.folder.Name = options.name ?? "Zone";
		this.folder.SetAttribute("blend", math.max(0, options.blend ?? DEFAULT_BLEND));
		this.folder.SetAttribute("priority", options.priority ?? 0);
		this.setRegion(region);
		this.folder.Parent = getZonesFolder(getOwnRoot());
	}

	protected holder(): Instance {
		return this.folder;
	}

	protected changed() {
		this.onChanged?.();
	}

	/** Move or resize the zone. A part is followed as it moves until the region is changed again. */
	setRegion(region: WeatherRegion): this {
		if (this.destroyed) return this;
		for (const connection of this.regionConnections) connection.Disconnect();
		this.regionConnections = [];
		writeShape(this.folder, shapeOf(region));
		if (typeIs(region, "Instance")) {
			const update = () => writeShape(this.folder, shapeOf(region));
			this.regionConnections.push(region.GetPropertyChangedSignal("CFrame").Connect(update));
			this.regionConnections.push(region.GetPropertyChangedSignal("Size").Connect(update));
		}
		return this;
	}

	setBlend(blend: number): this {
		if (!this.destroyed) this.folder.SetAttribute("blend", math.max(0, blend));
		return this;
	}

	setPriority(priority: number): this {
		if (!this.destroyed) this.folder.SetAttribute("priority", priority);
		return this;
	}

	/** Remove the zone at once. To fade it out first, set it to the surrounding weather and destroy it later. */
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		for (const connection of this.regionConnections) connection.Disconnect();
		this.regionConnections = [];
		this.folder.Destroy();
	}
}
