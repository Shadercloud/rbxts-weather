"""Writes the leaf meshes, art/leaves/meshes/*.gltf: a square card, one unit across in X and Z, bent like a real
leaf, textured over its whole face (UV 0-1) and two-sided (separate back faces, so both sides are lit).

    python tools/leaf_meshes.py

Uploaded as models; the mesh ids inside them are in src/Client/ClientConfig.ts. Each leaf is drawn with a
SpecialMesh of one of these and one of the leaf pictures as its texture, so every shape works with every
picture.
"""

import base64
import json
import math
import os
import struct

OUT = os.path.join(os.path.dirname(__file__), "..", "art", "leaves", "meshes")
STEPS = 8


# Height of the surface at (x, z), both in -0.5..0.5 (z runs from stem to tip).
def cupped(x, z):
    # Folded down either side of the midrib, the tip and stem dipping a little.
    return -0.16 * abs(x) * 2 - 0.05 * (z * 2) ** 2


def curled(x, z):
    # Rolled along its length, the tip curling up, edges folded down.
    return 0.22 * (z + 0.5) ** 2 - 0.1 * abs(x) * 2 - 0.05


def twisted(x, z):
    # One side lifted towards the tip, the other dropped: a leaf twisted about its midrib.
    return 0.28 * x * (z + 0.5) - 0.08 * abs(x) * 2


SHAPES = {"cupped": cupped, "curled": curled, "twisted": twisted}


def build(height):
    positions, normals, uvs, indices = [], [], [], []

    def point(i, j):
        x, z = i / STEPS - 0.5, j / STEPS - 0.5
        return x, height(x, z), z

    def normal(i, j):
        e = 1e-3
        x, z = i / STEPS - 0.5, j / STEPS - 0.5
        dx = (height(x + e, z) - height(x - e, z)) / (2 * e)
        dz = (height(x, z + e) - height(x, z - e)) / (2 * e)
        n = (-dx, 1.0, -dz)
        length = math.sqrt(sum(c * c for c in n))
        return tuple(c / length for c in n)

    for side in (1, -1):
        base = len(positions)
        for i in range(STEPS + 1):
            for j in range(STEPS + 1):
                positions.append(point(i, j))
                n = normal(i, j)
                normals.append(tuple(c * side for c in n))
                # Picture's top (v = 0) at the tip, so the stem is at z = -0.5.
                uvs.append((i / STEPS, 1 - j / STEPS))
        for i in range(STEPS):
            for j in range(STEPS):
                a = base + i * (STEPS + 1) + j
                b = a + STEPS + 1
                c, d = b + 1, a + 1
                indices += [a, d, c, a, c, b] if side == 1 else [a, c, d, a, b, c]
    return positions, normals, uvs, indices


def gltf(name, positions, normals, uvs, indices):
    data = b"".join(struct.pack("<3f", *p) for p in positions)
    data += b"".join(struct.pack("<3f", *n) for n in normals)
    data += b"".join(struct.pack("<2f", *t) for t in uvs)
    index_offset = len(data)
    data += b"".join(struct.pack("<H", i) for i in indices)
    count = len(positions)
    xs, ys, zs = zip(*positions)
    return {
        "asset": {"version": "2.0", "generator": "rbxts-weather tools/leaf_meshes.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": name}],
        "meshes": [{"name": name, "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2}, "indices": 3}]}],
        "buffers": [{"byteLength": len(data), "uri": "data:application/octet-stream;base64," + base64.b64encode(data).decode()}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": count * 12, "target": 34962},
            {"buffer": 0, "byteOffset": count * 12, "byteLength": count * 12, "target": 34962},
            {"buffer": 0, "byteOffset": count * 24, "byteLength": count * 8, "target": 34962},
            {"buffer": 0, "byteOffset": index_offset, "byteLength": len(indices) * 2, "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": count, "type": "VEC3",
             "min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]},
            {"bufferView": 1, "componentType": 5126, "count": count, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5126, "count": count, "type": "VEC2"},
            {"bufferView": 3, "componentType": 5123, "count": len(indices), "type": "SCALAR"},
        ],
    }


os.makedirs(OUT, exist_ok=True)
for name, height in SHAPES.items():
    document = gltf(f"Leaf-{name}", *build(height))
    with open(os.path.join(OUT, f"{name}.gltf"), "w", encoding="utf8", newline="\n") as f:
        json.dump(document, f)
    print(f"{name}.gltf")
