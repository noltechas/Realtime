#!/usr/bin/env python3
"""Renders the steampunk theme's ("The Vox Engine") machine parts.

    python3 packages/mobile/scripts/generate-steampunk-assets.py

The steampunk theme is a brass steam engine that runs on the singers' voices:
its gears mesh and turn, its gauges read the room, its pipes vent steam. Every
metal part is RENDERED here rather than drawn as flat vectors, which is what
made earlier versions look cheap: each part is built as a height map (teeth,
rims, spokes, bosses, rivets), turned into normals, and lit like real metal
(a key light from the upper left, the bright ceiling of a workshop reflected
in upward-facing bevels, a tight specular), with grime and verdigris settling
into the recesses, polished wear on the edges, and fine scratches.

Writes the same set twice: full size for the desktop stage
(packages/desktop/src/renderer/src/assets/steampunk/) and half size for the
phone (packages/mobile/assets/steampunk/, at three quarters), plus manifest.json in each with
every gear's tooth count and pitch radius so the apps can mesh them exactly.

Everything is procedural and seeded, so the output is reproducible; the script
is committed rather than only its binaries. Needs numpy, scipy and Pillow.
"""

import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
MOBILE = os.path.join(HERE, '..', 'assets', 'steampunk')
DESKTOP = os.path.join(HERE, '..', '..', 'desktop', 'src', 'renderer', 'src', 'assets', 'steampunk')
FONTS = os.path.join(HERE, '..', '..', '..', 'node_modules', '@expo-google-fonts')
for d in (MOBILE, DESKTOP):
    os.makedirs(d, exist_ok=True)

SEED = 1851  # the year of the Great Exhibition
SS = 3       # supersampling for every rendered part

MANIFEST = {'gears': {}}


# ── noise ────────────────────────────────────────────────────────────────────

def value_noise(w, h, sx, sy, seed):
    r = np.random.default_rng(seed)
    gx = int(np.ceil(sx)) + 2
    gy = int(np.ceil(sy)) + 2
    lat = r.random((gy, gx)).astype(np.float32)
    xs = np.linspace(0, sx, w, endpoint=False, dtype=np.float32)
    ys = np.linspace(0, sy, h, endpoint=False, dtype=np.float32)
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


def fbm(w, h, sx, sy, seed, octaves=5):
    out = np.zeros((h, w), np.float32)
    amp = 0.5
    total = 0.0
    for o in range(octaves):
        out += amp * value_noise(w, h, sx * 2 ** o, sy * 2 ** o, seed + o * 101)
        total += amp
        amp *= 0.5
    return out / total


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# ── metal ────────────────────────────────────────────────────────────────────

METALS = {
    'brass': np.array([0.82, 0.62, 0.3], np.float32),
    'copper': np.array([0.74, 0.40, 0.23], np.float32),
    'bronze': np.array([0.56, 0.39, 0.2], np.float32),
    'steel': np.array([0.55, 0.56, 0.58], np.float32),
    'iron': np.array([0.3, 0.29, 0.28], np.float32),
}

LIGHT = np.array([-0.5, -0.66, 0.56], np.float32)
LIGHT /= np.linalg.norm(LIGHT)


def bevel(mask, width):
    """0 at the mask's edge rising to 1 `width` pixels in, with a rounded
    shoulder (the profile of a turned or cast edge)."""
    d = nd.distance_transform_edt(mask)
    t = np.clip(d / max(1e-3, width), 0, 1)
    return np.sin(t * math.pi / 2) * mask


