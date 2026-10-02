#!/usr/bin/env python3
"""Renders the sketch theme's ("Follow the Bouncing Ball") pencil work.

    python3 packages/mobile/scripts/generate-sketch-assets.py

The sketch theme is an animator's pencil test on a light table: a ball drawn
in graphite bounces from syllable to syllable over the lyrics, the way the old
sing-along cartoons did, with its onion skins and spacing chart beside it.

Nothing here is a vector line with a wobble filter (what made the earlier
version look generic). Every mark is DRAWN: a stroke is a path with pressure
(it lands, presses, lifts and flicks off), a slow human wobble and a slight
overshoot, and the graphite only catches the paper's tooth where the pressure
is light, so a light stroke breaks up into grain and a hard one goes solid.
Passes over one another darken the way pencil does. The physical things on
the desk (the steel pegbar, pencils, masking tape) are rendered as objects
with the same lighting code as the steampunk theme.

Most marks are written as white alpha masks so the apps can tint them (a
singer's coloured pencil, red for corrections, blue for roughs). Writes full
size for the desktop stage (packages/desktop/src/renderer/src/assets/sketch/)
and three quarters for the phone (packages/mobile/assets/sketch/).

Procedural and seeded, so the output is reproducible. Needs numpy, scipy and
Pillow.
"""

import importlib.util
import json
import math
import os

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
MOBILE = os.path.join(HERE, '..', 'assets', 'sketch')
DESKTOP = os.path.join(HERE, '..', '..', 'desktop', 'src', 'renderer', 'src', 'assets', 'sketch')
PREVIEW = os.environ.get('SKETCH_PREVIEW')  # a folder: also write a contact sheet there

for d in (MOBILE, DESKTOP):
    os.makedirs(d, exist_ok=True)

# The steampunk renderer already lights metal well; reuse it for the pegbar.
_spec = importlib.util.spec_from_file_location('steam', os.path.join(HERE, 'generate-steampunk-assets.py'))
steam = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(steam)
value_noise, fbm, smoothstep = steam.value_noise, steam.fbm, steam.smoothstep

SEED = 1928   # the year the first bouncing-ball sing-along reached cinemas
K = 2         # supersampling for pencil work
MANIFEST = {}
WRITTEN = []

# ── paper tooth ──────────────────────────────────────────────────────────────


def tooth(w, h, seed):
    """The paper's surface, 0..1: fine grain plus a faint felt of fibres. A
    pencil deposits graphite on the high points first."""
    r = np.random.default_rng(seed)
    a = nd.gaussian_filter(r.random((h, w)).astype(np.float32), 0.75 * K)
    b = nd.gaussian_filter(r.random((h, w)).astype(np.float32), 1.9 * K)
    f = value_noise(w, h, w / (26.0 * K), h / (7.0 * K), seed + 3)
    t = (a - a.mean()) / (a.std() + 1e-6) * 0.62 + (b - b.mean()) / (b.std() + 1e-6) * 0.3 + (f - 0.5) * 0.5
    return np.clip(0.5 + t * 0.2, 0, 1)


# ── strokes ──────────────────────────────────────────────────────────────────


def spline(ctrl, step=0.45):
    """Dense Catmull-Rom samples through control points."""
    P = np.asarray(ctrl, np.float64)
    if len(P) == 2:
        n = max(2, int(np.hypot(*(P[1] - P[0])) / step))
        t = np.linspace(0, 1, n)[:, None]
        return P[0] * (1 - t) + P[1] * t
    P = np.vstack([P[0] * 2 - P[1], P, P[-1] * 2 - P[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int(np.hypot(*(p2 - p1)) / step))
        t = np.linspace(0, 1, n, endpoint=False)[:, None]
        t2, t3 = t * t, t * t * t
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2][None])
    return np.vstack(out)


def arclen(pts):
    d = np.hypot(*np.diff(pts, axis=0).T)
    return np.concatenate([[0], np.cumsum(d)])


def noise1(n, wl, seed):
    """Smooth 1-D noise in -1..1 with wavelength `wl` samples."""
    r = np.random.default_rng(seed)
    k = max(2, int(n / max(1, wl)) + 3)
    lat = r.random(k) * 2 - 1
    x = np.linspace(0, n / max(1, wl), n)
    i = np.floor(x).astype(int)
    f = x - i
    f = f * f * (3 - 2 * f)
    return lat[i] * (1 - f) + lat[i + 1] * f


def wobble(pts, amp, seed, wl=60.0):
    """A hand never draws a perfect path: drift it sideways, slowly."""
    if amp <= 0:
        return pts
    s = arclen(pts)
    n = len(pts)
    if n < 3:
        return pts
    tang = np.gradient(pts, axis=0)
    tang /= np.maximum(1e-6, np.hypot(*tang.T))[:, None]
    nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
    step = max(1e-6, s[-1] / max(1, n - 1))
    off = noise1(n, wl * K / step, seed) * amp * K + noise1(n, wl * K / step / 4, seed + 1) * amp * K * 0.25
    return pts + nrm * off[:, None]


def pressure(n, seed, land=0.07, lift=0.16, flutter=0.12, base=1.0, lift_to=0.0):
    """Pencil pressure along a stroke: it lands, presses, then lifts and
    flicks off (the tail thins to nothing)."""
    t = np.linspace(0, 1, n)
    p = np.ones(n) * base
    if land > 0:
        p *= smoothstep(0, land, t) * 0.75 + 0.25
    if lift > 0:
        e = smoothstep(1 - lift, 1, t)
        p *= 1 - e * (1 - lift_to)
    p *= 1 + noise1(n, max(8, n / 6), seed) * flutter
    return np.clip(p, 0, 1.2)


class Stroke:
    def __init__(self, pts, width, press, seed=0, wob=0.6, wl=60.0, thin=0.55):
        """pts in output pixels; width = full line width at full pressure."""
        P = spline(np.asarray(pts, np.float64) * K)
        P = wobble(P, wob, seed, wl)
        self.pts = P
        n = len(P)
        pr = press(n) if callable(press) else np.ones(n) * press
        self.p = pr
        # a pencil line thins as pressure lifts, but never vanishes before the tip
        self.r = (width * K / 2) * (thin + (1 - thin) * np.clip(pr, 0, 1))


def layer(w, h, strokes):
    """Deposit of one pass of strokes (they don't darken one another)."""
    hk, wk = h * K, w * K
    ids = np.full((hk, wk), -1, np.int64)
    R = []
    Pp = []
    off = 0
    for s in strokes:
        x = np.round(s.pts[:, 0]).astype(int)
        y = np.round(s.pts[:, 1]).astype(int)
        ok = (x >= 0) & (x < wk) & (y >= 0) & (y < hk)
        ids[y[ok], x[ok]] = off + np.arange(len(x))[ok]
        R.append(s.r)
        Pp.append(s.p)
        off += len(x)
    if off == 0:
        return np.zeros((hk, wk), np.float32)
    R = np.concatenate(R)
    Pp = np.concatenate(Pp)
    d, (iy, ix) = nd.distance_transform_edt(ids < 0, return_indices=True)
    s = ids[iy, ix]
    cov = np.clip(R[s] - d + 0.5, 0, 1)
    # the core of a line takes more graphite than its shoulders
    core = np.clip(1 - d / np.maximum(R[s], 0.5), 0, 1) ** 0.35
    return (cov * np.clip(Pp[s], 0, 1.2) * (0.6 + 0.4 * core)).astype(np.float32)


