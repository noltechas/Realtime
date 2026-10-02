#!/usr/bin/env python3
"""Generates the space theme's ("Golden Record") image assets for the phone.

    python3 packages/mobile/scripts/generate-space-assets.py

Writes into packages/mobile/assets/space/:

  deep-field.jpg    the sky behind every screen, portrait: the void, a diagonal
                    Milky Way with dust lanes, a faint emission nebula in
                    hydrogen rose and oxygen teal, and stars in their true
                    colours, few bright and many faint (the same construction
                    as the desktop stage's DeepField shader)
  record-disc.png   the gold record without its label: satin anodized gold,
                    fine concentric grooves with three track gaps, a rim bevel
  record-sheen.png  the lamp's bowtie of light across the grooves, alone, so it
                    can stay still while the record turns
  static.png        radio static, tiling, for a label that can't be read yet

Everything is procedural and seeded, so the output is reproducible; the script
is committed rather than only its binaries. Needs numpy and Pillow.
"""

import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'space')
os.makedirs(OUT, exist_ok=True)

rng = np.random.default_rng(1977)  # the year both Voyagers launched


# ── noise ────────────────────────────────────────────────────────────────────

def value_noise(w, h, scale, seed):
    """Smooth value noise on a w×h grid; `scale` is lattice cells across h."""
    r = np.random.default_rng(seed)
    gx = int(np.ceil(w / h * scale)) + 2
    gy = int(np.ceil(scale)) + 2
    lat = r.random((gy, gx)).astype(np.float32)
    ys = np.linspace(0, scale, h, endpoint=False, dtype=np.float32)
    xs = np.linspace(0, w / h * scale, w, endpoint=False, dtype=np.float32)
    x0 = np.floor(xs).astype(int)
    y0 = np.floor(ys).astype(int)
    fx = xs - x0
    fy = ys - y0
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    a = lat[y0][:, x0]
    b = lat[y0][:, x0 + 1]
    c = lat[y0 + 1][:, x0]
    d = lat[y0 + 1][:, x0 + 1]
    top = a + (b - a) * fx[None, :]
    bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]


def fbm(w, h, scale, seed, octaves=5):
    out = np.zeros((h, w), np.float32)
    amp = 0.5
    for o in range(octaves):
        out += amp * value_noise(w, h, scale * (2.03 ** o), seed + o * 101)
        amp *= 0.5
    return out


def ridged(w, h, scale, seed, octaves=4):
    out = np.zeros((h, w), np.float32)
    amp = 0.5
    for o in range(octaves):
        n = value_noise(w, h, scale * (2.07 ** o), seed + o * 131)
        out += amp * (1 - np.abs(n * 2 - 1))
        amp *= 0.5
    return out


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ── the sky ──────────────────────────────────────────────────────────────────

def star_color(t):
    """0..1 temperature → RGB: orange dwarfs, yellow-white, white, blue-white."""
    stops = [
        (0.0, (1.0, 0.68, 0.48)),
        (0.12, (1.0, 0.84, 0.66)),
        (0.45, (1.0, 0.96, 0.88)),
        (0.85, (0.86, 0.91, 1.0)),
        (1.0, (0.66, 0.78, 1.0)),
    ]
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if t <= b:
            k = (t - a) / (b - a)
            return tuple(ca[i] + (cb[i] - ca[i]) * k for i in range(3))
    return stops[-1][1]