def shade(H, alpha, base, seed, height_px, grime=1.0, patina=0.0, wear=1.0, shine=1.0, scratches=14):
    """Light a height map as metal. H, alpha: (h, w) at supersampled scale;
    base: (h, w, 3) or (3,) colour. Returns an RGBA image, downsampled."""
    h, w = H.shape
    H = np.nan_to_num(H.astype(np.float32))
    Hs = nd.gaussian_filter(H, 0.6)
    gy, gx = np.gradient(Hs)
    k = height_px * SS
    nx = -gx * k
    ny = -gy * k
    nz = np.ones_like(nx)
    inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    nx *= inv
    ny *= inv
    nz *= inv
    diff = np.clip(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], 0, 1)
    # reflection of a workshop: a bright skylight overhead and to the left,
    # a dark floor below
    rx = 2 * nz * nx
    ry = 2 * nz * ny
    # a flat face looks back at the room (a warm, middling reflection); faces
    # tipped up and left catch the skylight; faces tipped down see the floor
    env = 0.3 + 0.7 * np.clip(-ry * 1.15 - rx * 0.4, 0, 1) ** 1.3 - 0.18 * np.clip(ry * 1.2, 0, 1)
    hx = LIGHT[0]
    hy = LIGHT[1]
    hz = LIGHT[2] + 1.0
    hn = math.sqrt(hx * hx + hy * hy + hz * hz)
    ndh = np.clip((nx * hx + ny * hy + nz * hz) / hn, 0, 1)
    spec = (ndh ** 70) * 1.3 + (ndh ** 14) * 0.22
    base = np.broadcast_to(base, (h, w, 3)).astype(np.float32)
    rng = np.random.default_rng(seed)
    fine = value_noise(w, h, w / 3.0, h / 3.0, seed + 1)
    mottle = fbm(w, h, 6, 6, seed + 2, octaves=4)
    col = base * (0.04 + 0.42 * diff + 0.95 * env)[..., None]
    col += (spec * shine)[..., None] * np.array([1.0, 0.92, 0.76], np.float32) * 0.9
    col *= (0.9 + 0.1 * fine + 0.08 * (mottle - 0.5))[..., None]
    # cavities: dirt and old polish settle in the recesses
    cav = np.clip(nd.gaussian_filter(H, 5 * SS) - H, 0, None)
    cav = np.clip(cav * 9, 0, 1)
    ao = 1 - cav * 0.55
    col *= ao[..., None]
    dirt = np.array([0.1, 0.07, 0.045], np.float32)
    g = np.clip(cav * (0.6 + 0.8 * mottle) * grime, 0, 1)
    col = col * (1 - g[..., None] * 0.55) + dirt * (g[..., None] * 0.55)
    # tarnish: broad darker, browner patches where the polish has gone
    tarn = smoothstep(0.5, 0.78, fbm(w, h, 4, 4, seed + 3, octaves=4))
    col = col * (1 - tarn[..., None] * 0.32) + np.array([0.16, 0.1, 0.05], np.float32) * (tarn[..., None] * 0.18)
    # pitting
    pits = rng.random((h, w)).astype(np.float32) > 0.9975
    pits = nd.binary_dilation(pits, iterations=SS - 1)
    col[pits] *= 0.55
    if patina > 0:
        verd = np.array([0.27, 0.46, 0.38], np.float32)
        p = np.clip((cav * 1.6 + (mottle - 0.62) * 2.5), 0, 1) * patina
        col = col * (1 - p[..., None]) + verd * (0.6 + 0.4 * diff[..., None]) * p[..., None]
    # polished edges, where hands and rags have worn the top of a bevel
    edge = np.sqrt(gx * gx + gy * gy) * SS
    e = np.clip(edge * 1.6, 0, 1) * np.clip(-ny * 0.8 - nx * 0.4 + 0.3, 0, 1) * wear
    col += base * (e * 0.35)[..., None]
    # a few fine scratches
    yy, xx = np.ogrid[0:h, 0:w]
    for _ in range(scratches):
        x0, y0 = rng.random() * w, rng.random() * h
        ang = rng.random() * math.pi
        ln = (0.05 + rng.random() * 0.2) * w
        dx, dy = math.cos(ang), math.sin(ang)
        t = ((xx - x0) * dx + (yy - y0) * dy) / ln
        dd = np.abs((xx - x0) * dy - (yy - y0) * dx)
        on = (dd < 0.6 * SS) & (t > 0) & (t < 1)
        col[on] *= 1.12
    col = np.clip(col, 0, 1)
    rgba = np.concatenate([col, np.clip(alpha, 0, 1)[..., None]], -1)
    img = Image.fromarray((rgba * 255).astype(np.uint8))
    return img.resize((w // SS, h // SS), Image.LANCZOS)


def grid(S, Sy=None):
    """Supersampled coordinates centred on an S x Sy canvas, in final pixels."""
    Sy = Sy or S
    y, x = np.mgrid[0:Sy * SS, 0:S * SS].astype(np.float32)
    x = (x + 0.5) / SS - S / 2
    y = (y + 0.5) / SS - Sy / 2
    return x, y


# parts only the desktop stage uses (the phone draws its frames from the
# nine-slice pieces and has no station clock)
DESKTOP_ONLY = {'clock-bezel', 'clock-dial', 'clock-hour', 'clock-minute', 'frame-brass'}


def save_both(img, name, mobile_scale=0.75, jpeg=False):
    if jpeg:
        img.convert('RGB').save(os.path.join(DESKTOP, name), quality=88, optimize=True)
    else:
        img.save(os.path.join(DESKTOP, name), optimize=True)
    if name.rsplit('.', 1)[0] in DESKTOP_ONLY:
        print('wrote', name, img.size)
        return
    w, h = img.size
    small = img.resize((max(1, round(w * mobile_scale)), max(1, round(h * mobile_scale))), Image.LANCZOS)
    if jpeg:
        small.convert('RGB').save(os.path.join(MOBILE, name), quality=88, optimize=True)
    else:
        small.save(os.path.join(MOBILE, name), optimize=True)
    print('wrote', name, img.size, small.size)


# ── gears ────────────────────────────────────────────────────────────────────

MODULE = 13.0  # tooth size in desktop pixels, shared by every gear so they mesh


def turned(r, pitch):
    """Fine concentric tool marks from the lathe, as a tiny height ripple."""
    return 0.008 * np.sin(r * (2 * math.pi / (pitch * 2.6)))


def gear(name, n, style, metal, spokes=5, holes=6, seed=0, patina=0.0):
    m = MODULE
    rp = m * n / 2
    ro = rp + 0.95 * m
    rr = rp - 1.2 * m
    S = int(2 * math.ceil(ro + 6))
    x, y = grid(S)
    r = np.hypot(x, y)
    th = np.arctan2(y, x)
    ph = (th * n / (2 * math.pi)) % 1.0
    q = np.minimum(ph, 1 - ph) * 2           # 0 at a tooth's centre, 1 mid-gap
    t = smoothstep(0.66, 0.28, q)
    rb = rr + (ro - rr) * t
    body = r < rb
    ri = rr - 2.5 * m
    rh = max(3.0 * m, 0.24 * rp)
    rbore = rh * 0.36
    rim = body & (r > ri)
    hub = r < rh
    H = 0.6 * bevel(rim, 0.55 * m * SS) + turned(r, 1.1) * rim
    solid = np.zeros_like(body)
    if style == 'spoked':
        sp = np.zeros_like(body)
        for i in range(spokes):
            a = 2 * math.pi * i / spokes + math.pi / spokes
            along = x * math.cos(a) + y * math.sin(a)
            across = np.abs(-x * math.sin(a) + y * math.cos(a))
            ww = m * (2.3 - 0.7 * np.clip((along - rh) / (ri - rh), 0, 1))
            sp |= (across < ww / 2) & (along > 0) & (r < ri + m * 0.8)
        # fillets where the spokes meet the rim and the boss
        joint = sp | hub | (rim & (r < ri + m))
        fil = nd.gaussian_filter(joint.astype(np.float32), m * 0.55 * SS) > 0.5
        sp = (sp | (fil & (r < ri + m * 0.5) & (r > rh * 0.9))) & ~rim
        prof = bevel(sp, m * 1.0 * SS)
        H = np.maximum(H, 0.46 * np.sqrt(np.clip(prof, 0, 1)))
        solid = sp
    elif style == 'web':
        web = (r < ri + 1) & ~hub
        hr = (ri - rh) * 0.32
        hc = (ri + rh) / 2
        for i in range(holes):
            a = 2 * math.pi * i / holes
            web &= np.hypot(x - hc * math.cos(a), y - hc * math.sin(a)) > hr
        H = np.maximum(H, 0.32 * bevel(web, 0.45 * m * SS) + turned(r, 0.9) * web)
        solid = web
    else:  # 'solid': a plate with a turned groove
        web = (r < ri + 1)
        groove = np.abs(r - (rh + ri) / 2) < m * 0.4
        H = np.maximum(H, 0.4 * bevel(web, 0.45 * m * SS) - 0.12 * bevel(groove, 0.3 * m * SS) + turned(r, 0.9) * web)
        solid = web
    H = np.maximum(H, 0.95 * bevel(hub, 0.5 * m * SS) + turned(r, 0.7) * hub)
    # a turned step on the boss, and the set screw
    H -= 0.07 * (np.abs(r - rh * 0.72) < m * 0.14)
    screw = np.hypot(x - rh * 0.56, y) < m * 0.36
    H -= 0.3 * bevel(screw, m * 0.2 * SS)
    bore = r < rbore
    key = (np.abs(x) < m * 0.36) & (y < -rbore + m * 0.5) & (y > -rbore - m * 0.62)
    alpha = (rim | hub | solid) & ~bore & ~key
    H = H * alpha
    base = METALS[metal] * (0.94 + 0.12 * fbm(S * SS, S * SS, 3, 3, seed + 5, 3)[..., None])
    img = shade(H, alpha.astype(np.float32), base, seed, height_px=m * 0.7, patina=patina)
    name_png = name + '.png'
    save_both(img, name_png)
    # its shadow, cast down and to the right: a soft silhouette the apps turn
    # with the gear and offset, which is exactly right for a spinning part
    sil = nd.gaussian_filter(alpha.astype(np.float32), m * 0.5 * SS)
    sh = np.zeros(sil.shape + (4,), np.float32)
    sh[..., 3] = sil * 0.75
    simg = Image.fromarray((sh * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS)
    save_both(simg, name + '-shadow.png')
    MANIFEST['gears'][name] = {'file': name_png, 'shadow': name + '-shadow.png', 'teeth': n, 'pitch': round(rp, 2), 'size': S}


# ── small parts ──────────────────────────────────────────────────────────────

def rivet(name='rivet', S=40, metal='brass'):
    x, y = grid(S)
    r = np.hypot(x, y)
    R = S * 0.36
    H = np.sqrt(np.clip(1 - (r / R) ** 2, 0, 1))
    alpha = smoothstep(R + 0.6, R - 0.6, r)
    img = shade(H, alpha, METALS[metal], SEED + 7, height_px=S * 0.3, grime=0.6, scratches=0)
    save_both(img, name + '.png')


def rivets_h(x, y, centres, R):
    """Height of a ring of dome rivets (and the mask of where they are)."""
    H = np.zeros_like(x)
    for cx, cy in centres:
        d = np.hypot(x - cx, y - cy)
        H = np.maximum(H, np.sqrt(np.clip(1 - (d / R) ** 2, 0, 1)))
    return H


def porthole(name='porthole', S=760, opening=0.62, nrivets=18):
    """A riveted brass porthole bezel; the middle is open for the picture."""
    x, y = grid(S)
    r = np.hypot(x, y)
    Ro = S / 2 - 4
    Rop = Ro * opening
    flange = (r < Ro) & (r > Ro * 0.84)
    lip_in = (r < Ro * 0.8) & (r > Rop)
    channel = (r <= Ro * 0.84) & (r >= Ro * 0.8)
    H = 0.5 * bevel(flange, 10 * SS)
    H = np.maximum(H, 0.28 * channel)
    # the bezel that holds the glass: a rounded, rolled lip
    t = np.clip((r - Rop) / (Ro * 0.8 - Rop), 0, 1)
    H = np.maximum(H, (0.35 + 0.45 * np.clip(np.sin(t * math.pi), 0, 1) ** 0.7) * lip_in)
    H += turned(r, 1.0) * (flange | lip_in)
    cs = [(Ro * 0.92 * math.cos(2 * math.pi * i / nrivets), Ro * 0.92 * math.sin(2 * math.pi * i / nrivets)) for i in range(nrivets)]
    rv = rivets_h(x, y, cs, Ro * 0.045)
    H = np.maximum(H, 0.5 + 0.38 * rv * (rv > 0))
    alpha = ((r < Ro) & (r > Rop)).astype(np.float32)
    img = shade(H * alpha, alpha, METALS['brass'], SEED + 21, height_px=S * 0.04, patina=0.3)
    save_both(img, name + '.png')
    # the glass: a curved reflection of the skylight, a hot spot, a dark rim
    gl = np.zeros((S * SS, S * SS, 4), np.float32)
    inside = r < Rop + 2
    u = (x + Rop * 0.35) / Rop
    v = (y + Rop * 0.4) / Rop
    crescent = smoothstep(0.75, 0.55, np.hypot(u, v)) * smoothstep(0.35, 0.6, np.hypot(u + 0.18, v + 0.2))
    hot = np.exp(-(((x + Rop * 0.42) / (Rop * 0.08)) ** 2 + ((y + Rop * 0.46) / (Rop * 0.05)) ** 2))
    rim = smoothstep(Rop * 0.82, Rop, r)
    gl[..., 0:3] = 1.0
    gl[..., 3] = np.clip(crescent * 0.22 + hot * 0.55, 0, 1) * inside
    dark = np.zeros_like(gl)
    dark[..., 3] = rim * 0.55 * inside
    out = gl + dark * (1 - gl[..., 3:4])
    out[..., 0:3] = np.where(gl[..., 3:4] > 0.01, 1.0, 0.0)
    out[..., 3] = np.clip(gl[..., 3] + dark[..., 3], 0, 1)
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS)
    save_both(img, name + '-glass.png')


def font(face, size):
    paths = {
        'old': os.path.join(FONTS, 'old-standard-tt', '700Bold', 'OldStandardTT_700Bold.ttf'),
        'oldr': os.path.join(FONTS, 'old-standard-tt', '400Regular', 'OldStandardTT_400Regular.ttf'),
        'oldi': os.path.join(FONTS, 'old-standard-tt', '400Regular_Italic', 'OldStandardTT_400Regular_Italic.ttf'),
        'abril': os.path.join(FONTS, 'abril-fatface', '400Regular', 'AbrilFatface_400Regular.ttf'),
    }
    return ImageFont.truetype(paths[face], size)


def aged_paper(S, seed, tone=(0.92, 0.86, 0.72)):
    """A dial's enamelled paper, yellowed toward the edge, with foxing."""
    x, y = grid(S)
    r = np.hypot(x, y) / (S / 2)
    m = fbm(S * SS, S * SS, 6, 6, seed, 4)
    base = np.array(tone, np.float32)[None, None, :] * (0.95 + 0.06 * m[..., None])
    base *= (1 - 0.18 * smoothstep(0.55, 1.0, r))[..., None]
    rng = np.random.default_rng(seed)
    for _ in range(9):
        cx, cy, rr = (rng.random() - 0.5) * S, (rng.random() - 0.5) * S, (0.01 + rng.random() * 0.035) * S
        spot = np.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (rr * rr)))
        base -= np.array([0.03, 0.07, 0.12], np.float32)[None, None, :] * spot[..., None]
    return base