def deposit(w, h, passes):
    """Several passes: graphite builds up where they cross."""
    acc = np.zeros((h * K, w * K), np.float32)
    for strokes in passes:
        if not strokes:
            continue
        L = layer(w, h, strokes)
        acc = 1 - (1 - acc) * (1 - np.clip(L, 0, 1))
    return acc


def graphite(dep, T, grain=1.0, solid=0.9):
    """Where the pencil actually marks the paper: a heavy deposit covers the
    tooth, a light one only touches its peaks (so it breaks up into grain)."""
    th = 1 - np.clip(dep, 0, 1.2) * (0.9 + 0.2 * (1 - grain))
    vis = smoothstep(th - 0.13, th + 0.13, T)
    tone = np.clip(dep, 0, 1) ** 0.5
    return nd.gaussian_filter(np.clip(vis * tone, 0, 1), 0.35 * K) * solid


def down(a):
    """Supersampled float plane → output resolution."""
    img = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return img.resize((a.shape[1] // K, a.shape[0] // K), Image.LANCZOS)


def mask_png(alpha):
    """A white mark with this alpha, for tinting in the apps."""
    A = down(alpha)
    rgba = Image.new('RGBA', A.size, (255, 255, 255, 0))
    rgba.putalpha(A)
    return rgba


def save(img, name, mobile_scale=0.75, desktop=True, mobile=True, jpeg=False):
    if desktop:
        if jpeg:
            img.convert('RGB').save(os.path.join(DESKTOP, name), quality=90, optimize=True)
        else:
            img.save(os.path.join(DESKTOP, name), optimize=True)
    if mobile:
        w, h = img.size
        small = img.resize((max(1, round(w * mobile_scale)), max(1, round(h * mobile_scale))), Image.LANCZOS)
        if jpeg:
            small.convert('RGB').save(os.path.join(MOBILE, name), quality=88, optimize=True)
        else:
            small.save(os.path.join(MOBILE, name), optimize=True)
    WRITTEN.append((name, img))
    print('wrote', name, img.size)


# ── drawn marks ──────────────────────────────────────────────────────────────


def loop_pts(cx, cy, a, b, start, turns, tilt, seed, wander=0.05, n=72, spiral=0.09):
    """An ellipse drawn freehand: egg-shaped, tilted, its radius breathing as
    the wrist turns, and it spirals past where it started instead of closing."""
    r = np.random.default_rng(seed)
    th = start + np.linspace(0, 2 * math.pi * turns, n)
    e1, e2, ph = r.uniform(0.03, 0.07), r.uniform(0.02, 0.05), r.uniform(0, 6.28)
    shape = 1 + e1 * np.cos(th - ph) + e2 * np.cos(2 * th + ph)
    breathe = 1 + noise1(n, n / 3, seed + 7) * wander
    drift = 1 + np.linspace(0, 1, n) * spiral * turns
    x = np.cos(th) * a * shape * breathe * drift
    y = np.sin(th) * b * shape * breathe * drift
    ct, st = math.cos(tilt), math.sin(tilt)
    return np.stack([cx + x * ct - y * st, cy + x * st + y * ct], 1)


def ring(name, w, h, seed, width=5.0, turns=1.18, second=True):
    r = np.random.default_rng(seed)
    T = tooth(w * K, h * K, seed)
    a, b = w * 0.4, h * 0.36
    start = r.uniform(-2.7, -2.1)
    tilt = r.uniform(-0.09, 0.09)
    s1 = Stroke(loop_pts(w / 2, h / 2, a, b, start, turns, tilt, seed), width,
                lambda n: pressure(n, seed, land=0.04, lift=0.14, flutter=0.3), seed, wob=1.1, wl=80, thin=0.4)
    passes = [[s1]]
    if second:
        s2 = Stroke(loop_pts(w / 2 + r.uniform(-4, 4), h / 2 + r.uniform(-3, 3), a * 0.97, b * 1.03, start + r.uniform(0.6, 1.4), 0.55, tilt + 0.03, seed + 5, spiral=0.05),
                    width * 0.75, lambda n: pressure(n, seed + 1, land=0.15, lift=0.35, flutter=0.3, base=0.55), seed + 9, wob=1.3, wl=60, thin=0.35)
        passes.append([s2])
    save(mask_png(graphite(deposit(w, h, passes), T)), name + '.png')


def underline(name, w, h, seed, width=7.0, curve=0.35):
    """A fast swash under a word: it digs in, runs on, and flicks up off the end."""
    r = np.random.default_rng(seed)
    T = tooth(w * K, h * K, seed)
    y0 = h * 0.66
    ctrl = [(w * 0.02, y0 + h * 0.04), (w * 0.2, y0 + h * 0.02 + r.uniform(-2, 2)), (w * 0.55, y0 - h * curve * 0.12), (w * 0.84, y0 - h * curve * 0.3), (w * 0.95, y0 - h * curve * 0.8), (w * 0.985, y0 - h * curve * 1.5)]
    s = Stroke(ctrl, width, lambda n: pressure(n, seed, land=0.03, lift=0.3, flutter=0.25), seed, wob=1.0, wl=140, thin=0.3)
    save(mask_png(graphite(deposit(w, h, [[s]]), T)), name + '.png')


def box_strokes(w, h, inset, seed, width, over=21):
    """Four ruled-ish lines that overshoot each corner, the way a box is drawn
    fast: each side is its own stroke."""
    r = np.random.default_rng(seed)
    x0, y0, x1, y1 = inset, inset, w - inset, h - inset
    j = lambda: r.uniform(-2.4, 2.4)
    sides = [
        [(x0 - over * r.uniform(0.3, 0.9), y0 + j()), ((x0 + x1) / 2, y0 + j() * 1.2), (x1 + over * r.uniform(0.5, 1.1), y0 + j())],
        [(x1 + j(), y0 - over * r.uniform(0.2, 0.8)), (x1 + j() * 1.2, (y0 + y1) / 2), (x1 + j(), y1 + over * r.uniform(0.4, 1))],
        [(x1 + over * r.uniform(0.2, 0.8), y1 + j()), ((x0 + x1) / 2, y1 + j() * 1.2), (x0 - over * r.uniform(0.5, 1.1), y1 + j())],
        [(x0 + j(), y1 + over * r.uniform(0.2, 0.8)), (x0 + j() * 1.2, (y0 + y1) / 2), (x0 + j(), y0 - over * r.uniform(0.5, 1))],
    ]
    return [Stroke(c, width, lambda n, k=k: pressure(n, seed + k, land=0.05, lift=0.12, flutter=0.28, lift_to=0.25), seed + k * 3, wob=0.7, wl=160, thin=0.45)
            for k, c in enumerate(sides)]


def box9(name, w, h, border, seed, width=4.2, inset=None):
    """A pencilled box, cut into nine pieces for the apps to stretch."""
    inset = inset if inset is not None else border * 0.55
    T = tooth(w * K, h * K, seed)
    st = box_strokes(w, h, inset, seed, width)
    img = mask_png(graphite(deposit(w, h, [st[:2], st[2:]]), T))
    # the stage nine-slices the whole box in CSS; the phone takes the pieces
    save(img, name + '.png', mobile=False)
    b = border
    pieces = {'tl': (0, 0, b, b), 't': (b, 0, w - b, b), 'tr': (w - b, 0, w, b),
              'l': (0, b, b, h - b), 'r': (w - b, b, w, h - b),
              'bl': (0, h - b, b, h), 'b': (b, h - b, w - b, h), 'br': (w - b, h - b, w, h)}
    for k, bx in pieces.items():
        p = img.crop(bx)
        pw, ph = p.size
        p.resize((max(1, round(pw * 0.75)), max(1, round(ph * 0.75))), Image.LANCZOS).save(os.path.join(MOBILE, '%s-%s.png' % (name, k)), optimize=True)
    MANIFEST[name] = {'w': w, 'h': h, 'border': border}


def hatch_strokes(w, h, ang, spacing, seed, length=(60, 150), width=2.6, press=0.75, region=None, jitter=0.5):
    """Parallel hatching made of separate short strokes (a real hatch never
    runs edge to edge in one line), optionally only where `region` is set."""
    r = np.random.default_rng(seed)
    d = np.array([math.cos(ang), math.sin(ang)])
    nrm = np.array([-d[1], d[0]])
    diag = math.hypot(w, h)
    out = []
    c = np.array([w / 2, h / 2])
    k = -diag / 2
    while k < diag / 2:
        t = -diag / 2 - r.uniform(0, length[1])
        while t < diag / 2:
            L = r.uniform(*length)
            a = c + nrm * (k + r.uniform(-jitter, jitter) * spacing * 0.3) + d * t
            b = a + d * L + nrm * r.uniform(-1, 1) * spacing * 0.25
            mid = (a + b) / 2
            if region is None or region(mid[0], mid[1]):
                out.append(Stroke([a, (a * 0.5 + b * 0.5) + nrm * r.uniform(-0.6, 0.6), b], width,
                                  lambda n, s=len(out): pressure(n, seed + s, land=0.12, lift=0.25, flutter=0.2, base=press * r.uniform(0.75, 1.05)),
                                  seed + len(out), wob=0.25, wl=200))
            t += L + r.uniform(-length[0] * 0.15, length[0] * 0.25)
        k += spacing
    return out


def hatch_tile(name, S, seed, ang=-math.pi / 4, spacing=13.0, width=2.4, press=0.62):
    """A seamless tile of hatching: drawn on a 3x3 canvas and cut from the middle."""
    big = S * 3
    st = hatch_strokes(big, big, ang, spacing, seed, length=(S * 0.3, S * 0.75), width=width, press=press)
    T = tooth(big * K, big * K, seed)
    dep = deposit(big, big, [st])
    # tile it: fold every copy onto the middle
    t = dep.reshape(3, S * K, 3, S * K).transpose(0, 2, 1, 3).reshape(9, S * K, S * K)
    tt = T.reshape(3, S * K, 3, S * K).transpose(0, 2, 1, 3).reshape(9, S * K, S * K)
    dep = 1 - np.prod(1 - t, axis=0)
    save(mask_png(graphite(dep, tt[4])), name + '.png')


# ── the ball ─────────────────────────────────────────────────────────────────


def disc(w, h, cx, cy, R):
    y, x = np.mgrid[0:h * K, 0:w * K].astype(np.float32) / K
    return np.hypot(x - cx, y - cy) - R


def ball(S=240, seed=SEED + 41):
    """The hero: a ball drawn the way an animator draws one. A light
    construction circle, a confident outline that gets heavier on the shadow
    side, a hatched core shadow that stops short of the rim (reflected light),
    and the paper left bare for the highlight. Its colour (the singer's
    coloured pencil) is a separate mask laid over it."""
    r = np.random.default_rng(seed)
    T = tooth(S * K, S * K, seed)
    c = S / 2
    R = S * 0.385
    shadow_dir = math.pi / 4  # bottom right (y is down)

    def weighted(n, seed_, base=1.0):
        th = np.linspace(0, 1, n)
        p = pressure(n, seed_, land=0.04, lift=0.1, flutter=0.18, base=base)
        return p

    pts = loop_pts(c, c, R, R * 0.995, -2.5, 1.07, 0.0, seed, wander=0.018, spiral=0.025, n=90)
    ang = np.arctan2(pts[:, 1] - c, pts[:, 0] - c)
    heavy = 0.62 + 0.5 * np.clip(np.cos(ang - shadow_dir), 0, 1)
    out = Stroke(pts, 5.2, lambda n: np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(heavy)), heavy) * pressure(n, seed, land=0.03, lift=0.08, flutter=0.12), seed, wob=0.5, wl=90, thin=0.45)
    # the shadow side gets a second pass, the way you'd go back over it
    th = np.linspace(-0.55, 2.2, 40)
    arc = np.stack([c + np.cos(th) * (R + 1.2), c + np.sin(th) * (R + 1.2)], 1)
    back = Stroke(arc, 4.0, lambda n: pressure(n, seed + 2, land=0.2, lift=0.3, flutter=0.2, base=0.7), seed + 3, wob=0.6, wl=60, thin=0.4)
    cons = Stroke(loop_pts(c + 2.5, c - 1.5, R * 1.035, R * 1.02, -1.2, 1.0, 0.05, seed + 4, wander=0.03, spiral=0.02), 2.6,
                  lambda n: pressure(n, seed + 5, land=0.1, lift=0.2, flutter=0.35, base=0.32), seed + 6, wob=1.2, wl=50, thin=0.5)

    inside = lambda x, y: math.hypot(x - c, y - c) < R - 4
    def crescent(off, rad, rim):
        lx, ly = c - off * R * math.cos(shadow_dir), c - off * R * math.sin(shadow_dir)
        return lambda x, y: math.hypot(x - c, y - c) < R - rim and math.hypot(x - lx, y - ly) > rad * R
    h1 = hatch_strokes(S, S, -math.pi / 4, 4.3, seed + 7, length=(18, 50), width=2.3, press=0.86, region=crescent(0.3, 1.0, 3.5))
    h2 = hatch_strokes(S, S, -math.pi / 4 + 0.6, 4.0, seed + 8, length=(14, 34), width=2.1, press=0.8, region=crescent(0.55, 1.18, 8))
    # graphite worked in with a stump first: a soft tone that turns the form
    yy, xx = np.mgrid[0:S * K, 0:S * K].astype(np.float32) / K
    rr = np.hypot(xx - c, yy - c)
    lx, ly = c - 0.45 * R * math.cos(shadow_dir), c - 0.45 * R * math.sin(shadow_dir)
    turn = smoothstep(0.42 * R, 1.38 * R, np.hypot(xx - lx, yy - ly))
    rim = smoothstep(0, 7, R - 2 - rr) * (1 - 0.45 * smoothstep(R - 10, R - 3, rr) * smoothstep(0.9 * R, 1.3 * R, np.hypot(xx - lx, yy - ly)))
    smudge = nd.gaussian_filter(turn * rim, 2.5 * K) * 0.82
    dep = deposit(S, S, [[out, back], [cons], h1, h2])
    dep = 1 - (1 - dep) * (1 - smudge)
    a = graphite(dep, T)
    # paper inside the outline, so the ball hides what it passes over
    fill = np.clip(0.5 - disc(S, S, c, c, R - 0.5), 0, 1)
    G = np.array([0.17, 0.17, 0.19], np.float32)
    P = np.array([0.945, 0.932, 0.9], np.float32)
    col = P[None, None] * (1 - a[..., None]) + G[None, None] * a[..., None]
    A = np.maximum(fill, a)
    rgba = np.concatenate([col, A[..., None]], -1)
    img = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS)
    save(img, 'ball.png')
    # the coloured pencil: worked over the whole ball except the highlight
    hx, hy = c - 0.36 * R, c - 0.4 * R
    region = lambda x, y: math.hypot(x - c, y - c) < R - 3 and math.hypot(x - hx, y - hy) > 0.2 * R
    t1 = hatch_strokes(S, S, -math.pi / 3, 3.3, seed + 9, length=(22, 70), width=2.7, press=0.78, region=region)
    t2 = hatch_strokes(S, S, -math.pi / 3 + 0.35, 3.8, seed + 10, length=(16, 46), width=2.4, press=0.68, region=lambda x, y: region(x, y) and math.hypot(x - hx, y - hy) > 0.5 * R)
    tone = graphite(deposit(S, S, [t1, t2]), T, solid=0.85)
    save(mask_png(tone), 'ball-tone.png')
    # onion skin: one quick, light lap
    gst = Stroke(loop_pts(c, c, R, R * 0.99, -2.2, 1.04, 0.0, seed + 11, wander=0.02, spiral=0.02), 3.4,
                 lambda n: pressure(n, seed + 12, land=0.05, lift=0.15, flutter=0.3, base=0.75), seed + 13, wob=0.7, wl=70, thin=0.5)
    save(mask_png(graphite(deposit(S, S, [[gst]]), T)), 'ball-ghost.png')
    MANIFEST['ball'] = {'size': S, 'radius': R}


