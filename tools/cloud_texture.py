"""Turns art/clouds/source/storm-clouds.png (a ComfyUI photo looking up into storm clouds) into
art/clouds/storm-clouds.png: seamlessly tileable, 1024x1024, with thin lighter patches a little see-through.
Uploaded as an image; its id is in src/Client/ClientConfig.ts.

    python tools/cloud_texture.py
"""

import os

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "art", "clouds")
SIZE = 1024

image = Image.open(os.path.join(ROOT, "source", "storm-clouds.png")).convert("L").resize((SIZE, SIZE), Image.LANCZOS)
lum = np.asarray(image).astype(np.float32) / 255

# Seamless, one axis at a time: blend with a copy shifted by half along that axis. The weight favours the
# original in the middle and the shifted copy (whose middle is the original's wrapped edges) towards the
# edges, so opposite edges match. The shifted copy's own seam sits in the middle, where its weight is zero.
ramp = np.abs(np.linspace(-1, 1, SIZE))
weight = np.clip((ramp - 0.5) / 0.45, 0, 1)
weight = weight * weight * (3 - 2 * weight)
across = np.roll(lum, SIZE // 2, axis=1)
tiled = lum * (1 - weight[None, :]) + across * weight[None, :]
down = np.roll(tiled, SIZE // 2, axis=0)
tiled = tiled * (1 - weight[:, None]) + down * weight[:, None]

# Stretch the contrast a little, then: dense dark cloud is nearly opaque, the lighter thin patches let some sky
# through.
low, high = np.percentile(tiled, 2), np.percentile(tiled, 98)
norm = np.clip((tiled - low) / (high - low), 0, 1)
alpha = 0.97 - 0.32 * norm**1.5
grey = 0.25 + 0.6 * norm
rgba = np.dstack([grey, grey, grey * 1.04, alpha])
Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(ROOT, "storm-clouds.png"))
print("storm-clouds.png")
