import { DEFAULT_BLEND, ROOT_NAME, ZONES_NAME } from "./config";
import { PARAM_KEYS, PRESETS, WeatherParams, copyParams, lerpParams } from "./Params";
import { RegionShape, regionWeight } from "./Region";

// A weather blending from one look to another, timed on the server clock so every client agrees.
export interface Transition {
	from: WeatherParams;
	to: WeatherParams;
	start: number;
	duration: number;
}

export function clock(): number {
	return game.GetService("Workspace").GetServerTimeNow();
}

export function sampleTransition(transition: Transition, now: number): WeatherParams {
	if (transition.duration <= 0) return copyParams(transition.to);
	const t = math.clamp((now - transition.start) / transition.duration, 0, 1);
	return lerpParams(transition.from, transition.to, t * t * (3 - 2 * t));
}

// Attributes ----------------------------------------------------------------------------------------------
// A transition is stored as attributes: `to_<field>`, `from_<field>`, `start`, `duration`. Zones add
// `shape`, `cframe`, `size`, `position`, `radius`, `blend`, `priority`.

function readParams(instance: Instance, prefix: string): WeatherParams {
	const result = copyParams(PRESETS.clear);
	const fields = result as unknown as Record<string, unknown>;
	for (const key of PARAM_KEYS) {
		const value = instance.GetAttribute(prefix + key);
		if (typeOf(value) === typeOf(fields[key])) fields[key] = value;
	}
	return result;
}

function writeParams(instance: Instance, prefix: string, params: WeatherParams) {
	const fields = params as unknown as Record<string, AttributeValue>;
	for (const key of PARAM_KEYS) instance.SetAttribute(prefix + key, fields[key]);
}

export function writeTransition(instance: Instance, transition: Transition) {
	writeParams(instance, "from_", transition.from);
	writeParams(instance, "to_", transition.to);
	instance.SetAttribute("start", transition.start);
	// Written last: readers treat an instance without a duration as having no weather.
	instance.SetAttribute("duration", transition.duration);
}

export function readTransition(instance: Instance): Transition | undefined {
	const duration = instance.GetAttribute("duration");
	const start = instance.GetAttribute("start");
	if (!typeIs(duration, "number") || !typeIs(start, "number")) return undefined;
	return { from: readParams(instance, "from_"), to: readParams(instance, "to_"), start, duration };
}

export function clearTransition(instance: Instance) {
	instance.SetAttribute("duration", undefined);
	instance.SetAttribute("start", undefined);
	for (const key of PARAM_KEYS) {
		instance.SetAttribute("from_" + key, undefined);
		instance.SetAttribute("to_" + key, undefined);
	}
}

export function writeShape(instance: Instance, shape: RegionShape) {
	instance.SetAttribute("shape", shape.kind);
	if (shape.kind === "box") {
		instance.SetAttribute("cframe", shape.cframe);
		instance.SetAttribute("size", shape.size);
	} else {
		instance.SetAttribute("position", shape.position);
		instance.SetAttribute("radius", shape.radius);
	}
}

function readShape(instance: Instance): RegionShape | undefined {
	const kind = instance.GetAttribute("shape");
	if (kind === "box") {
		const cframe = instance.GetAttribute("cframe");
		const size = instance.GetAttribute("size");
		if (typeIs(cframe, "CFrame") && typeIs(size, "Vector3")) return { kind, cframe, size };
	} else if (kind === "sphere") {
		const position = instance.GetAttribute("position");
		const radius = instance.GetAttribute("radius");
		if (typeIs(position, "Vector3") && typeIs(radius, "number")) return { kind, position, radius };
	}
	return undefined;
}

// Roots ---------------------------------------------------------------------------------------------------
// The server writes into a folder in ReplicatedStorage. A client writes into a folder of its own that is
// never parented: local weather that overrides the server's for that player only.

const isServer = game.GetService("RunService").IsServer();
let ownRoot: Folder | undefined;