def ball_shadow(w=240, h=64, seed=SEED + 51):
    T = tooth(w * K, h * K, seed)
    reg = lambda x, y: ((x - w / 2) / (w * 0.42)) ** 2 + ((y - h / 2) / (h * 0.3)) ** 2 < 1
    st = hatch_strokes(w, h, -0.18, 4.0, seed, length=(30, 90), width=2.4, press=0.55, region=reg)
    st2 = hatch_strokes(w, h, 0.25, 4.8, seed + 1, length=(20, 60), width=2.2, press=0.5,
                        region=lambda x, y: ((x - w / 2) / (w * 0.3)) ** 2 + ((y - h / 2) / (h * 0.2)) ** 2 < 1)
    save(mask_png(graphite(deposit(w, h, [st, st2]), T)), 'ball-shadow.png')


# ── small marks ──────────────────────────────────────────────────────────────


def arrow(name, w, h, seed, width=5.0):
    r = np.random.default_rng(seed)
    T = tooth(w * K, h * K, seed)
    tip = np.array([w * 0.9, h * 0.62])
    shaft = [(w * 0.06, h * 0.3), (w * 0.35, h * 0.12), (w * 0.66, h * 0.3), tip]
    s1 = Stroke(shaft, width, lambda n: pressure(n, seed, land=0.05, lift=0.06, flutter=0.2), seed, wob=0.8, wl=90, thin=0.5)
    d = tip - np.array(shaft[-2])
    d /= np.linalg.norm(d)
    nn = np.array([-d[1], d[0]])
    L = h * 0.32
    a1 = tip - d * L + nn * L * 0.62
    a2 = tip - d * L - nn * L * 0.62
    s2 = Stroke([a1, tip + d * 2], width * 0.95, lambda n: pressure(n, seed + 1, land=0.08, lift=0.05, flutter=0.15), seed + 2, wob=0.3)
    s3 = Stroke([tip + d * 1.5, a2], width * 0.95, lambda n: pressure(n, seed + 3, land=0.03, lift=0.35, flutter=0.15), seed + 4, wob=0.3)
    save(mask_png(graphite(deposit(w, h, [[s1], [s2, s3]]), T)), name + '.png')