def deep_field(w=1080, h=2340):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # sky units: height = 1, origin at the centre
    px = (xx - w / 2) / h
    py = (h / 2 - yy) / h
    col = np.zeros((h, w, 3), np.float32)

    # 1. the void, with the faintest large-scale glow
    glow = fbm(w, h, 1.4, 3)
    col += np.stack([0.006 + 0.012 * glow, 0.008 + 0.014 * glow, 0.02 + 0.03 * glow], -1)

    # 2. the Milky Way, steep across the portrait frame
    bd = np.array([0.42, 1.0]); bd /= np.linalg.norm(bd)
    bn = np.array([-bd[1], bd[0]])
    along = px * bd[0] + py * bd[1]
    across = (px - 0.03) * bn[0] + (py + 0.05) * bn[1]
    wander = fbm(w, h, 1.2, 7, 3)
    width = 0.16 + 0.07 * wander
    band = np.exp(-(across ** 2) / (width ** 2))
    core = np.exp(-(across ** 2) / (width ** 2 * 0.28))
    clouds = fbm(w, h, 5.5, 11)
    dust = smoothstep(0.5, 0.78, ridged(w, h, 9.0, 17)) * np.exp(-(across ** 2) / (width ** 2 * 0.45))
    mw_cool = np.array([0.42, 0.5, 0.78]); mw_warm = np.array([1.0, 0.84, 0.66])
    mw_col = mw_cool[None, None, :] * (1 - core[..., None]) + mw_warm[None, None, :] * core[..., None]
    mw = band * (0.25 + 0.75 * clouds ** 2)
    col += mw_col * (mw * 0.32 * (1 - dust * 0.94))[..., None]

    # 3. an emission nebula, low on the left
    qx = px + 0.18
    qy = py + 0.27
    r2 = qx ** 2 + qy ** 2
    warp = fbm(w, h, 2.6, 23)
    nf = fbm(w, h, 3.4, 29) * 0.7 + warp * 0.3
    neb = smoothstep(0.32, 0.82, nf) * np.exp(-r2 * 7.0)
    fil = ridged(w, h, 6.0, 31) ** 2.6 * np.exp(-r2 * 9.0)
    pillar = smoothstep(0.55, 0.8, fbm(w, h, 4.0, 37))
    neb *= 1 - pillar * 0.85
    fil *= 1 - pillar * 0.7
    mixk = smoothstep(0.32, 0.72, fbm(w, h, 4.2, 41))
    h_alpha = np.array([0.88, 0.32, 0.42]); o3 = np.array([0.3, 0.78, 0.76])
    neb_col = h_alpha[None, None, :] * (1 - mixk[..., None]) + o3[None, None, :] * mixk[..., None]
    col += neb_col * (neb * 0.5 + fil * 0.34)[..., None]

    # 4. stars, splatted as tiny gaussians, denser in the band, hidden by dust
    density = 0.25 + 1.4 * band * (1 - dust)
    stars = np.zeros_like(col)

    def splat(n, sigma, bright, seed):
        r = np.random.default_rng(seed)
        xs = r.random(n * 3) * w
        ys = r.random(n * 3) * h
        keep = r.random(n * 3) < density[ys.astype(int), xs.astype(int)] / 1.65
        xs, ys = xs[keep][:n], ys[keep][:n]
        mags = r.random(len(xs)) ** 7
        temps = r.random(len(xs))
        rad = int(np.ceil(sigma * 3.5))
        for x, y, m, t in zip(xs, ys, mags, temps):
            s = sigma * (0.7 + m * 1.6)
            b = bright * (0.18 + m * 1.9)
            cx, cy = int(x), int(y)
            x0, x1 = max(0, cx - rad), min(w, cx + rad + 1)
            y0, y1 = max(0, cy - rad), min(h, cy + rad + 1)
            gy, gx = np.mgrid[y0:y1, x0:x1]
            g = np.exp(-((gx - x) ** 2 + (gy - y) ** 2) / (2 * s * s)) * b
            c = star_color(t)
            stars[y0:y1, x0:x1, 0] += g * c[0]
            stars[y0:y1, x0:x1, 1] += g * c[1]
            stars[y0:y1, x0:x1, 2] += g * c[2]

    splat(14000, 0.55, 0.55, 101)   # the faint multitude
    splat(2600, 0.75, 0.8, 202)     # middling
    splat(420, 1.05, 1.0, 303)      # the bright few
    col += stars * (1 - dust * 0.85)[..., None]

    # finish: a soft vignette and the tooth of a long exposure
    vig = smoothstep(0.55, 1.25, np.sqrt((px * 1.15) ** 2 + (py * 0.8) ** 2) * 2)
    col *= (1 - vig * 0.5)[..., None]
    col += (rng.random((h, w, 1)).astype(np.float32) - 0.5) * 0.012
    img = (np.clip(col, 0, 1) ** (1 / 1.0) * 255).astype(np.uint8)
    Image.fromarray(img).save(os.path.join(OUT, 'deep-field.jpg'), quality=86, optimize=True, progressive=True)


# ── the record ───────────────────────────────────────────────────────────────

