export type WeatherRegion = BasePart | {
    cframe: CFrame;
    size: Vector3;
} | {
    position: Vector3;
    radius: number;
};
export type RegionShape = {
    kind: "box";
    cframe: CFrame;
    size: Vector3;
} | {
    kind: "sphere";
    position: Vector3;
    radius: number;
};
export declare function shapeOf(region: WeatherRegion): RegionShape;
export declare function distanceOutside(shape: RegionShape, point: Vector3): number;
export declare function regionWeight(shape: RegionShape, blend: number, point: Vector3): number;