def check(name='check', S=140, seed=SEED + 61, width=7.0):
    T = tooth(S * K, S * K, seed)
    st = Stroke([(S * 0.14, S * 0.56), (S * 0.3, S * 0.7), (S * 0.42, S * 0.83), (S * 0.62, S * 0.48), (S * 0.9, S * 0.1)], width,
                lambda n: pressure(n, seed, land=0.08, lift=0.3, flutter=0.15), seed, wob=0.6, wl=60, thin=0.35)
    save(mask_png(graphite(deposit(S, S, [[st]]), T)), name + '.png')


def cross(name='cross', S=140, seed=SEED + 63, width=6.5):
    T = tooth(S * K, S * K, seed)
    a = Stroke([(S * 0.18, S * 0.16), (S * 0.5, S * 0.5), (S * 0.84, S * 0.86)], width, lambda n: pressure(n, seed, land=0.05, lift=0.25), seed, wob=0.5)
    b = Stroke([(S * 0.82, S * 0.18), (S * 0.5, S * 0.52), (S * 0.16, S * 0.84)], width, lambda n: pressure(n, seed + 1, land=0.05, lift=0.25), seed + 1, wob=0.5)
    save(mask_png(graphite(deposit(S, S, [[a], [b]]), T)), name + '.png')


def scribble(name, w, h, seed, width=4.0, loops=11, press=0.8):
    """Scribbled out: one continuous back-and-forth stroke, leaning, uneven,
    turning in loops rather than points."""
    r = np.random.default_rng(seed)
    T = tooth(w * K, h * K, seed)
    pts = []
    x = w * 0.05
    for i in range(loops * 2 + 1):
        up = i % 2 == 0
        x += w * 0.84 / (loops * 2) * r.uniform(0.6, 1.4)
        lean = h * 0.18 * (1 if up else -1)
        y = h * (0.12 + r.uniform(0, 0.12) if up else 0.88 - r.uniform(0, 0.14))
        pts.append((min(w * 0.95, x + lean), y))
    st = Stroke(pts, width, lambda n: pressure(n, seed, land=0.03, lift=0.08, flutter=0.3, base=press), seed, wob=1.4, wl=30, thin=0.5)
    back = [(px + r.uniform(-6, 6), py + r.uniform(-6, 6)) for px, py in pts[::-1][::2]]
    st2 = Stroke(back, width * 0.8, lambda n: pressure(n, seed + 1, land=0.05, lift=0.2, flutter=0.3, base=press * 0.7), seed + 2, wob=1.6, wl=30, thin=0.5)
    save(mask_png(graphite(deposit(w, h, [[st], [st2]]), T)), name + '.png')