def record(size=480):
    c = (size - 1) / 2
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    dx, dy = xx - c, yy - c
    r = np.sqrt(dx * dx + dy * dy) / c  # 0..1 at the rim
    ang = np.arctan2(dy, dx)
    inside = smoothstep(1.0, 0.994, r)

    # satin gold, darker at the hub and the rim, with a top-left key light
    base = np.array([0.9, 0.72, 0.36])
    shade = 1.0 - 0.28 * smoothstep(0.6, 1.0, r) - 0.25 * smoothstep(0.32, 0.0, r)
    key = 0.16 * np.exp(-(((xx / size) - 0.3) ** 2 + ((yy / size) - 0.24) ** 2) / 0.09) - 0.1 * ((xx + yy) / (2 * size))
    gold = base[None, None, :] * (shade + key)[..., None]

    # fine grooves from 0.36 out to the rim, three narrow smooth track gaps
    groove = np.sin(r * 2 * np.pi * 120) * 0.5 + 0.5
    zone = smoothstep(0.36, 0.38, r) * smoothstep(0.965, 0.95, r)
    for g in (0.52, 0.67, 0.82):
        zone *= 1 - np.exp(-((r - g) ** 2) / (2 * 0.0035 ** 2))
    gold *= (1 - zone * (groove * 0.16))[..., None]
    gold += (zone * (1 - groove) * 0.05)[..., None]

    # the rim bevel: bright above, dark beneath
    bevel = np.exp(-((r - 0.985) ** 2) / (2 * 0.004 ** 2))
    gold += (bevel * 0.25 * (0.5 - 0.5 * np.sin(ang)))[..., None]
    gold *= (1 - 0.35 * np.exp(-((r - 0.968) ** 2) / (2 * 0.003 ** 2)))[..., None]

    rgba = np.zeros((size, size, 4), np.float32)
    rgba[..., :3] = np.clip(gold, 0, 1)
    rgba[..., 3] = inside
    Image.fromarray((rgba * 255).astype(np.uint8)).save(os.path.join(OUT, 'record-disc.png'), optimize=True)

    # the sheen: a bowtie of light (hot core inside a broad soft fan) and a
    # fainter dark pair across it, only over the grooves
    def lobe(a0, width):
        d = np.angle(np.exp(1j * (ang - a0)))
        return np.exp(-(d ** 2) / (2 * width ** 2))
    light = 0.55 * (lobe(-2.3, 0.22) + 0.75 * lobe(0.84, 0.22)) + 0.5 * (lobe(-2.3, 0.07) + 0.7 * lobe(0.84, 0.07))
    dark = 0.3 * (lobe(-0.75, 0.3) + lobe(2.4, 0.3))
    ring = smoothstep(0.37, 0.42, r) * smoothstep(0.97, 0.93, r)
    sheen = np.zeros((size, size, 4), np.float32)
    lit = np.clip(light * ring, 0, 1)
    dk = np.clip(dark * ring, 0, 1)
    sheen[..., 0] = 1.0 * lit / np.maximum(lit + dk, 1e-4) + 0.16 * dk / np.maximum(lit + dk, 1e-4)
    sheen[..., 1] = 0.97 * lit / np.maximum(lit + dk, 1e-4) + 0.11 * dk / np.maximum(lit + dk, 1e-4)
    sheen[..., 2] = 0.86 * lit / np.maximum(lit + dk, 1e-4) + 0.02 * dk / np.maximum(lit + dk, 1e-4)
    sheen[..., 3] = np.clip(lit * 0.9 + dk * 0.8, 0, 1)
    Image.fromarray((np.clip(sheen, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, 'record-sheen.png'), optimize=True)


def static_tile(size=128):
    n = rng.random((size, size)).astype(np.float32)
    n = np.array(Image.fromarray((n * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.4))) / 255.0
    n = np.clip((n - 0.35) * 1.8, 0, 1)
    rgb = np.stack([0.02 + n * 0.9, 0.025 + n * 0.84, 0.03 + n * 0.7], -1)
    Image.fromarray((rgb * 255).astype(np.uint8)).save(os.path.join(OUT, 'static.png'), optimize=True)


if __name__ == '__main__':
    deep_field()
    record()
    static_tile()
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB')
