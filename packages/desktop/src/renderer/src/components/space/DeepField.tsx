// Deep space, as one full-screen fragment shader. Everything is procedural (no
// texture assets), drawn in this order:
//
//   1. The void. Not flat black: a whisper of blue-black with the faintest
//      large-scale glow, the way a long exposure of empty sky looks.
//   2. The Milky Way. A diagonal band whose width wanders along its length,
//      mottled into star clouds, warm at its core and cooler at its edges, cut
//      down the middle by dark dust lanes (ridged noise) that also hide the
//      stars behind them.
//   3. Nebula. On the idle sky, an emission nebula in hydrogen rose and oxygen
//      teal, domain-warped so it billows instead of blurring. While a song
//      plays, the song's own album art takes its place: the cover is sampled
//      very soft through a warped field and carved into clouds, filaments and
//      dark voids, so every song gets its own nebula in its own colours.
//   4. Stars, in three depth layers, few bright and many faint, each in a real
//      colour (orange K and M dwarfs, yellow-white, white, blue-white), denser
//      inside the Milky Way and hidden behind its dust.
//   5. Hero stars: a handful of bright ones with the eight-pointed diffraction
//      spikes of a deep-field telescope (six from a hexagonal mirror, two short
//      ones from the struts). They swell with the room's voices.
//   6. The Pale Blue Dot. On the idle sky only: the long diagonal band of
//      scattered sunlight from that photograph, with one pale blue point of
//      light in it. Earth, as Voyager saw it.
//
// Performance contract: a single quad, no post-processing. Full resolution on
// the idle and up-next screens (point stars need real pixels), three quarters
// during a song; PerformanceMonitor walks it down further if frames slip. Memoised so the stage's per-syllable renders never reach it.

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { sampleCosmosVoice } from './cosmos'

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const HERO_COUNT = 9