export function getOwnRoot(): Folder {
	if (ownRoot) return ownRoot;
	const replicatedStorage = game.GetService("ReplicatedStorage");
	const existing = isServer ? replicatedStorage.FindFirstChild(ROOT_NAME) : undefined;
	if (existing && existing.IsA("Folder")) {
		ownRoot = existing;
	} else {
		ownRoot = new Instance("Folder");
		ownRoot.Name = ROOT_NAME;
		if (isServer) ownRoot.Parent = replicatedStorage;
	}
	return ownRoot;
}

function getServerRoot(): Instance | undefined {
	return isServer ? undefined : game.GetService("ReplicatedStorage").FindFirstChild(ROOT_NAME);
}

export function getZonesFolder(root: Instance): Folder {
	const existing = root.FindFirstChild(ZONES_NAME);
	if (existing && existing.IsA("Folder")) return existing;
	const folder = new Instance("Folder");
	folder.Name = ZONES_NAME;
	folder.Parent = root;
	return folder;
}

// Cached reads --------------------------------------------------------------------------------------------
// Reading some 25 attributes per instance every frame would add up, so each instance is parsed once and
// again only after one of its attributes changes.

interface ZoneData {
	transition?: Transition;
	shape?: RegionShape;
	blend: number;
	priority: number;
}

interface CacheEntry {
	dirty: boolean;
	data: ZoneData;
	connection: RBXScriptConnection;
}

const cache = new Map<Instance, CacheEntry>();

function read(instance: Instance): ZoneData {
	let entry = cache.get(instance);
	if (!entry) {
		const created: CacheEntry = {
			dirty: true,
			data: { blend: DEFAULT_BLEND, priority: 0 },
			connection: instance.AttributeChanged.Connect(() => (created.dirty = true)),
		};
		entry = created;
		cache.set(instance, entry);
	}
	if (entry.dirty) {
		entry.dirty = false;
		const blend = instance.GetAttribute("blend");
		const priority = instance.GetAttribute("priority");
		entry.data = {
			transition: readTransition(instance),
			shape: readShape(instance),
			blend: typeIs(blend, "number") ? blend : DEFAULT_BLEND,
			priority: typeIs(priority, "number") ? priority : 0,
		};
	}
	return entry.data;
}

// Drops cached zones that were destroyed. The roots are kept: a client's own root is never parented.
export function sweepCache() {
	for (const [instance, entry] of cache) {
		if (instance.Parent === undefined && instance !== ownRoot) {
			entry.connection.Disconnect();
			cache.delete(instance);
		}
	}
}

// Evaluation ----------------------------------------------------------------------------------------------

// The weather everywhere, ignoring zones: this side's own if it has set one, else the server's, else clear.
export function evaluateGlobal(now: number): WeatherParams {
	const own = read(getOwnRoot()).transition;
	if (own) return sampleTransition(own, now);
	const serverRoot = getServerRoot();
	const server = serverRoot && read(serverRoot).transition;
	return server ? sampleTransition(server, now) : copyParams(PRESETS.clear);
}

// The weather at a point: the global weather with every zone around the point blended over it, lowest
// priority first. On a client, both the server's zones and its own count.
export function evaluateAt(position: Vector3, now: number): WeatherParams {
	let params = evaluateGlobal(now);
	const zones = new Array<ZoneData & { order: number }>();
	for (const root of [getServerRoot(), getOwnRoot()]) {
		const folder = root?.FindFirstChild(ZONES_NAME);
		if (!folder) continue;
		for (const child of folder.GetChildren()) {
			const data = read(child);
			if (data.transition && data.shape) zones.push({ ...data, order: zones.size() });
		}
	}
	zones.sort((a, b) => (a.priority !== b.priority ? a.priority < b.priority : a.order < b.order));
	for (const zone of zones) {
		const weight = regionWeight(zone.shape!, zone.blend, position);
		if (weight > 0) params = lerpParams(params, sampleTransition(zone.transition!, now), weight);
	}
	return params;
}
