"""Turns the leaf photos in art/leaves/source/*.png into transparent textures in art/leaves/*.png, ready to upload
as Roblox images (the package's default leaves are those uploads; their ids are in src/Client/ClientConfig.ts).

    python tools/leaf_textures.py

Each photo is one leaf on pure white (generated with ComfyUI, Qwen Image 2.1). White becomes transparent, the
white fringe is taken back out of the edge colours, and the leaf is cropped, squared and shrunk.
"""

import glob
import os

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "art", "leaves")
SIZE = 256
MARGIN = 0.03

for path in sorted(glob.glob(os.path.join(ROOT, "source", "*.png"))):
    name = os.path.splitext(os.path.basename(path))[0]
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255

    # Distance from white decides opacity: near-white is clear, anything clearly coloured is solid.
    distance = (1 - rgb).max(axis=2)
    alpha = np.clip((distance - 0.05) / 0.15, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    # Undo the blend with the white background at the edge, so no pale halo is left.
    colour = np.clip((rgb - (1 - alpha[..., None])) / np.maximum(alpha, 1e-3)[..., None], 0, 1)

    ys, xs = np.nonzero(alpha > 0.05)
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    side = int(max(bottom - top, right - left) * (1 + 2 * MARGIN))
    cy, cx = (top + bottom) // 2, (left + right) // 2

    premultiplied = np.dstack([colour * alpha[..., None], alpha])
    canvas = np.zeros((side, side, 4), np.float32)
    y0, x0 = cy - side // 2, cx - side // 2
    sy0, sx0 = max(y0, 0), max(x0, 0)
    sy1, sx1 = min(y0 + side, premultiplied.shape[0]), min(x0 + side, premultiplied.shape[1])
    canvas[sy0 - y0 : sy1 - y0, sx0 - x0 : sx1 - x0] = premultiplied[sy0:sy1, sx0:sx1]

    channels = [np.asarray(Image.fromarray(canvas[..., c]).resize((SIZE, SIZE), Image.LANCZOS)) for c in range(4)]
    small = np.clip(np.dstack(channels), 0, 1)
    a = small[..., 3:4]
    small[..., :3] = np.where(a > 1e-3, small[..., :3] / np.maximum(a, 1e-3), 0)
    pixels = (np.clip(small, 0, 1) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(pixels, "RGBA").save(os.path.join(ROOT, name + ".png"))
    print(f"{name}.png: {SIZE}x{SIZE}")
