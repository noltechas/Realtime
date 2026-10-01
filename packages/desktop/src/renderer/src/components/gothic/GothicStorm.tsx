// The storm, seen through the cathedral's glass. One full-screen fragment
// shader, because nothing else can do what it does: the window panes are
// fogged with condensation, rain beads up on them, and the heavier drops run,
// wiping clear tracks behind them, and every drop is a tiny lens that refracts
// a sharp, inverted view of whatever is outside. What is outside is either the
// night sky (clouds lit by a hidden moon, and the lightning), or, while a song
// plays, the song's own album art, so the performance is watched through a
// rain-streaked window.
//
// All of it is written from first principles here (hashed grid cells, a dome
// height field per drop, finite-difference normals, mip-level blur for the fog)
// rather than adapted from any published rain shader.
//
// ── Performance contract ─────────────────────────────────────────────────────
//   • HALF RESOLUTION, ON PURPOSE. The fog is a blur and the drops are soft
//     lenses; neither needs native pixels. dpr starts at 0.6 and the monitor
//     walks it down to 0.42 if frames slip. Four times cheaper than native.
//   • ONE DRAW. A single quad; no scene graph, no lights, no post-processing.
//   • THE STORM YIELDS TO THE LYRICS. `performing` thins the rain, dims the pane
//     and slows the lightning clock (see storm.ts), so the words keep the room.

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { sampleStorm, setStormMood } from './storm'

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform vec2 uRes;
  uniform float uTime;
  uniform float uFlash;
  uniform float uBolt;
  uniform float uBoltX;
  uniform float uSeed;
  uniform sampler2D uArt;
  uniform float uHasArt;
  uniform float uArtAspect;
  uniform float uArtFade;
  uniform float uDim;
  uniform float uRain;
  uniform vec2 uMoon;
  uniform float uWarm;

  // ── hashing / noise ──────────────────────────────────────────────────────
  float h21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec3 h32(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 5; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return s;
  }
  float fbm3(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 3; i++) {
      s += a * vnoise(p);
      p = p * 2.07 + vec2(5.3, 1.1);
      a *= 0.5;
    }
    return s;
  }

  // ── the glass ────────────────────────────────────────────────────────────
  // Beads: condensation drops that swell, sit, and evaporate, each a dome.
  float beads(vec2 p, float scale, float t, float seed, float density) {
    vec2 g = p * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec3 r = h32(id + seed);
    if (r.z > density) return 0.0;
    vec2 c = (r.xy - 0.5) * 0.62;
    float life = fract(t * (0.03 + r.y * 0.045) + r.x * 7.13);
    float grow = smoothstep(0.0, 0.2, life) * (1.0 - smoothstep(0.74, 1.0, life));
    float rad = (0.14 + 0.24 * r.y) * grow;
    vec2 d = (f - c) / max(rad, 1e-4);
    float q = 1.0 - dot(d, d);
    return q > 0.0 ? sqrt(q) * (0.4 + 0.6 * grow) : 0.0;
  }

  // Runnels: a drop heavy enough to run. It hesitates and lurches down a
  // wandering path, and wipes a clear track through the fog behind it, leaving
  // a few small beads in the track.
  float runnels(vec2 p, float t, float seed, float cols, float density, out float track) {
    float cx = p.x * cols;
    float col = floor(cx);
    vec3 r = h32(vec2(col, seed));
    track = 0.0;
    if (r.z > density) return 0.0;
    float speed = 0.045 + 0.065 * r.y;
    float cyc = t * speed + r.x * 11.0;
    float pass = floor(cyc);
    vec3 q = h32(vec2(col * 1.37 + pass * 7.9, seed + 2.0));
    float prog = fract(cyc);
    prog = prog + 0.03 * sin(prog * 29.0 + q.x * 6.2831);
    float headY = 1.14 - prog * 1.34;
    float lx = fract(cx);
    float pathX = 0.5 + (q.x - 0.5) * 0.46
      + 0.065 * sin(p.y * 17.0 + q.y * 6.2831)
      + 0.035 * sin(p.y * 43.0 + q.z * 6.2831);
    float dx = (lx - pathX) / cols;
    float dy = p.y - headY;
    float rad = 0.010 + 0.008 * q.y;
    vec2 hd = vec2(dx, dy * (dy > 0.0 ? 0.5 : 1.05)) / rad;
    float hq = 1.0 - dot(hd, hd);
    float head = hq > 0.0 ? sqrt(hq) : 0.0;
    float above = step(0.0, dy);
    float len = 0.16 + 0.26 * q.z;
    float fade = above * (1.0 - smoothstep(0.0, len, dy));
    track = fade * smoothstep(rad * 1.15, rad * 0.35, abs(dx));
    float seg = dy * 36.0;
    float sid = floor(seg);
    float sf = fract(seg) - 0.5;
    vec3 sr = h32(vec2(col + sid * 3.1, pass + seed));
    float br = rad * (0.22 + 0.34 * sr.x) * fade;
    vec2 bd = vec2(dx - (sr.y - 0.5) * rad * 0.7, sf / 36.0) / max(br, 1e-4);
    float bq = 1.0 - dot(bd, bd);
    float bead = (above > 0.0 && sr.z < 0.5 && bq > 0.0) ? sqrt(bq) * 0.75 : 0.0;
    return max(head, bead);
  }

  float glass(vec2 p, float t, out float clear) {
    float tr1;
    float tr2;
    float h = beads(p, 15.0, t, 1.0, 0.42 * uRain);
    h = max(h, 0.7 * beads(p + 3.3, 34.0, t * 1.25, 7.0, 0.3 * uRain));
    h = max(h, runnels(p, t, 3.0, 4.6, 0.85 * uRain, tr1));
    h = max(h, runnels(p + vec2(0.083, 0.0), t * 0.87, 9.0, 3.1, 0.7 * uRain, tr2));
    clear = max(smoothstep(0.0, 0.22, h), max(tr1, tr2) * 0.82);
    return h;
  }

  // ── outside ──────────────────────────────────────────────────────────────
  vec3 artScene(vec2 uv, float lod) {
    float aspect = uRes.x / uRes.y;
    vec2 s = aspect > uArtAspect ? vec2(1.0, uArtAspect / aspect) : vec2(aspect / uArtAspect, 1.0);
    vec2 auv = (uv - 0.5) * s * 0.84 + 0.5;
    auv += vec2(sin(uTime * 0.031), cos(uTime * 0.023)) * 0.012;
    vec2 o = vec2(0.004, -0.003) * (lod + 1.0);
    vec3 c = textureLod(uArt, auv, lod).rgb;
    c += textureLod(uArt, auv + o, lod).rgb;
    c += textureLod(uArt, auv - o.yx, lod).rgb;
    c /= 3.0;
    // Moonlit: some colour drained, cast cold, contrast pulled down into the
    // shadows. Still recognisably the record's cover, seen at night.
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, 0.72);
    c *= vec3(0.74, 0.80, 1.0);
    c = pow(c, vec3(1.22)) * 0.92;
    return c;
  }

  float boltPath(float y, float seed) {
    return (fbm3(vec2(y * 2.6, seed)) - 0.5) * 0.42 + (vnoise(vec2(y * 16.0, seed * 1.7)) - 0.5) * 0.05;
  }

  vec3 skyScene(vec2 p, float t, float sharp) {
    float aspect = uRes.x / uRes.y;
    vec3 col = mix(vec3(0.020, 0.022, 0.040), vec3(0.060, 0.068, 0.118), smoothstep(0.0, 1.0, p.y));
    vec2 m = vec2(uMoon.x * aspect, uMoon.y);
    float md = length(p - m);
    // Clouds: domain-warped fBm drifting east, thick enough to hide the moon.
    vec2 q = p * vec2(1.25, 2.1) + vec2(t * 0.011, t * 0.002);
    float warp = fbm3(q * 0.8 + t * 0.006);
    float cl = fbm(q + warp * 0.9);
    float dens = smoothstep(0.38, 0.82, cl);
    // The moon itself, then a halo that the clouds diffuse.
    float disc = smoothstep(0.052, 0.046, md);
    col += vec3(0.62, 0.68, 0.84) * disc * (1.0 - dens * 0.92);
    col += vec3(0.24, 0.29, 0.46) * exp(-md * 5.0) * 0.95;
    vec3 lit = vec3(0.11, 0.12, 0.17) + vec3(0.36, 0.40, 0.58) * exp(-md * 2.6);
    col = mix(col, lit * (0.55 + 0.85 * cl), dens * 0.9);
    // Lightning lights the cloud deck from inside, hardest near the bolt.
    float bx = uBoltX * aspect;
    float near = exp(-abs(p.x - bx) * 1.9) * smoothstep(0.1, 0.9, p.y);
    col += uFlash * (vec3(0.50, 0.55, 0.85) * dens * (0.35 + 1.4 * near) + vec3(0.10, 0.11, 0.18));
    // The bolt: a jagged channel with one fork, white-violet core, wide glow.
    float y = p.y;
    float x1 = bx + boltPath(y, uSeed);
    float d1 = abs(p.x - x1);
    float forkY = 0.55 + 0.2 * h21(vec2(uSeed, 2.0));
    float x2 = x1 + (forkY - y) * (0.35 + 0.3 * h21(vec2(uSeed, 5.0))) * sign(h21(vec2(uSeed, 7.0)) - 0.5)
      + (vnoise(vec2(y * 22.0, uSeed * 3.0)) - 0.5) * 0.03;
    float d2 = y < forkY && y > forkY - 0.28 ? abs(p.x - x2) : 1.0;
    float reach = smoothstep(0.08, 0.2, y);
    float core = smoothstep(0.0035, 0.0, d1) + 0.6 * smoothstep(0.0025, 0.0, d2) * smoothstep(forkY - 0.28, forkY - 0.18, y);
    float glow = exp(-d1 * 70.0) * 0.55 + exp(-d1 * 14.0) * 0.25 + exp(-d2 * 90.0) * 0.3;
    col += uBolt * reach * (vec3(0.92, 0.9, 1.0) * core * sharp + vec3(0.55, 0.52, 0.95) * glow * (0.6 + 0.4 * sharp));
    return col;
  }

  // Rain falling outside, long faint streaks behind the glass.
  float rainOutside(vec2 p, float t) {
    vec2 q = p * vec2(64.0, 1.4);
    q.y += t * 2.4;
    q.x += q.y * 0.09;
    vec2 id = floor(q);
    float r = h21(vec2(id.x, 3.0));
    float f = fract(q.y + r * 10.0);
    float streak = smoothstep(0.0, 0.06, f) * smoothstep(0.3, 0.06, f);
    float w = 1.0 - smoothstep(0.0, 0.18, abs(fract(q.x) - 0.5));
    return streak * w * step(0.72, r);
  }

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2(vUv.x * aspect, vUv.y);
    float t = uTime;

    float clear;
    float h0 = glass(p, t, clear);
    float e = 1.6 / uRes.y;
    float cx;
    float cy;
    float hx = glass(p + vec2(e, 0.0), t, cx);
    float hy = glass(p + vec2(0.0, e), t, cy);
    vec2 n = vec2(hx - h0, hy - h0) / e;
    vec2 refr = -n * 0.0015;
    float rl = length(refr);
    if (rl > 0.22) refr *= 0.22 / rl;

    vec2 q = p + refr;
    vec2 quv = vec2(q.x / aspect, q.y);

    vec3 sharpSky = skyScene(q, t, 1.0);
    vec3 fogSky = skyScene(p, t, 0.0);
    vec3 sharpCol = sharpSky;
    vec3 fogCol = fogSky;
    if (uHasArt > 0.5) {
      vec3 sa = artScene(quv, 1.2);
      vec3 fa = artScene(vUv, 4.6);
      sharpCol = mix(sharpSky, sa + uFlash * 0.25, uArtFade);
      fogCol = mix(fogSky, fa + uFlash * 0.18, uArtFade);
    }

    // Condensation scatters the room's light back at us: candle-warm low on the
    // pane, moon-cold high on it.
    vec3 scatter = mix(vec3(0.085, 0.052, 0.022) * uWarm, vec3(0.028, 0.032, 0.05), smoothstep(0.0, 0.85, vUv.y));
    fogCol = fogCol * 0.82 + scatter;

    vec3 col = mix(fogCol, sharpCol, clear);

    // Each drop's rim catches light: candles below, and the flash.
    float slope = length(n);
    float rim = smoothstep(18.0, 80.0, slope) * step(0.02, h0);
    col += rim * (vec3(0.06, 0.045, 0.03) * uWarm + uFlash * vec3(0.45, 0.5, 0.75));

    // The flash lights the pane itself; clear glass passes more of it.
    col += uFlash * vec3(0.24, 0.27, 0.40) * (0.4 + 0.6 * clear);

    col += rainOutside(p, t) * (0.035 + uFlash * 0.35) * (1.0 - 0.6 * clear);

    float vig = smoothstep(1.3, 0.2, length((vUv - 0.5) * vec2(aspect * 0.78, 1.0)));
    col *= mix(0.5, 1.0, vig);
    col *= 1.0 - uDim * mix(0.42, 0.3, uHasArt * uArtFade);
    col += (h21(vUv * uRes + fract(t) * 97.0) - 0.5) * 0.012;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`

interface PaneProps {
    art: string | null
    performing: boolean
    rain: number
    moon: [number, number]
    warm: number
}

function Pane({ art, performing, rain, moon, warm }: PaneProps) {
    const { size, gl } = useThree()
    const blank = useMemo(() => {
        const t = new THREE.DataTexture(new Uint8Array([10, 10, 16, 255]), 1, 1)
        t.needsUpdate = true
        return t
    }, [])

    const uniforms = useMemo(
        () => ({
            uRes: { value: new THREE.Vector2(1, 1) },
            uTime: { value: 0 },
            uFlash: { value: 0 },
            uBolt: { value: 0 },
            uBoltX: { value: 0.3 },
            uSeed: { value: 0 },
            uArt: { value: blank as THREE.Texture },
            uHasArt: { value: 0 },
            uArtAspect: { value: 1 },
            uArtFade: { value: 0 },
            uDim: { value: 0 },
            uRain: { value: 1 },
            uMoon: { value: new THREE.Vector2(0.72, 0.8) },
            uWarm: { value: 1 },
        }),
        [blank],
    )

    // Album art arrives as a texture with a full mip chain, which is what lets
    // the fog sample it as a deep blur (a high LOD) while the drops sample it
    // nearly sharp. A new song's art cross-fades in rather than popping.
    const fadeTarget = useRef(0)
    useEffect(() => {
        if (!art) {
            fadeTarget.current = 0
            return
        }
        let cancelled = false
        const loader = new THREE.TextureLoader()
        loader.setCrossOrigin('anonymous')
        loader.load(
            art,
            (tex) => {
                if (cancelled) {
                    tex.dispose()
                    return
                }
                // Left as NoColorSpace on purpose: this ShaderMaterial writes its
                // output without re-encoding, so sampling the raw sRGB bytes is
                // what keeps the art at its true brightness.
                tex.generateMipmaps = true
                tex.minFilter = THREE.LinearMipmapLinearFilter
                tex.magFilter = THREE.LinearFilter
                tex.wrapS = THREE.MirroredRepeatWrapping
                tex.wrapT = THREE.MirroredRepeatWrapping
                tex.anisotropy = 1
                const prev = uniforms.uArt.value
                uniforms.uArt.value = tex
                const img = tex.image as { width?: number; height?: number } | undefined
                uniforms.uArtAspect.value = img?.width && img?.height ? img.width / img.height : 1
                uniforms.uHasArt.value = 1
                uniforms.uArtFade.value = 0
                fadeTarget.current = 1
                if (prev && prev !== blank) prev.dispose()
            },
            undefined,
            () => {
                fadeTarget.current = 0
            },
        )
        return () => {
            cancelled = true
        }
    }, [art, uniforms, blank])

    useEffect(() => () => {
        const tex = uniforms.uArt.value
        if (tex && tex !== blank) tex.dispose()
        blank.dispose()
    }, [uniforms, blank])

    useFrame((state, delta) => {
        const u = uniforms
        const dpr = gl.getPixelRatio()
        u.uRes.value.set(size.width * dpr, size.height * dpr)
        u.uTime.value = state.clock.elapsedTime
        const s = sampleStorm()
        u.uFlash.value = s.flash
        u.uBolt.value = s.bolt
        u.uBoltX.value = s.x
        u.uSeed.value = s.seed
        // Ease the soft parameters so a song starting doesn't snap the room.
        const k = Math.min(1, delta * 1.6)
        u.uDim.value += ((performing ? 1 : 0) - u.uDim.value) * k
        u.uRain.value += (rain - u.uRain.value) * k
        u.uWarm.value += (warm - u.uWarm.value) * k
        u.uMoon.value.set(moon[0], moon[1])
        const ft = fadeTarget.current
        u.uArtFade.value += (ft - u.uArtFade.value) * Math.min(1, delta * 1.2)
        if (ft === 0 && u.uArtFade.value < 0.01) u.uHasArt.value = 0
    })

    return (
        <mesh frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={VERTEX}
                fragmentShader={FRAGMENT}
                uniforms={uniforms}
                depthTest={false}
                depthWrite={false}
            />
        </mesh>
    )
}

export interface GothicStormProps {
    /** Album art to watch through the glass; null shows the night sky. */
    art?: string | null
    /** A song is on: thinner rain, a dimmer pane, rarer lightning. */
    performing?: boolean
    /** 0..1 how wet the glass is. */
    rain?: number
    /** Where the moon hides behind the clouds, in 0..1 screen units (y up). */
    moon?: [number, number]
    /** 0..1 how much candlelight the fogged glass scatters back. */
    warm?: number
    style?: React.CSSProperties
}

const DEFAULT_MOON: [number, number] = [0.72, 0.8]

// Memoised: the stage re-renders on every playback tick and syllable, and
// none of that should reach the canvas's reconciler.
export const GothicStorm = memo(function GothicStorm({
    art = null,
    performing = false,
    rain = 1,
    moon = DEFAULT_MOON,
    warm = 1,
    style,
}: GothicStormProps) {
    const [dpr, setDpr] = useState(performing ? 0.5 : 0.6)

    useEffect(() => {
        setStormMood(performing ? 'performing' : 'idle')
    }, [performing])

    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}>
            <Canvas
                dpr={dpr}
                orthographic
                gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: false }}
                style={{ width: '100%', height: '100%', background: '#07060A' }}
            >
                <PerformanceMonitor onDecline={() => setDpr(0.42)} onIncline={() => setDpr(performing ? 0.5 : 0.6)} />
                <Pane art={art} performing={performing} rain={rain * (performing ? 0.7 : 1)} moon={moon} warm={warm} />
            </Canvas>
        </div>
    )
})
