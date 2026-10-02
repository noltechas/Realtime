#!/usr/bin/env python3
"""Renders the Liquid Glass theme's phone wallpaper.

    python3 packages/mobile/scripts/generate-liquid-glass-assets.py

Liquid Glass only reads as glass over something vivid WITH SHAPE: a flat
gradient gives the panes nothing to bend. So the wallpaper is a deep night
field with large soft glows of colour (blue, violet, magenta, amber) and two
glossy ribbons of colour sweeping across it, each with a crisp edge and a
lit rim, so wherever a pane of glass sits there are edges for its rim to
refract. (The stage draws its own wallpaper live from the song's colours.)

Writes packages/mobile/assets/liquid-glass/wallpaper.jpg. Seeded and
reproducible. Needs numpy, scipy and Pillow.
"""

import math
import os

import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'liquid-glass')
os.makedirs(OUT, exist_ok=True)

W, H = 1080, 2340
SEED = 2025


def srgb_to_lin(c):
    c = np.asarray(c, np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def hexc(h):
    h = h.lstrip('#')
    return srgb_to_lin([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def main():
    rng = np.random.default_rng(SEED)
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    u, v = x / W, y / H
    # night field, a touch lighter up top
    img = hexc('#070A26')[None, None] * (1 - v[..., None]) + hexc('#0C1440')[None, None] * v[..., None]
    img = img * 1.0

    # soft glows of colour
    glows = [
        ('#2453FF', 0.18, 0.22, 0.55, 0.42, 1.0),
        ('#7B2FF7', 0.85, 0.30, 0.50, 0.40, 0.9),
        ('#FF3D8B', 0.70, 0.62, 0.45, 0.36, 0.85),
        ('#FF9A3C', 0.20, 0.80, 0.42, 0.30, 0.75),
        ('#13C6FF', 0.95, 0.88, 0.40, 0.30, 0.6),
        ('#5B3BFF', 0.40, 0.48, 0.38, 0.25, 0.5),
    ]
    for col, cx, cy, rx, ry, k in glows:
        g = np.exp(-(((u - cx) / rx) ** 2 + ((v - cy) / (ry * W / H * 2.2)) ** 2) * 1.6)
        img += hexc(col)[None, None] * (g * k * 0.42)[..., None]

    # two glossy ribbons sweeping across, each with a crisp edge and a lit rim
    def ribbon(c0, c1, y0, amp, freq, phase, width, tilt):
        centre = y0 + amp * np.sin(u * freq * math.pi * 2 + phase) + tilt * (u - 0.5)
        d = (v - centre) * H  # px from the ribbon's centre line
        half = width / 2
        inside = np.clip(half - np.abs(d) + 0.5, 0, 1)
        t = np.clip((d + half) / width, 0, 1)
        col = c0[None, None] * (1 - t[..., None]) + c1[None, None] * t[..., None]
        # rounded body: brighter along its crest
        body = np.sqrt(np.clip(1 - (d / half) ** 2, 0, 1))
        rim_top = np.exp(-((d + half - 6) / 5) ** 2) * 0.9
        rim_bot = np.exp(-((d - half + 4) / 4) ** 2) * 0.25
        return inside, col * (0.16 + 0.5 * body[..., None]) + (rim_top + rim_bot)[..., None] * 0.5

    for c0, c1, y0, amp, freq, phase, width, tilt in [
        (hexc('#3A7BFF'), hexc('#B14BFF'), 0.36, 0.05, 0.6, 0.4, 260, -0.08),
        (hexc('#FF4F9A'), hexc('#FFB04A'), 0.66, 0.06, 0.5, 2.2, 210, 0.1),
    ]:
        a, c = ribbon(c0, c1, y0, amp, freq, phase, width, tilt)
        # a soft shadow under the ribbon
        sh = nd.gaussian_filter(a, 28) * 0.45
        img = img * (1 - sh[..., None] * 0.5)
        img = img * (1 - a[..., None]) + c * a[..., None]

    # vignette and a whisper of grain
    vig = np.clip(1.1 - np.hypot((u - 0.5) * 1.2, (v - 0.45) * 0.9), 0.45, 1)
    img *= vig[..., None]
    img += (rng.random((H, W, 1)).astype(np.float32) - 0.5) * 0.006
    out = Image.fromarray((lin_to_srgb(img) * 255).astype(np.uint8))
    out.save(os.path.join(OUT, 'wallpaper.jpg'), quality=86, optimize=True)
    print('wrote wallpaper.jpg', out.size)


if __name__ == '__main__':
    main()