const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform vec2 uRes;
  uniform float uTime;
  uniform float uVoice;
  uniform float uBeam;
  uniform float uNebula;
  uniform float uDim;
  uniform sampler2D uArt;
  uniform float uHasArt;
  uniform float uArtAspect;
  uniform float uArtFade;
  uniform vec4 uHero[${HERO_COUNT}];
  uniform vec3 uHeroCol[${HERO_COUNT}];

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
  float ridged(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      s += a * (1.0 - abs(vnoise(p) * 2.0 - 1.0));
      p = p * 2.07 + vec2(5.3, 1.1);
      a *= 0.5;
    }
    return s;
  }

  // Star colour from a 0..1 temperature: most stars near white, a tail of
  // orange dwarfs and a few blue-white giants.
  vec3 starColor(float t) {
    vec3 m = vec3(1.0, 0.68, 0.48);
    vec3 k = vec3(1.0, 0.84, 0.66);
    vec3 g = vec3(1.0, 0.96, 0.88);
    vec3 a = vec3(0.86, 0.91, 1.0);
    vec3 b = vec3(0.66, 0.78, 1.0);
    if (t < 0.12) return mix(m, k, t / 0.12);
    if (t < 0.45) return mix(k, g, (t - 0.12) / 0.33);
    if (t < 0.85) return mix(g, a, (t - 0.45) / 0.4);
    return mix(a, b, (t - 0.85) / 0.15);
  }

  vec3 starLayer(vec2 p, float scale, float density, float seed, float px, float t) {
    vec2 g = p * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec3 h = h32(id + seed);
    if (h.x > density) return vec3(0.0);
    vec2 o = (h.yz - 0.5) * 0.72;
    float d = length(f - o) / scale;
    float mag = pow(h21(id * 1.73 + seed), 7.0);
    float size = px * (0.62 + mag * 1.5);
    float b = exp(-d * d / (size * size)) * (0.18 + mag * 1.9);
    // the brighter ones scintillate, very slightly
    b *= 1.0 - mag * 0.25 * (0.5 + 0.5 * sin(t * (1.3 + h.y * 2.7) + h.z * 6.283));
    return starColor(h21(id * 3.11 + seed)) * b;
  }

  // Eight-pointed diffraction spikes about the origin, in screen units.
  float spikes(vec2 d, float len, float w) {
    float s = 0.0;
    for (int k = 0; k < 3; k++) {
      float a = 1.5708 - float(k) * 1.0472;
      vec2 dir = vec2(cos(a), sin(a));
      float along = abs(dot(d, dir));
      float perp = abs(dot(d, vec2(-dir.y, dir.x)));
      float fall = max(0.0, 1.0 - along / len);
      s += exp(-perp / w) * fall * fall * fall;
    }
    float fallH = max(0.0, 1.0 - abs(d.x) / (len * 0.42));
    s += 0.6 * exp(-abs(d.y) / (w * 0.85)) * fallH * fallH;
    return s;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / max(uRes.y, 1.0);
    // one pixel, in sky units (height = 1)
    float px = 1.0 / max(uRes.y, 1.0);
    float t = uTime;
    // The sky drifts, very slowly, as the record sails on.
    vec2 drift = vec2(t * 0.0021, t * 0.0007);
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    vec2 sp = p + drift;

    // ── 1. the void ───────────────────────────────────────────────────────
    vec3 col = vec3(0.006, 0.008, 0.02);
    col += vec3(0.012, 0.014, 0.03) * fbm(sp * 0.9 + 4.0);

    // ── 2. the Milky Way ──────────────────────────────────────────────────
    vec2 bandDir = normalize(vec2(1.0, 0.36));
    vec2 bandN = vec2(-bandDir.y, bandDir.x);
    float along = dot(sp, bandDir);
    float across = dot(sp - vec2(0.0, -0.08), bandN);
    float width = 0.2 + 0.09 * fbm(vec2(along * 1.6, 3.0));
    float band = exp(-across * across / (width * width));
    float core = exp(-across * across / (width * width * 0.28));
    float clouds = fbm(sp * 3.2 + vec2(7.2, 1.3));
    float dust = smoothstep(0.5, 0.78, ridged(sp * vec2(5.5, 7.5) + vec2(2.0, 9.0))) * exp(-across * across / (width * width * 0.45));
    vec3 mwCol = mix(vec3(0.42, 0.5, 0.78), vec3(1.0, 0.84, 0.66), core);
    float mw = band * (0.25 + 0.75 * clouds * clouds);
    col += mwCol * mw * 0.24 * (1.0 - dust * 0.94);

    // ── 3. nebula ─────────────────────────────────────────────────────────
    // the idle sky's emission nebula, off in the upper left
    if (uNebula > 0.001) {
      vec2 q = sp - vec2(-0.5 * aspect + 0.36, 0.2);
      vec2 w = vec2(fbm(q * 1.7 + 1.0), fbm(q * 1.7 + 4.0)) - 0.5;
      float nf = fbm(q * 2.4 + w * 1.4);
      float neb = smoothstep(0.3, 0.82, nf) * exp(-dot(q, q) * 2.4);
      float fil = pow(ridged(q * 4.0 + w * 2.0), 2.6) * exp(-dot(q, q) * 3.2);
      // a dark dust pillar eats into the glow, the way nebulae have them
      float pillar = smoothstep(0.55, 0.8, fbm(q * vec2(5.0, 2.2) + w * 2.5 + 11.0));
      neb *= 1.0 - pillar * 0.85;
      fil *= 1.0 - pillar * 0.7;
      vec3 hA = vec3(0.88, 0.32, 0.42);
      vec3 o3 = vec3(0.3, 0.78, 0.76);
      vec3 nebCol = mix(hA, o3, smoothstep(0.32, 0.72, fbm(q * 3.0 + 5.0)));
      col += nebCol * (neb * 0.5 + fil * 0.34) * uNebula;
    }
    // the song's own nebula, from its album art
    float artMix = uHasArt * uArtFade;
    if (artMix > 0.001) {
      vec2 w = vec2(fbm(sp * 1.6 + t * 0.008), fbm(sp * 1.6 + 9.0 - t * 0.006)) - 0.5;
      vec2 auv = uv - 0.5 + w * 0.32;
      if (aspect > uArtAspect) auv.y *= uArtAspect / aspect; else auv.x *= aspect / uArtAspect;
      auv = auv * 0.8 + 0.5;
      vec3 a = textureLod(uArt, auv, 5.2).rgb;
      float la = dot(a, vec3(0.299, 0.587, 0.114));
      a = clamp(mix(vec3(la), a, 1.45), 0.0, 1.0);
      // keep even a near-black cover from making a black hole in the sky
      a = max(a, vec3(0.08, 0.06, 0.1)) * (0.75 + 0.6 * (1.0 - la));
      float dens = smoothstep(0.36, 0.88, fbm(sp * 2.2 + w * 2.2));
      float fil = pow(ridged(sp * 3.4 + w * 3.0), 3.2);
      float voids = smoothstep(0.18, 0.62, fbm(sp * 1.15 + 20.0));
      vec3 neb = a * (dens * 0.55 + fil * 0.42) * voids;
      col += neb * 0.62 * artMix;
    }

    // ── 4. stars ──────────────────────────────────────────────────────────
    float boost = band * (1.0 - dust);
    vec3 stars = vec3(0.0);
    stars += starLayer(sp * 0.9, 34.0, 0.62, 1.0, px * 1.25, t);
    stars += starLayer(sp * 0.95, 78.0, 0.2 + 0.5 * boost, 7.0, px * 1.05, t);
    stars += starLayer(sp, 170.0, 0.05 + 0.7 * boost, 13.0, px * 0.9, t) * 0.7;
    col += stars * (1.0 - dust * 0.85);

    // ── 5. hero stars ─────────────────────────────────────────────────────
    for (int i = 0; i < ${HERO_COUNT}; i++) {
      vec4 h = uHero[i];
      if (h.w <= 0.0) continue;
      vec2 hp = (h.xy - 0.5) * vec2(aspect, 1.0) + drift * 0.6;
      vec2 d = p + drift * 0.6 - hp;
      float r = length(d);
      float size = h.z * (1.0 + uVoice * 0.55);
      float coreB = exp(-r * r / (size * size * 0.0045));
      float halo = exp(-r / (size * 0.12)) * 0.22;
      float spk = spikes(d, size * (0.75 + uVoice * 0.6), px * 0.85);
      col += uHeroCol[i] * h.w * (coreB * 1.6 + halo + spk * 0.75);
    }

    // ── 6. the Pale Blue Dot ──────────────────────────────────────────────
    if (uBeam > 0.001) {
      vec2 bd = normalize(vec2(0.3, 1.0));
      vec2 b0 = vec2(0.3 * aspect, 0.0);
      float bx = dot(p - b0, vec2(-bd.y, bd.x));
      float beam = exp(-bx * bx / 0.0016) * 0.085 + exp(-bx * bx / 0.012) * 0.035;
      // the scattered light breaks into faint bands of colour across its width
      vec3 beamCol = mix(vec3(1.0, 0.76, 0.58), vec3(0.72, 0.84, 1.0), 0.5 + 0.5 * sin(bx * 210.0));
      col += beamCol * beam * uBeam;
      vec2 dotPos = b0 + bd * 0.17;
      float dd = length(p - dotPos);
      col += vec3(0.55, 0.72, 1.0) * (exp(-dd * dd / (px * px * 2.2)) * 1.1 + exp(-dd * dd / (px * px * 40.0)) * 0.1) * uBeam;
    }

    // ── finish ────────────────────────────────────────────────────────────
    col *= 1.0 - uDim * 0.35;
    float vig = smoothstep(0.62, 1.3, length((uv - 0.5) * vec2(1.1, 1.0)));
    col *= 1.0 - vig * 0.55;
    col += (h21(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * 0.012;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`

export interface HeroStar {
    /** position in 0..1 screen units, y up */
    x: number
    y: number
    /** spike length in sky units (screen height = 1) */
    size: number
    brightness: number
    color: [number, number, number]
}

const WHITE: [number, number, number] = [1, 0.97, 0.92]
const BLUE: [number, number, number] = [0.72, 0.82, 1]
const GOLDEN: [number, number, number] = [1, 0.86, 0.62]
const RED: [number, number, number] = [1, 0.66, 0.5]

/** Where the bright stars sit on each screen: always away from the middle,
 *  where the words and the record are. */
export const HEROES: Record<'idle' | 'upnext' | 'performing', HeroStar[]> = {
    idle: [
        { x: 0.09, y: 0.8, size: 0.11, brightness: 0.9, color: BLUE },
        { x: 0.88, y: 0.86, size: 0.075, brightness: 0.75, color: WHITE },
        { x: 0.06, y: 0.24, size: 0.06, brightness: 0.6, color: GOLDEN },
        { x: 0.94, y: 0.33, size: 0.095, brightness: 0.8, color: WHITE },
        { x: 0.71, y: 0.94, size: 0.045, brightness: 0.55, color: RED },
        { x: 0.25, y: 0.06, size: 0.05, brightness: 0.5, color: BLUE },
        { x: 0.8, y: 0.1, size: 0.06, brightness: 0.55, color: GOLDEN },
    ],
    upnext: [
        { x: 0.07, y: 0.72, size: 0.1, brightness: 0.85, color: BLUE },
        { x: 0.93, y: 0.8, size: 0.08, brightness: 0.75, color: WHITE },
        { x: 0.1, y: 0.16, size: 0.055, brightness: 0.55, color: GOLDEN },
        { x: 0.9, y: 0.22, size: 0.06, brightness: 0.6, color: RED },
    ],
    performing: [
        { x: 0.05, y: 0.86, size: 0.07, brightness: 0.6, color: BLUE },
        { x: 0.95, y: 0.12, size: 0.065, brightness: 0.55, color: WHITE },
        { x: 0.96, y: 0.7, size: 0.045, brightness: 0.45, color: GOLDEN },
    ],
}

function Sky({ art, heroes, beam, nebula, dim }: { art: string | null; heroes: HeroStar[]; beam: number; nebula: number; dim: number }) {
    const { size, gl } = useThree()
    const blank = useMemo(() => {
        const t = new THREE.DataTexture(new Uint8Array([6, 6, 14, 255]), 1, 1)
        t.needsUpdate = true
        return t
    }, [])

    const uniforms = useMemo(
        () => ({
            uRes: { value: new THREE.Vector2(1, 1) },
            uTime: { value: 0 },
            uVoice: { value: 0 },
            uBeam: { value: 0 },
            uNebula: { value: 0 },
            uDim: { value: 0 },
            uArt: { value: blank as THREE.Texture },
            uHasArt: { value: 0 },
            uArtAspect: { value: 1 },
            uArtFade: { value: 0 },
            uHero: { value: Array.from({ length: HERO_COUNT }, () => new THREE.Vector4(0, 0, 0, 0)) },
            uHeroCol: { value: Array.from({ length: HERO_COUNT }, () => new THREE.Vector3(1, 1, 1)) },
        }),
        [blank],
    )

    useEffect(() => {
        for (let i = 0; i < HERO_COUNT; i++) {
            const h = heroes[i]
            if (h) {
                uniforms.uHero.value[i].set(h.x, h.y, h.size, h.brightness)
                uniforms.uHeroCol.value[i].set(h.color[0], h.color[1], h.color[2])
            } else {
                uniforms.uHero.value[i].set(0, 0, 0, 0)
            }
        }
    }, [heroes, uniforms])

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
                // NoColorSpace on purpose: the ShaderMaterial writes without
                // re-encoding, so the raw sRGB bytes keep the art's true values.
                tex.generateMipmaps = true
                tex.minFilter = THREE.LinearMipmapLinearFilter
                tex.magFilter = THREE.LinearFilter
                tex.wrapS = THREE.MirroredRepeatWrapping
                tex.wrapT = THREE.MirroredRepeatWrapping
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
        u.uVoice.value += (sampleCosmosVoice() - u.uVoice.value) * Math.min(1, delta * 6)
        const k = Math.min(1, delta * 1.2)
        u.uBeam.value += (beam - u.uBeam.value) * k
        u.uNebula.value += (nebula - u.uNebula.value) * k
        u.uDim.value += (dim - u.uDim.value) * k
        const ft = fadeTarget.current
        u.uArtFade.value += (ft - u.uArtFade.value) * Math.min(1, delta * 1.0)
        if (ft === 0 && u.uArtFade.value < 0.01) u.uHasArt.value = 0
    })

    return (
        <mesh frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial vertexShader={VERTEX} fragmentShader={FRAGMENT} uniforms={uniforms} depthTest={false} depthWrite={false} />
        </mesh>
    )
}

export interface DeepFieldProps {
    /** Which screen: sets the bright stars, the beam and the nebula. */
    mode: 'idle' | 'upnext' | 'performing'
    /** Album art to turn into the nebula (up next and performing). */
    art?: string | null
    style?: React.CSSProperties
}

export const DeepField = memo(function DeepField({ mode, art = null, style }: DeepFieldProps) {
    // Point stars need real pixels: full resolution while nothing else is
    // running (idle, up next), a little under it during a song.
    const full = mode === 'performing' ? 0.75 : 1
    const [dpr, setDpr] = useState(full)
    useEffect(() => setDpr(full), [full])
    const heroes = HEROES[mode]
    const beam = mode === 'idle' ? 1 : 0
    const nebula = mode === 'idle' || !art ? 1 : 0
    const dim = mode === 'performing' ? 1 : 0
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}>
            <Canvas
                dpr={dpr}
                orthographic
                gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: false }}
                style={{ width: '100%', height: '100%', background: '#020308' }}
            >
                <PerformanceMonitor onDecline={() => setDpr(full * 0.66)} onIncline={() => setDpr(full)} />
                <Sky art={mode === 'idle' ? null : art} heroes={heroes} beam={beam} nebula={nebula} dim={dim} />
            </Canvas>
        </div>
    )
})