def swatch(name='swatch', S=150, seed=SEED + 71):
    """A coloured-pencil test swatch: worked back and forth until it's filled."""
    r = np.random.default_rng(seed)
    T = tooth(S * K, S * K, seed)
    c = S / 2
    R = S * 0.4
    reg = lambda x, y: math.hypot(x - c, (y - c) * 1.04) < R + r.uniform(-3, 3)
    a = hatch_strokes(S, S, -math.pi / 4, 3.6, seed, length=(30, 90), width=3.0, press=0.78, region=reg)
    b = hatch_strokes(S, S, math.pi / 5, 4.4, seed + 1, length=(20, 60), width=2.6, press=0.6, region=lambda x, y: math.hypot(x - c, y - c) < R * 0.9)
    edge = Stroke(loop_pts(c, c, R * 1.02, R * 1.0, -2.0, 1.05, 0.1, seed + 2, wander=0.05, spiral=0.03), 3.2,
                  lambda n: pressure(n, seed + 3, land=0.05, lift=0.2, flutter=0.3, base=0.75), seed + 4, wob=1.0, wl=50)
    save(mask_png(graphite(deposit(S, S, [a, b, [edge]]), T)), name + '.png')


def note(name='note', w=120, h=170, seed=SEED + 81):
    """A quaver doodled in the margin."""
    T = tooth(w * K, h * K, seed)
    hx, hy = w * 0.36, h * 0.8
    head = hatch_strokes(w, h, -0.9, 3.0, seed, length=(10, 26), width=3.0, press=0.95,
                         region=lambda x, y: ((x - hx) / (w * 0.22)) ** 2 + ((y - hy) / (h * 0.1)) ** 2 < 1 and True)
    rim = Stroke(loop_pts(hx, hy, w * 0.22, h * 0.1, -2.4, 1.1, -0.45, seed + 1, wander=0.05, spiral=0.03), 3.6,
                 lambda n: pressure(n, seed + 2, land=0.05, lift=0.15), seed + 3, wob=0.6, wl=40)
    sx = hx + w * 0.2
    stem = Stroke([(sx, hy - h * 0.03), (sx + 1, h * 0.42), (sx + 2, h * 0.08)], 4.6, lambda n: pressure(n, seed + 4, land=0.08, lift=0.04), seed + 5, wob=0.4)
    flag = Stroke([(sx + 2, h * 0.08), (sx + w * 0.22, h * 0.2), (sx + w * 0.3, h * 0.34), (sx + w * 0.18, h * 0.5)], 4.2,
                  lambda n: pressure(n, seed + 6, land=0.04, lift=0.4), seed + 7, wob=0.6, wl=40)
    save(mask_png(graphite(deposit(w, h, [head, [rim], [stem, flag]]), T)), name + '.png')


def hold_line(name='hold-line', w=900, h=70, seed=SEED + 91):
    """The wavy line an animator runs down an exposure sheet to say 'hold'."""
    T = tooth(w * K, h * K, seed)
    xs = np.linspace(w * 0.02, w * 0.98, 60)
    ys = h / 2 + np.sin(xs / w * math.pi * 13) * h * 0.24 * (1 - 0.35 * xs / w)
    st = Stroke(np.stack([xs, ys], 1), 4.6, lambda n: pressure(n, seed, land=0.03, lift=0.06, flutter=0.15), seed, wob=0.9, wl=50)
    save(mask_png(graphite(deposit(w, h, [[st]]), T)), name + '.png')


def tooth_wrap(S, seed):
    r = np.random.default_rng(seed)
    a = nd.gaussian_filter(r.random((S, S)).astype(np.float32), 0.75 * K, mode='wrap')
    b = nd.gaussian_filter(r.random((S, S)).astype(np.float32), 1.9 * K, mode='wrap')
    f = nd.gaussian_filter(r.random((S, S)).astype(np.float32), (9 * K, 2.5 * K), mode='wrap')
    t = (a - a.mean()) / a.std() * 0.62 + (b - b.mean()) / b.std() * 0.3 + (f - f.mean()) / f.std() * 0.22
    return np.clip(0.5 + t * 0.2, 0, 1)


def grain(name='grain', S=256, seed=SEED + 95, dep=0.8):
    """A seamless tile of how pencil breaks up on this paper, for the apps to
    mask vector lines and lettering with (so a ruled line reads as pencil)."""
    T = tooth_wrap(S * K, seed)
    a = graphite(np.full((S * K, S * K), dep, np.float32), T, solid=1.0)
    a = nd.gaussian_filter(smoothstep(0.0, 0.85, a), 0.3 * K, mode='wrap')
    save(mask_png(a), name + '.png', mobile=False)


# ── tape ─────────────────────────────────────────────────────────────────────