def dial(name, S, kind):
    """A printed dial face: 'gauge' (0 to 10 over 270 degrees with a red
    zone) or 'clock' (Roman hours)."""
    paper = aged_paper(S, SEED + (31 if kind == 'gauge' else 32))
    N = S * SS
    img = Image.fromarray((np.clip(paper, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(img)
    c = N / 2
    R = N / 2 * 0.98
    ink = (38, 26, 16, 255)
    red = (150, 34, 22, 255)
    def at(rad, a):
        return (c + math.cos(a) * rad, c + math.sin(a) * rad)
    d.ellipse([c - R * 0.94, c - R * 0.94, c + R * 0.94, c + R * 0.94], outline=ink, width=int(SS * S * 0.004) + 1)
    if kind == 'gauge':
        a0 = math.radians(135)
        sweep = math.radians(270)
        # the red zone, 8 to 10
        for i in range(160):
            t = 0.8 + 0.2 * i / 159
            a = a0 + sweep * t
            p1, p2 = at(R * 0.86, a), at(R * 0.74, a)
            d.line([p1, p2], fill=red, width=int(SS * S * 0.012))
        for i in range(51):
            t = i / 50
            a = a0 + sweep * t
            major = i % 5 == 0
            p1 = at(R * 0.88, a)
            p2 = at(R * (0.72 if major else 0.8), a)
            d.line([p1, p2], fill=ink, width=int(SS * S * (0.008 if major else 0.004)) + 1)
        f = font('old', int(S * SS * 0.1))
        for i in range(11):
            a = a0 + sweep * i / 10
            tx, ty = at(R * 0.58, a)
            txt = str(i)
            bb = d.textbbox((0, 0), txt, font=f)
            d.text((tx - (bb[2] - bb[0]) / 2 - bb[0], ty - (bb[3] - bb[1]) / 2 - bb[1]), txt, font=f, fill=ink)
        f2 = font('old', int(S * SS * 0.062))
        f3 = font('oldi', int(S * SS * 0.05))
        for txt, ff, yy in (('VOX', f2, 0.3), ('pressure', f3, 0.42), ('HARGREAVE & SONS', font('oldr', int(S * SS * 0.036)), 0.62)):
            bb = d.textbbox((0, 0), txt, font=ff)
            d.text((c - (bb[2] - bb[0]) / 2 - bb[0], c + R * yy - (bb[3] - bb[1]) / 2 - bb[1]), txt, font=ff, fill=ink)
    else:
        for i in range(60):
            a = -math.pi / 2 + 2 * math.pi * i / 60
            major = i % 5 == 0
            d.line([at(R * 0.88, a), at(R * (0.78 if major else 0.84), a)], fill=ink, width=int(SS * S * (0.01 if major else 0.004)) + 1)
        d.ellipse([c - R * 0.76, c - R * 0.76, c + R * 0.76, c + R * 0.76], outline=ink, width=int(SS * S * 0.003) + 1)
        f = font('old', int(S * SS * 0.078))
        romans = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
        for i, txt in enumerate(romans):
            a = -math.pi / 2 + 2 * math.pi * i / 12
            tx, ty = at(R * 0.655, a)
            # Roman hours, upright, so the dial reads at a glance across a room
            tile = Image.new('RGBA', (int(R), int(R * 0.4)), (0, 0, 0, 0))
            td = ImageDraw.Draw(tile)
            bb = td.textbbox((0, 0), txt, font=f)
            td.text(((tile.width - (bb[2] - bb[0])) / 2 - bb[0], (tile.height - (bb[3] - bb[1])) / 2 - bb[1]), txt, font=f, fill=ink)
            rot = tile
            img.alpha_composite(rot, (int(tx - rot.width / 2), int(ty - rot.height / 2)))
        f3 = font('oldi', int(S * SS * 0.05))
        txt = 'Hargreave & Sons'
        bb = d.textbbox((0, 0), txt, font=f3)
        d.text((c - (bb[2] - bb[0]) / 2 - bb[0], c - R * 0.34 - (bb[3] - bb[1]) / 2 - bb[1]), txt, font=f3, fill=ink)
    # cut to a disc, soften a hair
    arr = np.asarray(img).astype(np.float32) / 255
    x, y = grid(S)
    arr[..., 3] = smoothstep(S / 2 - 0.5, S / 2 - 2, np.hypot(x, y))
    out = Image.fromarray((arr * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS)
    save_both(out, name + '.png')


def bezel(name, S, opening=0.8, screws=3, metal='brass'):
    """A gauge or clock bezel: a rounded, polished ring with slotted screws."""
    x, y = grid(S)
    r = np.hypot(x, y)
    Ro = S / 2 - 3
    Ri = Ro * opening
    ring = (r < Ro) & (r > Ri)
    t = np.clip((r - Ri) / (Ro - Ri), 0, 1)
    H = (0.25 + 0.75 * np.clip(np.sin(t * math.pi), 0, 1) ** 0.6) * ring
    H += turned(r, 0.9) * ring
    for i in range(screws):
        a = -math.pi / 2 + 2 * math.pi * i / screws
        cx, cy = (Ri + Ro) / 2 * math.cos(a), (Ri + Ro) / 2 * math.sin(a)
        d = np.hypot(x - cx, y - cy)
        hr = (Ro - Ri) * 0.22
        head = d < hr
        H = np.where(head, 0.75 + 0.2 * np.sqrt(np.clip(1 - (d / hr) ** 2, 0, 1)), H)
        ang = a + 0.7
        slot = head & (np.abs((x - cx) * math.sin(ang) - (y - cy) * math.cos(ang)) < hr * 0.16)
        H = np.where(slot, H - 0.25, H)
    alpha = ring.astype(np.float32)
    img = shade(H * alpha, alpha, METALS[metal], SEED + 41 + S, height_px=S * 0.05, patina=0.15)
    save_both(img, name + '.png')


def needle(name, S, length=0.7, kind='gauge'):
    """A blued-steel spade needle pointing to twelve, with its brass cap."""
    x, y = grid(S)
    R = S / 2
    L = R * length
    up = -y
    across = np.abs(x)
    # the blade: tapering to a point, a spade near the tip, a counterweight tail
    w = np.where(up > 0, R * 0.035 * (1 - np.clip(up / L, 0, 1)) + R * 0.008, R * 0.05)
    blade = (across < w) & (up < L) & (up > -R * 0.2)
    spade = np.hypot(x, (up - L * 0.78) * 1.6) < R * 0.055
    tail = np.hypot(x, up + R * 0.17) < R * 0.07
    shape = blade | spade | tail
    prof = bevel(shape, R * 0.02 * SS)
    H = 0.4 * prof
    cap = np.hypot(x, y) < R * 0.075
    capH = np.sqrt(np.clip(1 - (np.hypot(x, y) / (R * 0.075)) ** 2, 0, 1))
    blued = np.array([0.16, 0.18, 0.26], np.float32)
    base = np.where(cap[..., None], METALS['brass'], blued)
    H = np.where(cap, 0.5 + 0.5 * capH, H)
    alpha = (shape | cap).astype(np.float32)
    img = shade(H * alpha, alpha, base, SEED + 51, height_px=S * 0.02, grime=0.3, scratches=0)
    save_both(img, name + '.png')


def hand(name, S, length, width, kind):
    """A clock hand (spade 'hour', slender 'minute'), dark iron, pointing up."""
    x, y = grid(S)
    R = S / 2
    up = -y
    L = R * length
    w = R * width * (1 - 0.7 * np.clip(up / L, 0, 1))
    shaft = (np.abs(x) < w) & (up > -R * 0.12) & (up < L)
    if kind == 'hour':
        shaft |= np.hypot(x, (up - L * 0.72) * 1.3) < R * width * 3.2
        shaft &= ~(np.hypot(x, (up - L * 0.72) * 1.3) < R * width * 1.4)
    boss = np.hypot(x, y) < R * width * 2.2
    shape = shaft | boss
    H = 0.4 * bevel(shape, R * 0.01 * SS)
    alpha = shape.astype(np.float32)
    img = shade(H, alpha, np.array([0.12, 0.11, 0.11], np.float32), SEED + 61, height_px=S * 0.02, grime=0.2, scratches=0)
    save_both(img, name + '.png')


def handwheel(name='handwheel', S=420, spokes=5, metal='brass'):
    """A valve's hand wheel: a round rim, curved spokes, a boss."""
    x, y = grid(S)
    r = np.hypot(x, y)
    th = np.arctan2(y, x)
    Rr = S * 0.42
    tube = S * 0.055
    d_rim = np.abs(r - Rr)
    rim = d_rim < tube
    H = np.sqrt(np.clip(1 - (d_rim / tube) ** 2, 0, 1)) * rim
    # a few cast grip bumps round the rim
    H += 0.06 * np.clip(np.cos(th * 15), 0, 1) ** 4 * rim
    sp = np.zeros_like(rim)
    for i in range(spokes):
        a = 2 * math.pi * i / spokes
        # a gentle S-curve: the spoke's angle drifts with radius
        aa = a + 0.35 * np.sin(np.clip(r / Rr, 0, 1) * math.pi)
        across = np.abs(np.sin(th - aa)) * r
        sp |= (across < S * 0.022) & (np.cos(th - aa) > 0) & (r < Rr)
    dsp = nd.distance_transform_edt(sp) / (S * 0.022 * SS)
    H = np.maximum(H, 0.6 * np.sqrt(np.clip(dsp, 0, 1)))
    boss = r < S * 0.1
    H = np.maximum(H, (0.7 + 0.25 * np.sqrt(np.clip(1 - (r / (S * 0.1)) ** 2, 0, 1))) * boss)
    bore = r < S * 0.03
    alpha = ((rim | sp | boss) & ~bore).astype(np.float32)
    img = shade(H * alpha, alpha, METALS[metal], SEED + 71, height_px=S * 0.06, patina=0.25)
    save_both(img, name + '.png')


def frame9(name='frame-brass', size=180, border=48):
    """A riveted brass frame for nine-slice (CSS border-image): a rolled outer
    lip, a channel, a sharp inner moulding, rivets in the channel. The edge
    span between the corners holds exactly one rivet, so it repeats."""
    x, y = grid(size)
    ax = np.abs(x)
    ay = np.abs(y)
    half = size / 2
    # distance in from the outer edge, and out from the inner edge
    d_out = np.minimum(half - ax, half - ay)
    inner = border - 6
    band = d_out < inner
    t = np.clip(d_out / inner, 0, 1)
    H = np.where(t < 0.3, 0.55 * np.sin(np.clip(t / 0.3, 0, 1) * math.pi / 2),
        np.where(t < 0.8, 0.42, 0.42 + 0.28 * np.sin(np.clip((t - 0.8) / 0.2, 0, 1) * math.pi)))
    H = H * band
    cs = []
    mid = border * 0.5
    for sx in (-1, 0, 1):
        for sy in (-1, 0, 1):
            if sx == 0 and sy == 0:
                continue
            cs.append((sx * (half - mid), sy * (half - mid)))
    rv = rivets_h(x, y, cs, border * 0.17)
    H = np.where(rv > 0, 0.42 + 0.4 * rv, H)
    alpha = band.astype(np.float32)
    img = shade(H, alpha, METALS['brass'], SEED + 81, height_px=border * 0.35, patina=0.3)
    save_both(img, name + '.png')
    MANIFEST['frame'] = {'file': name + '.png', 'size': size, 'border': border}
    # the phone has no border-image, so it gets the frame in nine pieces:
    # four corners, and an edge span for each side (one rivet each) to repeat
    b = border
    m0, m1 = b, size - b
    pieces = {
        'tl': (0, 0, b, b), 't': (m0, 0, m1, b), 'tr': (m1, 0, size, b),
        'l': (0, m0, b, m1), 'r': (m1, m0, size, m1),
        'bl': (0, m1, b, size), 'b': (m0, m1, m1, size), 'br': (m1, m1, size, size),
    }
    for k, box in pieces.items():
        piece = img.crop(box)
        w, h = piece.size
        piece.resize((max(1, round(w * 0.75)), max(1, round(h * 0.75))), Image.LANCZOS).save(os.path.join(MOBILE, '%s-%s.png' % (name, k)), optimize=True)


def cylinder_h(coord, R):
    return np.sqrt(np.clip(1 - (coord / R) ** 2, 0, 1))


def pipe_parts():
    D = 60  # pipe diameter in desktop pixels
    R = D / 2
    # a straight run, seamless left to right
    W = 240
    x, y = grid(W, D + 8)
    H = cylinder_h(y, R)
    alpha = (np.abs(y) < R).astype(np.float32)
    img = shade(H, alpha, METALS['copper'], SEED + 91, height_px=D * 0.45, patina=0.4, scratches=0)
    arr = np.asarray(img).astype(np.float32)
    # seamless: blend the ends into each other
    n = 40
    for i in range(n):
        t = i / n
        arr[:, i] = arr[:, i] * t + arr[:, -n + i] * (1 - t)
    arr = arr[:, : W - n]
    save_both(Image.fromarray(arr.astype(np.uint8)), 'pipe.png')
    # a bolted coupling
    Wc, Hc = 54, D + 26
    x, y = grid(Wc, Hc)
    body = (np.abs(x) < Wc / 2 - 3) & (np.abs(y) < Hc / 2 - 2)
    H = cylinder_h(y, Hc / 2 - 1) * 0.9 * body
    H += 0.08 * bevel(body, 4 * SS)
    for by in (-Hc * 0.28, Hc * 0.28):
        bolt = np.hypot(x, y - by) < 6.5
        H = np.where(bolt, H + 0.25 * cylinder_h(np.hypot(x, y - by), 6.5), H)
    img = shade(H, body.astype(np.float32), METALS['brass'], SEED + 92, height_px=D * 0.4, patina=0.3, scratches=2)
    save_both(img, 'pipe-coupling.png')


def rack(name='rack'):
    """One tooth of a straight gear rack (teeth up), cut to the same module as
    the gears so a pinion rolls along it; tiles seamlessly left to right."""
    m = MODULE
    W = int(round(math.pi * m))       # one tooth pitch
    Hh = int(round(2.6 * m))
    x, y = grid(W, Hh)
    u = x / W                          # -0.5..0.5 across the pitch
    base_top = Hh / 2 - 1.2 * m        # the bar's top edge (the root line)
    tooth_h = 2.1 * m
    # trapezoid tooth centred in the tile, flanks at 20 degrees
    half = 0.25 * W + (y - (base_top - tooth_h)) * math.tan(math.radians(20))
    tooth = (np.abs(x) < np.clip(half, 0.12 * W, None)) & (y > base_top - tooth_h) & (y < base_top + 1)
    bar = y >= base_top
    shape = (tooth | bar) & (y < Hh / 2 - 1)
    H = 0.55 * bevel(shape, 0.35 * m * SS)
    alpha = shape.astype(np.float32)
    img = shade(H, alpha, METALS['brass'], SEED + 95, height_px=m * 0.6, patina=0.2, scratches=0)
    save_both(img, name + '.png')
    MANIFEST['rack'] = {'file': name + '.png', 'pitch': W, 'height': Hh, 'root': round(base_top + Hh / 2, 2)}


def steam(i, S=300):
    x, y = grid(S)
    r = np.hypot(x, y) / (S / 2)
    n = fbm(S * SS, S * SS, 4, 4, SEED + 100 + i, 5)
    a = np.clip((n - 0.38) * 2.4, 0, 1) * smoothstep(1.0, 0.25, r)
    rgba = np.zeros((S * SS, S * SS, 4), np.float32)
    rgba[..., 0] = 0.97
    rgba[..., 1] = 0.95
    rgba[..., 2] = 0.9
    rgba[..., 3] = nd.gaussian_filter(a, 3 * SS) * 0.9
    img = Image.fromarray((rgba * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS)
    save_both(img, 'steam-%d.png' % i)


def shade_matte(H, alpha, base, height_px, sheen=0.0):
    """Light a height map as a matte surface (brick, canvas, wood, stone)."""
    H = np.nan_to_num(H.astype(np.float32))
    gy, gx = np.gradient(nd.gaussian_filter(H, 0.6))
    k = height_px * SS
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(gx)
    inv = 1 / np.sqrt(nx * nx + ny * ny + 1)
    nx, ny, nz = nx * inv, ny * inv, nz * inv
    diff = np.clip(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], 0, 1)
    col = base * (0.35 + 0.75 * diff)[..., None]
    if sheen:
        col += sheen * (np.clip(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], 0, 1) ** 20)[..., None]
    return col


def bricks(w, h, seed, bw=84, bh=33, mortar=5):
    """A brick wall's colour and height, running bond."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    row = np.floor(y / bh).astype(int)
    off = (row % 2) * (bw / 2)
    col = np.floor((x + off) / bw).astype(int)
    u = (x + off) % bw
    v = y % bh
    d = np.minimum(np.minimum(u - mortar, bw - u), np.minimum(v - mortar, bh - v))
    brick = d > 0
    Hb = np.where(brick, 0.6 + 0.4 * np.clip(d / 4.0, 0, 1) ** 0.5, 0.2)
    rng = np.random.default_rng(seed)
    pal = np.array([[0.46, 0.2, 0.13], [0.53, 0.25, 0.15], [0.4, 0.17, 0.11], [0.5, 0.29, 0.19], [0.3, 0.14, 0.09], [0.58, 0.32, 0.2]], np.float32)
    key = (row * 7919 + col * 104729) % 100003
    pick = (key * 2654435761 % 2 ** 32) / 2 ** 32
    idx = np.clip((pick * len(pal)).astype(int), 0, len(pal) - 1)
    c = pal[idx]
    shade_b = ((key * 40503) % 1000) / 1000.0
    c = c * (0.82 + 0.3 * shade_b)[..., None]
    grain = fbm(w, h, w / 28, h / 28, seed + 1, 3)
    c *= (0.85 + 0.3 * grain)[..., None]
    mortar_c = np.array([0.28, 0.25, 0.21], np.float32)
    c = np.where(brick[..., None], c, mortar_c * (0.8 + 0.4 * grain[..., None]))
    Hb = Hb + 0.08 * grain
    return c, Hb


def window_sky(w, h, seed, airships):
    """The view out of a window: hazy daylight over a smoky city of chimneys
    and towers, airships in the sky."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    v = y / h
    sky = np.array([0.6, 0.72, 0.8], np.float32) * (1 - v[..., None]) + np.array([0.98, 0.86, 0.62], np.float32) * v[..., None]
    clouds = fbm(w, h, 3, 4, seed, 5)
    sky = sky * (0.9 + 0.2 * clouds[..., None])
    # the city: a skyline of chimneys and towers, hazed blue
    rng = np.random.default_rng(seed + 1)
    sky_y = np.full(w, h * 0.78)
    xx = 0
    while xx < w:
        bw = rng.integers(14, 46)
        top = h * (0.62 + rng.random() * 0.16)
        sky_y[xx:xx + bw] = np.minimum(sky_y[xx:xx + bw], top)
        if rng.random() < 0.45:
            cx = xx + rng.integers(3, max(4, bw - 3))
            sky_y[cx:cx + 5] = np.minimum(sky_y[cx:cx + 5], top - h * (0.06 + rng.random() * 0.1))
        xx += bw
    city = y > sky_y[None, :]
    haze = np.array([0.5, 0.52, 0.56], np.float32)
    sky = np.where(city[..., None], haze * (0.75 + 0.15 * v[..., None]), sky)
    return sky


def airship_mask(w, h, cx, cy, L, seed):
    """A small, distant airship silhouette (envelope, gondola, fins)."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    env = ((x - cx) / (L / 2)) ** 2 + ((y - cy) / (L * 0.17)) ** 2 < 1
    gond = (np.abs(x - cx) < L * 0.12) & (y > cy + L * 0.19) & (y < cy + L * 0.25)
    fin = (x < cx - L * 0.36) & (x > cx - L * 0.52) & (np.abs(y - cy) < (cx - L * 0.36 - x) * 0.9)
    return env | gond | fin


def foundry(name, W, H, windows, pipes_y, seed, darken=1.0):
    """The engine house: a sooty brick wall in shadow, tall arched windows
    blown out with daylight (airships hazy beyond them), bloom bleeding over
    the glazing bars, shafts of light through the haze, copper pipes along
    the wall catching the window light on their tops."""
    c, Hb = bricks(W, H, seed)
    col = shade_matte(Hb, None, c, height_px=5)
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    # the wall is in shade; soot runs down it in streaks
    streak = fbm(W, H, W / 60, 2.5, seed + 4, 4)
    col *= (0.17 + 0.08 * streak)[..., None]
    bright = np.zeros((H, W), np.float32)   # what's blown out (for bloom)
    rim = np.zeros((H, W), np.float32)      # light falling on the wall near windows
    shafts = np.zeros((H, W), np.float32)
    for (wx, wtop, wbot, ww) in windows:
        R = ww / 2
        spring = wtop + R
        def arch(pad):
            return (np.abs(x - wx) < R + pad) & (y < wbot + pad * 0.4) & ((y > spring) | (np.hypot(x - wx, y - spring) < R + pad))
        inside = arch(0)
        reveal = arch(26) & ~inside
        col = np.where(reveal[..., None], col * 0.45, col)
        lx = x - (wx - R)
        ly = y - wtop
        # daylight: warm and nearly white low down, a little bluer up high
        v = np.clip(ly / (wbot - wtop), 0, 1)
        sky = (np.array([0.62, 0.7, 0.76], np.float32) * (1 - v[..., None]) + np.array([0.9, 0.8, 0.6], np.float32) * v[..., None]) * 0.86
        sky = sky * (0.92 + 0.08 * fbm(W, H, 6, 6 * H / W, seed + 5, 3))[..., None]
        # a faint smoky skyline, almost lost in the glare
        sk = fbm(W, 1, W / 40, 1, seed + int(wx), 3)[0]
        sky_line = wbot - (wbot - wtop) * (0.18 + 0.16 * sk)
        city = y > sky_line[None, :]
        sky = np.where(city[..., None], sky * np.array([0.78, 0.8, 0.84], np.float32), sky)
        # glazing: mullions and transoms, and a fanlight in the arch
        pane_w = ww / 4
        bar = ((lx % pane_w) < 4.5) | (((ly - R) % 76) < 4.5) & (ly > R)
        rr = np.hypot(lx - R, ly - R)
        ang = np.arctan2(ly - R, lx - R)
        fan = (ly < R) & ((np.abs(rr - R * 0.5) < 2.5) | ((np.abs(((ang / math.pi) * 6) % 1 - 0.5) > 0.47) & (rr > R * 0.5)))
        bar = np.where(ly < R, fan | (np.abs(lx - R) < 2.5), bar)
        win = np.where(bar[..., None], np.array([0.05, 0.045, 0.04], np.float32), sky)
        col = np.where(inside[..., None], win, col)
        bright += inside * (~bar) * 1.0
        # sill
        sill = (np.abs(x - wx) < R + 40) & (y > wbot + 8) & (y < wbot + 28)
        col = np.where(sill[..., None], np.array([0.33, 0.3, 0.27], np.float32) * (0.75 + 0.35 * (y < wbot + 14))[..., None], col)
        # window light on the surrounding wall
        dd = np.hypot((x - wx) / (R * 1.6), (y - (wtop + wbot) / 2) / ((wbot - wtop) * 0.75))
        rim += np.exp(-dd ** 2 * 1.6) * (~inside)
        # a shaft of daylight falling into the hall
        dx = x - wx - (y - wtop) * 0.42
        shafts += np.exp(-(dx / (R * 0.85)) ** 2) * smoothstep(wtop, wtop + 260, y)
    col += c * (rim * 0.3)[..., None] + np.array([0.3, 0.22, 0.14], np.float32) * (rim * 0.08)[..., None]
    # airships in the haze beyond: soft dark shapes, only inside the windows
    ship = Image.open(os.path.join(DESKTOP, 'airship.png')).convert('RGBA')
    canvas = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    rng = np.random.default_rng(seed + 7)
    winmask = Image.fromarray((np.clip(bright, 0, 1) * 255).astype(np.uint8))
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    for (wx, wtop, wbot, ww) in windows:
        for k in range(2):
            sw = int(ww * (0.55 if k == 0 else 0.28))
            sh = ship.resize((sw, int(sw * ship.height / ship.width)), Image.LANCZOS)
            px = int(wx - ww * 0.4 + rng.random() * ww * 0.5)
            py = int(wtop + (wbot - wtop) * (0.22 + 0.25 * k + rng.random() * 0.08))
            layer.alpha_composite(sh, (px, py))
    la = np.asarray(layer).astype(np.float32) / 255
    hazed = la[..., :3] * 0.7 + np.array([0.5, 0.5, 0.5], np.float32) * 0.3
    a = la[..., 3] * (np.asarray(winmask).astype(np.float32) / 255) * 0.75
    arr = np.asarray(canvas).astype(np.float32)[..., :3] / 255
    arr = arr * (1 - a[..., None]) + hazed * a[..., None]
    # bloom: the blown-out glass bleeds over the bars and onto the bricks
    bl = nd.gaussian_filter(bright, 18) * 0.55 + nd.gaussian_filter(bright, 60) * 0.35
    arr += np.array([1.0, 0.86, 0.64], np.float32) * bl[..., None] * 0.4
    dust = fbm(W, H, 10, 10 * H / W, seed + 9, 4)
    arr += np.array([1.0, 0.84, 0.58], np.float32) * (shafts * (0.05 + 0.07 * dust))[..., None]
    # copper pipes along the wall, lit on top by the windows
    for py, pr in pipes_y:
        band = np.abs(y - py) < pr
        Hp = np.sqrt(np.clip(1 - ((y - py) / pr) ** 2, 0, 1))
        cpl = (np.abs((x % 380) - 190) < 16) & (np.abs(y - py) < pr + 7)
        Hp = np.where(cpl, np.sqrt(np.clip(1 - ((y - py) / (pr + 7)) ** 2, 0, 1)) * 1.05, Hp)
        m = band | cpl
        shadow = np.exp(-((y - py - pr * 0.95) / (pr * 0.9)) ** 2) * ~m
        arr *= (1 - 0.6 * shadow)[..., None]
        ys, ye = int(py - pr - 8), int(py + pr + 8)
        global SS
        old = SS
        SS = 1
        img = shade(Hp[ys:ye] * m[ys:ye], m[ys:ye].astype(np.float32), np.where(cpl[ys:ye][..., None], METALS['brass'], METALS['copper']), seed + py, height_px=pr * 0.9, patina=0.45, scratches=0)
        SS = old
        pa = np.asarray(img).astype(np.float32) / 255
        aa = pa[..., 3:4]
        arr[ys:ye] = arr[ys:ye] * (1 - aa) + pa[..., :3] * 0.62 * aa
    arr = np.clip(arr, 0, 1)
    # depth of field: the hall is far behind the engine, well out of focus
    img = Image.fromarray((arr * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(W / 300))
    arr = np.asarray(img).astype(np.float32) / 255
    vig = np.clip(1.35 - np.hypot((x - W / 2) / (W * 0.6), (y - H * 0.42) / (H * 0.68)), 0.2, 1)
    arr = np.clip(arr * vig[..., None] * darken, 0, 1)
    arr += (np.random.default_rng(seed).random(arr.shape).astype(np.float32) - 0.5) * 0.012
    out = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))
    out.save(os.path.join(DESKTOP if W > H else MOBILE, name), quality=86, optimize=True)
    print('wrote', name, out.size)
    if W < H:
        return  # the phone's hall has no airships to mask
    # where the windows are, so the stage can fly airships past only there
    mask = Image.fromarray((np.clip(bright, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
    mask = mask.resize((W // 2, H // 2), Image.LANCZOS)
    rgba = Image.new('RGBA', mask.size, (255, 255, 255, 0))
    rgba.putalpha(mask)
    rgba.save(os.path.join(DESKTOP, name.replace('.jpg', '-windows.png')), optimize=True)


def airship(name='airship', W=640, Hh=300):
    """A dirigible for the sky: canvas envelope with its seams and netting,
    a wooden gondola trimmed in brass with lit windows, fins, a propeller."""
    x, y = grid(W, Hh)
    cx, cy = -20, -30
    L, D = 520, 150
    ex = (x - cx) / (L / 2)
    ey = (y - cy) / (D / 2)
    e = ex ** 2 + ey ** 2
    env = e < 1
    Henv = np.sqrt(np.clip(1 - e, 0, 1))
    th = np.arctan2(ey, np.sqrt(np.clip(1 - ex ** 2, 1e-4, 1)))
    seams = np.abs(((ey / np.sqrt(np.clip(1 - ex ** 2, 1e-3, 1)) + 1) * 4) % 1 - 0.5) > 0.47
    gores = np.abs((ex * 6) % 1 - 0.5) > 0.48
    net = (np.abs(((ex * 9 + ey * 3) % 1) - 0.5) > 0.485) | (np.abs(((ex * 9 - ey * 3) % 1) - 0.5) > 0.485)
    canvas = np.array([0.84, 0.77, 0.62], np.float32)
    colE = shade_matte(Henv * 0.9, None, np.broadcast_to(canvas, Henv.shape + (3,)), height_px=60, sheen=0.15)
    colE = np.where((seams & env)[..., None], colE * 0.82, colE)
    colE = np.where((gores & env)[..., None], colE * 0.86, colE)
    colE = np.where((net & env & (ey > -0.2))[..., None], colE * 0.7, colE)
    # fins
    fin_up = (x < cx - L * 0.32) & (x > cx - L * 0.5) & (y < cy) & (y > cy - (cx - L * 0.32 - x) * 0.85)
    fin_dn = (x < cx - L * 0.32) & (x > cx - L * 0.5) & (y > cy) & (y < cy + (cx - L * 0.32 - x) * 0.85)
    fins = (fin_up | fin_dn) & ~env
    # gondola with its rigging
    gy0 = cy + D / 2 + 22
    gond = (np.abs(x - cx) < 70) & (y > gy0) & (y < gy0 + 36)
    gond |= (np.abs(x - cx) < 60) & (y >= gy0 + 36) & (y < gy0 + 44)
    win = gond & (np.abs(((x - cx + 60) % 22) - 11) < 5) & (y > gy0 + 9) & (y < gy0 + 21)
    trim = gond & ((np.abs(y - gy0) < 3) | (np.abs(y - (gy0 + 36)) < 2.5))
    rope = np.zeros_like(env)
    for sx in (-52, -18, 18, 52):
        x1, y1, x2, y2 = cx + sx * 1.6, cy + D * 0.42, cx + sx, gy0
        t = np.clip(((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2), 0, 1)
        d = np.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1)))
        rope |= d < 1.1
    # propeller: a blurred disc at the tail of the gondola
    prop = np.hypot((x - (cx - 92)) / 6, (y - (gy0 + 18)) / 26) < 1
    col = np.zeros(x.shape + (3,), np.float32)
    a = np.zeros(x.shape, np.float32)
    col = np.where(env[..., None], colE, col)
    a = np.where(env, 1, a)
    finc = np.array([0.62, 0.5, 0.36], np.float32)
    col = np.where(fins[..., None], finc * (0.8 + 0.2 * (y < cy))[..., None], col)
    a = np.where(fins, 1, a)
    wood = np.array([0.36, 0.2, 0.11], np.float32)
    col = np.where(gond[..., None], wood * (0.8 + 0.25 * fbm(x.shape[1], x.shape[0], 30, 3, SEED + 3, 2))[..., None], col)
    col = np.where(trim[..., None], METALS['brass'] * 0.9, col)
    col = np.where(win[..., None], np.array([1.0, 0.82, 0.48], np.float32), col)
    a = np.where(gond, 1, a)
    col = np.where((rope & ~env & ~gond)[..., None], np.array([0.25, 0.2, 0.15], np.float32), col)
    a = np.where(rope & ~env & ~gond, 0.9, a)
    col = np.where(prop[..., None], np.array([0.3, 0.27, 0.24], np.float32), col)
    a = np.where(prop, np.maximum(a, 0.5), a)
    rgba = np.concatenate([np.clip(col, 0, 1), a[..., None]], -1)
    img = Image.fromarray((rgba * 255).astype(np.uint8)).resize((W, Hh), Image.LANCZOS)
    save_both(img, name + '.png')


if __name__ == '__main__':
    gear('gear-44', 44, 'spoked', 'brass', spokes=5, seed=11, patina=0.25)
    gear('gear-32', 32, 'spoked', 'copper', spokes=4, seed=12, patina=0.35)
    gear('gear-24', 24, 'web', 'brass', holes=6, seed=13, patina=0.2)
    gear('gear-18', 18, 'solid', 'bronze', seed=14, patina=0.3)
    gear('gear-14', 14, 'spoked', 'steel', spokes=3, seed=15)
    gear('gear-10', 10, 'solid', 'brass', seed=16)
    rivet()
    porthole()
    bezel('gauge-bezel', 520)
    dial('gauge-dial', 430, 'gauge')
    needle('gauge-needle', 430)
    bezel('clock-bezel', 520, opening=0.82, screws=4, metal='bronze')
    dial('clock-dial', 440, 'clock')
    hand('clock-hour', 440, 0.48, 0.022, 'hour')
    hand('clock-minute', 440, 0.74, 0.016, 'minute')
    handwheel()
    frame9()
    pipe_parts()
    rack()
    for i in range(3):
        steam(i)
    airship()
    foundry('foundry.jpg', 1920, 1080, [(330, 150, 860, 360), (960, 120, 880, 420), (1590, 150, 860, 360)], [(930, 30), (1000, 22)], SEED + 200)
    foundry('foundry-tall.jpg', 900, 1950, [(450, 300, 1150, 440)], [(1290, 30), (1365, 22)], SEED + 300, darken=0.8)
    for d in (MOBILE, DESKTOP):
        with open(os.path.join(d, 'manifest.json'), 'w') as f:
            json.dump(MANIFEST, f, indent=1)