def tape(name, w, h, seed, ends=(True, True), keep=True):
    """Masking tape: translucent creped paper with torn ends."""
    r = np.random.default_rng(seed)
    W, H = w * K, h * K
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    m = 9 * K
    top, bot = m * 0.9, H - m * 1.2
    tear = lambda s: (noise1(H, 4 * K, s) * 0.5 + noise1(H, 1.2 * K, s + 1) * 0.5) * 8 * K
    lx = (m + tear(seed)) if ends[0] else np.full(H, float(m))
    rx = (W - m + tear(seed + 5)) if ends[1] else np.full(H, float(W - m))
    inside = (x > lx[:, None]) & (x < rx[:, None]) & (y > top) & (y < bot)
    A = nd.gaussian_filter(inside.astype(np.float32), 0.6 * K)
    # fibres pull out of a torn end
    fib = (r.random((H, W)) > 0.82).astype(np.float32)
    near = (np.abs(x - lx[:, None]) < 2.2 * K) | (np.abs(x - rx[:, None]) < 2.2 * K)
    A = np.maximum(A, nd.gaussian_filter(fib * near, 0.5 * K) * 0.6 * ((y > top) & (y < bot)))
    # the crepe: very fine wrinkles across the tape, softened (it's paper, not grain)
    crepe = nd.gaussian_filter(value_noise(W, H, W / (1.6 * K), H / (70.0 * K), seed + 2), (0.6 * K, 0.4 * K))
    blotch = fbm(W, H, 5, 2, seed + 3, octaves=4)
    base = np.array([0.93, 0.895, 0.79], np.float32)
    lum = 0.955 + 0.016 * (crepe - 0.5) + 0.06 * (blotch - 0.5)
    edge = smoothstep(0, 2.5 * K, y - top) * smoothstep(0, 2.5 * K, bot - y)
    lum *= 0.94 + 0.06 * edge
    col = base[None, None] * lum[..., None]
    alpha = A * (0.76 + 0.1 * (blotch - 0.5) + 0.02 * (crepe - 0.5))
    # its shadow on the paper, barely there (it's thin)
    sh = nd.shift(A, (1.4 * K, 0.6 * K), order=1)
    sh = nd.gaussian_filter(sh, 1.6 * K) * 0.22
    a_out = alpha + sh * (1 - alpha)
    c_out = (col * alpha[..., None] + np.array([0.35, 0.3, 0.24]) * (sh * (1 - alpha))[..., None]) / np.maximum(a_out, 1e-4)[..., None]
    rgba = np.concatenate([np.clip(c_out, 0, 1), a_out[..., None]], -1)
    img = Image.fromarray((rgba * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)
    if keep:
        save(img, name + '.png')
    else:
        WRITTEN.append((name + '.png', img))
    return img


def tape_strip(name='tape-long', w=900, h=92, cap=70, seed=SEED + 101):
    """A strip of tape of any length, for the phone's primary button: two torn
    caps and a middle that stretches."""
    img = tape(name, w, h, seed, keep=False)
    for k, bx in {'l': (0, 0, cap, h), 'm': (cap, 0, w - cap, h), 'r': (w - cap, 0, w, h)}.items():
        p = img.crop(bx)
        pw, ph = p.size
        p.resize((max(1, round(pw * 0.75)), max(1, round(ph * 0.75))), Image.LANCZOS).save(os.path.join(MOBILE, '%s-%s.png' % (name, k)), optimize=True)
    MANIFEST[name] = {'w': w, 'h': h, 'cap': cap}


# ── pencils ──────────────────────────────────────────────────────────────────


def pencil(name, body, lead, ferrule='gold', eraser=True, L=1000, Wd=58, seed=SEED + 111):
    """A hexagonal wooden pencil lying flat, tip to the right: lacquered facets,
    a crimped ferrule and eraser, and a sharpened cone whose paint ends in the
    scallops a hex pencil always gets."""
    S2 = 2
    pad = 22
    W, H = (L + pad * 2) * S2, (Wd + pad * 2) * S2
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    x = x / S2 - pad
    u = (y / S2 - pad) - Wd / 2          # across the pencil, -Wd/2..Wd/2
    Rc = Wd / 2
    Rf = Rc * math.cos(math.pi / 6)
    au = np.abs(u)
    # surface distance from the axis at lateral u, and the facet normal
    mid = au < Rc / 2
    hgt = np.where(mid, Rf, Rf * np.clip((Rc - au) / (Rc / 2), 0, 1))
    dist = np.sqrt(au ** 2 + hgt ** 2)
    nz = np.where(mid, 1.0, 0.5)
    ny = np.where(mid, 0.0, np.sign(u) * 0.866)
    xe, xf, xb, xc, xl = (18 if eraser else 0), (18 if eraser else 0) + 70, 0, L - 150, L - 38
    xb = xf
    slope = (Rc - Rc * 0.2) / (xl - xc)
    r_at = np.clip(Rc - (x - xc) * slope, 0, Rc)
    r_at = np.where(x > xl, np.clip(Rc * 0.2 - (x - xl) * (Rc * 0.2 / (L - xl)), 0, None), r_at)
    paint_end = xc + (Rc - dist) / slope
    L3 = np.array([-0.35, -0.62, 0.7], np.float32)
    L3 /= np.linalg.norm(L3)
    col = np.zeros((H, W, 3), np.float32)
    A = np.zeros((H, W), np.float32)
    rng = np.random.default_rng(seed)
    # lacquered body
    body_m = (x >= xb) & (x < paint_end) & (au <= Rc)
    diff = np.clip(ny * L3[1] + nz * L3[2], 0, 1)
    hv = np.array([L3[0], L3[1], L3[2] + 1])
    hv /= np.linalg.norm(hv)
    spec = np.clip(ny * hv[1] + nz * hv[2], 0, 1) ** 60
    # a rounded lacquer edge between facets catches a line of light
    ridge = np.exp(-((au - Rc / 2) / 1.1) ** 2) * (u < 0)
    bc = np.array(body, np.float32)
    lac = bc[None, None] * (0.38 + 0.72 * diff)[..., None] + (spec * 0.55 + ridge * 0.35)[..., None]
    col[body_m] = lac[body_m]
    A[body_m] = 1
    # wood cone
    cone_m = (x >= paint_end) & (x < xl) & (au <= r_at)
    cu = np.clip(u / np.maximum(r_at, 1e-3), -1, 1)
    cn_y, cn_z = cu, np.sqrt(np.clip(1 - cu * cu, 0, 1))
    cd = np.clip(cn_y * L3[1] * 0.9 + cn_z * L3[2] + 0.25 * -L3[0], 0, 1)
    grain_w = value_noise(W, H, W / 140.0, H / 5.0, seed + 1)
    wood = np.array([0.86, 0.68, 0.48], np.float32)[None, None] * (0.55 + 0.55 * cd)[..., None] * (0.9 + 0.18 * grain_w)[..., None]
    # sharpener facets: faint rings around the cone
    wood *= (0.96 + 0.04 * np.sin(x * 0.9 + grain_w * 4))[..., None]
    col[cone_m] = wood[cone_m]
    A[cone_m] = 1
    # lead
    lead_m = (x >= xl) & (x <= L) & (au <= r_at)
    lc = np.array(lead, np.float32)
    ld = np.clip(cn_y * L3[1] + cn_z * L3[2], 0, 1)
    lspec = np.clip(cn_y * hv[1] + cn_z * hv[2], 0, 1) ** 30 * (0.45 if sum(lead) < 0.9 else 0.25)
    col[lead_m] = (lc[None, None] * (0.5 + 0.6 * ld)[..., None] + lspec[..., None])[lead_m]
    A[lead_m] = 1
    if eraser:
        # ferrule: a crimped metal band
        fer_m = (x >= xe) & (x < xf) & (au <= Rc * 0.96)
        fu = np.clip(u / (Rc * 0.96), -1, 1)
        fn_y, fn_z = fu, np.sqrt(np.clip(1 - fu * fu, 0, 1))
        fd = np.clip(fn_y * L3[1] + fn_z * L3[2], 0, 1)
        fs = np.clip(fn_y * hv[1] + fn_z * hv[2], 0, 1) ** 40
        crimp = 1 - 0.32 * ((np.abs(((x - xe) % 11) - 5.5) < 1.4) & (((x - xe) < 22) | ((x - xe) > 48)))
        mc = np.array([0.86, 0.7, 0.36] if ferrule == 'gold' else [0.74, 0.75, 0.77], np.float32)
        fcol = mc[None, None] * (0.25 + 0.85 * fd)[..., None] * crimp[..., None] + fs[..., None] * 0.8
        col[fer_m] = fcol[fer_m]
        A[fer_m] = 1
        er_m = (x >= 0) & (x < xe) & (au <= Rc * 0.9)
        eu = np.clip(u / (Rc * 0.9), -1, 1)
        en_y, en_z = eu, np.sqrt(np.clip(1 - eu * eu, 0, 1))
        ed = np.clip(en_y * L3[1] + en_z * L3[2], 0, 1)
        ecol = np.array([0.88, 0.52, 0.52], np.float32)[None, None] * (0.45 + 0.6 * ed)[..., None]
        # the worn, rounded end
        end = smoothstep(0, 6, x) * 0.25 + 0.75
        col[er_m] = (ecol * end[..., None])[er_m]
        A[er_m] = 1
    A = nd.gaussian_filter(A, 0.6)
    # a soft shadow on the paper below it
    sh = nd.gaussian_filter(nd.shift((A > 0.5).astype(np.float32), (7 * S2, 4 * S2), order=0), 7 * S2) * 0.38
    a_out = A + sh * (1 - A)
    c_out = (col * A[..., None] + np.array([0.27, 0.24, 0.2]) * (sh * (1 - A))[..., None]) / np.maximum(a_out, 1e-4)[..., None]
    rgba = np.concatenate([np.clip(c_out, 0, 1), a_out[..., None]], -1)
    img = Image.fromarray((rgba * 255).astype(np.uint8)).resize((W // S2, H // S2), Image.LANCZOS)
    save(img, name + '.png')


# ── paper ────────────────────────────────────────────────────────────────────

PAPER = np.array([0.955, 0.94, 0.905], np.float32)


def paper_sheet(w, h, seed, glow=(0.5, 0.56), ghosts=True):
    """Animation bond on a light table: warm white, lit from underneath (so
    it glows in the middle), with its fibres, its tooth, and the faint
    remains of roughs that were drawn and erased."""
    r = np.random.default_rng(seed)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    g = np.exp(-(((x - glow[0] * w) / (0.62 * w)) ** 2 + ((y - glow[1] * h) / (0.7 * h)) ** 2))
    col = PAPER[None, None] * (0.925 + 0.085 * g)[..., None]
    # the edges of the sheet are further from the lamp: warmer and a touch darker
    col *= np.array([1.0, 0.992, 0.975])[None, None] * (1 - 0.03 * (1 - g))[..., None] + np.array([0, 0, 0.03])[None, None] * g[..., None]
    T = tooth(w, h, seed)
    col *= (1 + (T - 0.5) * 0.045)[..., None]
    blot = fbm(w, h, 7, 5, seed + 1, octaves=5)
    col *= (1 + (blot - 0.5) * 0.025)[..., None]
    # fibres: short curls, some darker, some lighter, all barely there
    fib_d, fib_l = [], []
    n_f = int(w * h / 900)
    for i in range(n_f):
        x0, y0 = r.uniform(0, w), r.uniform(0, h)
        a = r.uniform(0, math.pi)
        L = r.uniform(5, 24)
        bend = r.uniform(-0.6, 0.6)
        pts = [(x0, y0), (x0 + math.cos(a) * L * 0.5 + bend * 3, y0 + math.sin(a) * L * 0.5 - bend * 3), (x0 + math.cos(a + bend) * L, y0 + math.sin(a + bend) * L)]
        st = Stroke(pts, r.uniform(0.5, 1.1), r.uniform(0.4, 1.0), i, wob=0.2)
        (fib_d if r.random() < 0.55 else fib_l).append(st)
    global K
    k0 = K
    K = 1
    try:
        for i, st in enumerate(fib_d + fib_l):
            st.pts /= k0
            st.r /= k0
        dark = layer(w, h, fib_d)
        light = layer(w, h, fib_l)
        col *= (1 - dark * 0.05)[..., None]
        col += (light * 0.03)[..., None]
        if ghosts:
            # erased roughs: a construction ellipse or two, guidelines, in blue
            gs = []
            for i in range(int(3 + r.integers(0, 3))):
                cx, cy = r.uniform(0.1, 0.9) * w, r.uniform(0.15, 0.9) * h
                gs.append(Stroke(loop_pts(cx, cy, r.uniform(40, 140), r.uniform(30, 110), r.uniform(0, 6), r.uniform(0.8, 1.2), r.uniform(-0.5, 0.5), seed + 30 + i), 2.2,
                                 lambda n, i=i: pressure(n, seed + 40 + i, land=0.1, lift=0.2, flutter=0.4, base=0.7), seed + 50 + i, wob=1.0))
            for i in range(int(2 + r.integers(0, 3))):
                yy = r.uniform(0.15, 0.95) * h
                x0 = r.uniform(0, 0.4) * w
                gs.append(Stroke([(x0, yy), (x0 + r.uniform(0.25, 0.6) * w, yy + r.uniform(-6, 6))], 1.6, 0.8, seed + 60 + i, wob=0.4))
            ghost = nd.gaussian_filter(layer(w, h, gs), 1.4)
            blue = np.array([0.45, 0.64, 0.86], np.float32)
            col = col * (1 - ghost[..., None] * 0.07) + blue[None, None] * (ghost[..., None] * 0.07)
            # graphite smudges where a hand rested
            for i in range(3):
                cx, cy = r.uniform(0.1, 0.9) * w, r.uniform(0.2, 0.95) * h
                sm = np.exp(-(((x - cx) / r.uniform(60, 160)) ** 2 + ((y - cy) / r.uniform(18, 50)) ** 2))
                col *= (1 - sm * r.uniform(0.012, 0.025))[..., None]
    finally:
        K = k0
    return np.clip(col, 0, 1)


def stage_paper(W=1920, H=1080, seed=SEED + 201):
    """The desktop stage: the sheet fills the screen; along the top is the
    animation desk's steel edge with the pegbar, its pegs up through the
    sheet's punched holes."""
    col = paper_sheet(W, H, seed)
    edge = 44
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    # the desk's painted steel edge above the sheet
    band = y < edge
    steel = np.array([0.2, 0.215, 0.21], np.float32)
    bn = fbm(W, edge, 40, 2, seed + 1, octaves=4)
    bandcol = steel[None, None] * (0.85 + 0.25 * bn[..., None]) * (0.8 + 0.2 * (y[:edge] / edge))[..., None]
    col[:edge] = bandcol
    # the paper's edge: crisp, the faintest shadow on the steel above it
    col[edge - 6:edge] *= (0.55 + 0.45 * smoothstep(edge - 6, edge, y[edge - 6:edge]))[..., None]
    col[edge:edge + 2] *= 1.012
    # pegbar: a steel bar on the desk, running under the sheet
    SSs = steam.SS
    bw, bh = 820, 34
    bx0 = (W - bw) // 2
    Hs = np.zeros((edge * SSs, W * SSs), np.float32)
    yy, xx = np.mgrid[0:edge * SSs, 0:W * SSs].astype(np.float32) / SSs
    bar = (xx > bx0) & (xx < bx0 + bw) & (yy > 10)
    Hb = steam.bevel(bar, 3 * SSs) * 0.6
    Ab = nd.gaussian_filter(bar.astype(np.float32), 0.6 * SSs)
    img = steam.shade(Hb, Ab, steam.METALS['steel'], seed + 5, 6, grime=0.5, wear=0.6, shine=0.8, scratches=10)
    bar_rgba = np.asarray(img).astype(np.float32) / 255
    a = bar_rgba[..., 3:4]
    col[:edge] = col[:edge] * (1 - a) + bar_rgba[..., :3] * a
    # punched holes in the paper, pegs up through them
    pegs = [('round', W / 2, 0), ('slot', W / 2 - 340, 0), ('slot', W / 2 + 340, 0)]
    py = edge + 20
    for kind, cx, _ in pegs:
        S = 140
        Hh = np.zeros((S * SSs // 2, S * SSs), np.float32)
        hy, hx = np.mgrid[0:S * SSs // 2, 0:S * SSs].astype(np.float32) / SSs
        lx, ly = hx - S / 2, hy - S / 4
        if kind == 'round':
            hole = np.hypot(lx, ly) < 13.5
            peg = np.hypot(lx, ly) < 11
            Hp = np.sqrt(np.clip(1 - (np.hypot(lx, ly) / 11) ** 2, 0, 1)) * peg
        else:
            q = np.maximum(np.abs(lx) - 36, 0)
            hole = np.hypot(q, ly) < 9.5
            peg = np.hypot(np.maximum(np.abs(lx) - 35, 0), ly) < 7
            Hp = np.sqrt(np.clip(1 - (np.hypot(np.maximum(np.abs(lx) - 35, 0), ly) / 7) ** 2, 0, 1)) * peg
        Ap = nd.gaussian_filter(peg.astype(np.float32), 0.5 * SSs)
        pimg = steam.shade(Hp * 0.8, Ap, steam.METALS['steel'], seed + 7, 9, grime=0.4, wear=0.8, shine=1.0, scratches=3)
        prgba = np.asarray(pimg).astype(np.float32) / 255
        hole_a = np.asarray(Image.fromarray((nd.gaussian_filter(hole.astype(np.float32), 0.6 * SSs) * 255).astype(np.uint8)).resize((S, S // 2), Image.LANCZOS)).astype(np.float32) / 255
        x0, y0 = int(cx - S / 2), int(py - S / 4)
        reg = col[y0:y0 + S // 2, x0:x0 + S]
        # through the hole: the light table's glass, brighter than the paper
        glass = np.array([0.99, 0.985, 0.965], np.float32)
        reg = reg * (1 - hole_a[..., None]) + glass * hole_a[..., None]
        # the hole's cut edge, a hairline of shadow
        ring_a = np.clip(nd.gaussian_filter(hole_a, 1.2) - hole_a, 0, 1) * 0.6
        reg *= (1 - ring_a[..., None] * 0.35)
        pa = prgba[..., 3:4]
        reg = reg * (1 - pa) + prgba[..., :3] * pa
        col[y0:y0 + S // 2, x0:x0 + S] = reg
    MANIFEST['stage_paper'] = {'edge': edge, 'pegY': py, 'pegs': [p[1] for p in pegs]}
    img = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8))
    img.save(os.path.join(DESKTOP, 'paper.jpg'), quality=90, optimize=True)
    WRITTEN.append(('paper.jpg', img))
    print('wrote paper.jpg', img.size)


def phone_paper(W=900, H=1950, seed=SEED + 211):
    col = paper_sheet(W, H, seed, glow=(0.5, 0.42))
    img = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8))
    img.save(os.path.join(MOBILE, 'paper-tall.jpg'), quality=88, optimize=True)
    WRITTEN.append(('paper-tall.jpg', img))
    print('wrote paper-tall.jpg', img.size)


def contact_sheet():
    if not PREVIEW:
        return
    os.makedirs(PREVIEW, exist_ok=True)
    pad = 16
    W = 1500
    x = y = pad
    rowh = 0
    tiles = []
    for name, img in WRITTEN:
        im = img.copy()
        im.info['mask'] = im.mode == 'RGBA' and np.asarray(im)[..., :3].min() == 255
        if im.width > 700:
            im = im.resize((700, round(im.height * 700 / im.width)), Image.LANCZOS)
        if x + im.width > W:
            x = pad
            y += rowh + pad
            rowh = 0
        tiles.append((x, y, im, img.mode == 'RGBA' and np.asarray(img)[..., :3].min() == 255))
        x += im.width + pad
        rowh = max(rowh, im.height)
    H = y + rowh + pad
    sheet = Image.new('RGB', (W, H), (244, 240, 230))
    for x, y, im, is_mask in tiles:
        if im.mode == 'RGBA':
            ink = Image.new('RGBA', im.size, (40, 40, 44, 255))
            a = im.getchannel('A')
            if is_mask:  # a white mask: show it in graphite
                ink.putalpha(a)
                sheet.paste(ink, (x, y), ink)
            else:
                sheet.paste(im, (x, y), im)
        else:
            sheet.paste(im, (x, y))
    sheet.save(os.path.join(PREVIEW, 'contact.png'))
    print('contact sheet', sheet.size)


if __name__ == '__main__':
    only = os.environ.get('ONLY')
    ring('ring-0', 440, 230, SEED + 1)
    ring('ring-1', 440, 230, SEED + 2)
    ring('ring-2', 520, 200, SEED + 3)
    ring('ring-r', 260, 260, SEED + 4, width=4.6)
    underline('underline-0', 800, 70, SEED + 11)
    underline('underline-1', 800, 70, SEED + 12, curve=0.2)
    underline('underline-2', 500, 60, SEED + 13, width=6.0, curve=0.45)
    # short and thick, for underlining a word as it's sung
    underline('under-0', 360, 44, SEED + 14, width=9.5, curve=0.3)
    underline('under-1', 360, 44, SEED + 15, width=9.0, curve=0.2)
    box9('box', 420, 220, 36, SEED + 21)
    hatch_tile('hatch', 256, SEED + 31)
    ball()
    ball_shadow()
    arrow('arrow-0', 320, 150, SEED + 121)
    arrow('arrow-1', 260, 180, SEED + 122)
    check()
    cross()
    scribble('scribble', 420, 110, SEED + 131)
    swatch()
    note()
    hold_line()
    grain()
    for i in range(3):
        tape('tape-%d' % i, 300, 92, SEED + 141 + i)
    tape_strip()
    pencil('pencil-hb', (0.95, 0.72, 0.12), (0.2, 0.2, 0.22), 'gold')
    pencil('pencil-blue', (0.22, 0.45, 0.78), (0.3, 0.55, 0.88), 'silver', seed=SEED + 112)
    pencil('pencil-red', (0.78, 0.18, 0.2), (0.86, 0.26, 0.26), 'silver', seed=SEED + 113)
    stage_paper()
    phone_paper()
    contact_sheet()
    for d in (MOBILE, DESKTOP):
        with open(os.path.join(d, 'manifest.json'), 'w') as f:
            json.dump(MANIFEST, f, indent=1)
