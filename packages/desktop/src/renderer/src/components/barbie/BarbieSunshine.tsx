// Sunshine, as one full-screen fragment shader: the backdrop while a song plays
// with no music video.
//
// The song's album art is PRINTED IN PINK AND SUNSHINE: its light values are
// run through a five-stop gradient map (plum, Barbie pink, bubblegum, peach,
// sunshine yellow), softly posterised like a sun-faded poster, so any cover,
// however dark or grey, becomes part of the town. Over it:
//
//   • SUNBEAMS fanning down from a sun just off the top of the screen, turning
//     very slowly, warm and soft-edged;
//   • the SUN'S BLOOM, which swells and brightens with the room's voices (the
//     sun is how loud everyone is singing);
//   • GLITTER: four-point twinkles caught in the beams, more of them, and
//     brighter, as the singing gets louder;
//   • the shared GLINT (sunshine.ts) sweeping across the print at the same
//     moment it crosses every glossy surface on the stage.
//
// With no art at all the print is a painted sky instead.
//
// Performance: half resolution, one quad, no post-processing (everything here
// is soft by nature). Memoised so the stage's per-syllable renders never reach
// the canvas.

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { sampleGlint, sampleSunVoice, setSunMood } from './sunshine'

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
  uniform float uVoice;
  uniform float uGlint;
  uniform sampler2D uArt;
  uniform float uHasArt;
  uniform float uArtAspect;
  uniform float uArtFade;
  uniform vec2 uSun;

  float h21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec2 h22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // The pink-and-sunshine gradient map. Five stops, eased between, so the
  // print has the soft banding of a screen print rather than a smooth ramp.
  vec3 gradMap(float l) {
    vec3 c0 = vec3(0.333, 0.039, 0.255); // plum
    vec3 c1 = vec3(0.878, 0.129, 0.541); // Barbie pink
    vec3 c2 = vec3(1.000, 0.447, 0.722); // bubblegum
    vec3 c3 = vec3(1.000, 0.737, 0.620); // peach
    vec3 c4 = vec3(1.000, 0.945, 0.690); // sunshine
    float t = clamp(l, 0.0, 1.0) * 4.0;
    float k = fract(t);
    k = k * k * (3.0 - 2.0 * k);
    if (t < 1.0) return mix(c0, c1, k);
    if (t < 2.0) return mix(c1, c2, k);
    if (t < 3.0) return mix(c2, c3, k);
    return mix(c3, c4, k);
  }

  // A painted sky for songs without art: pool blue, pink, peach.
  vec3 sky(vec2 uv) {
    vec3 top = vec3(0.561, 0.847, 0.949);
    vec3 mid = vec3(1.000, 0.776, 0.875);
    vec3 low = vec3(1.000, 0.851, 0.737);
    float y = uv.y;
    vec3 c = mix(low, mid, smoothstep(0.0, 0.45, y));
    return mix(c, top, smoothstep(0.5, 1.0, y));
  }

  // One twinkle: a soft core plus two long thin points.
  float twinkle(vec2 d, float s) {
    d /= s;
    float core = max(0.0, 1.0 - length(d) * 3.2);
    float arms = exp(-abs(d.x) * 26.0) * exp(-abs(d.y) * 2.6) + exp(-abs(d.y) * 26.0) * exp(-abs(d.x) * 2.6);
    return core * core + arms * 0.85;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / max(uRes.y, 1.0);
    vec2 p = vec2(uv.x * aspect, uv.y);
    float t = uTime;
    float v = uVoice;

    // ── the print ─────────────────────────────────────────────────────────
    // Cover-fit the art, with the slowest drift, so the print breathes.
    float zoom = 1.06 + 0.02 * sin(t * 0.045);
    vec2 auv = uv - 0.5;
    if (aspect > uArtAspect) auv.y *= uArtAspect / aspect; else auv.x *= aspect / uArtAspect;
    auv = auv / zoom + 0.5 + vec2(sin(t * 0.031), cos(t * 0.027)) * 0.012;
    vec3 art = textureLod(uArt, auv, 2.2).rgb;
    float l = dot(art, vec3(0.299, 0.587, 0.114));
    // Lift and stretch the light values so dark covers still print pink, not
    // plum: nothing in Barbie Land is allowed to be gloomy.
    l = smoothstep(0.02, 0.92, l);
    l = 0.22 + l * 0.74;
    // A soft posterise, the faded-poster banding.
    float bands = 6.0;
    float lp = (floor(l * bands) + smoothstep(0.35, 0.65, fract(l * bands))) / bands;
    l = mix(l, lp, 0.45);
    vec3 print = gradMap(l);
    // Keep a little of the cover's own hue, so two covers never look alike.
    print = mix(print, print * (0.75 + art * 0.5), 0.22);
    vec3 col = mix(sky(uv), print, uHasArt * uArtFade);

    // ── sunbeams ──────────────────────────────────────────────────────────
    vec2 sp = vec2(uSun.x * aspect, uSun.y);
    vec2 d = p - sp;
    float dist = length(d);
    float ang = atan(d.y, d.x);
    float beams = 0.5 + 0.5 * sin(ang * 13.0 + t * 0.07) * sin(ang * 7.0 - t * 0.05 + 1.3);
    beams = smoothstep(0.35, 0.95, beams);
    float reach = exp(-dist * (1.15 - v * 0.35));
    col += vec3(1.0, 0.93, 0.70) * beams * reach * (0.22 + v * 0.22);

    // ── the sun's bloom, the room's voice ─────────────────────────────────
    float bloom = exp(-dist * dist * (5.5 - v * 3.0));
    col = mix(col, vec3(1.0, 0.97, 0.86), bloom * (0.55 + v * 0.35));

    // ── glitter in the light ──────────────────────────────────────────────
    float glit = 0.0;
    vec3 gcol = vec3(0.0);
    for (int layer = 0; layer < 2; layer++) {
      float scale = layer == 0 ? 26.0 : 44.0;
      vec2 g = p * scale;
      vec2 cell = floor(g);
      vec2 f = fract(g) - 0.5;
      vec2 r = h22(cell + float(layer) * 17.0);
      float on = step(r.x, 0.10 + v * 0.18);
      vec2 off = (r - 0.5) * 0.6;
      float phase = r.y * 6.2831 + t * (1.4 + r.x * 3.0);
      float tw = pow(max(0.0, sin(phase)), 10.0);
      float s = twinkle(f - off, 0.55 + r.y * 0.35) * tw * on;
      // brighter where the sun is shining
      s *= 0.35 + beams * reach * 1.6 + bloom;
      glit += s;
      vec3 tint = r.y < 0.33 ? vec3(1.0) : (r.y < 0.66 ? vec3(1.0, 0.94, 0.66) : vec3(1.0, 0.78, 0.9));
      gcol += tint * s;
    }
    col += gcol * (0.75 + v * 0.6);

    // ── the glint ─────────────────────────────────────────────────────────
    if (uGlint > 0.0) {
      vec2 dir = normalize(vec2(0.94, 0.34));
      float along = dot(p, dir) / (aspect * 0.94 + 0.34);
      float c = mix(-0.25, 1.25, uGlint);
      float band = exp(-pow((along - c) / 0.05, 2.0)) + 0.35 * exp(-pow((along - c + 0.09) / 0.025, 2.0));
      col += vec3(1.0, 0.96, 0.98) * band * 0.38;
    }

    // ── finish ────────────────────────────────────────────────────────────
    // A warm pink vignette (never grey), and the faint tooth of paint.
    float vig = smoothstep(0.55, 1.25, length((uv - vec2(0.5, 0.55)) * vec2(1.25, 1.0)));
    col = mix(col, vec3(0.86, 0.22, 0.52), vig * 0.32);
    col += (h21(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * 0.025;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`

function Print({ art }: { art: string | null }) {
    const { size, gl } = useThree()
    const blank = useMemo(() => {
        const t = new THREE.DataTexture(new Uint8Array([224, 33, 138, 255]), 1, 1)
        t.needsUpdate = true
        return t
    }, [])

    const uniforms = useMemo(
        () => ({
            uRes: { value: new THREE.Vector2(1, 1) },
            uTime: { value: 0 },
            uVoice: { value: 0 },
            uGlint: { value: 0 },
            uArt: { value: blank as THREE.Texture },
            uHasArt: { value: 0 },
            uArtAspect: { value: 1 },
            uArtFade: { value: 0 },
            uSun: { value: new THREE.Vector2(0.16, 1.08) },
        }),
        [blank],
    )

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
        u.uVoice.value += (sampleSunVoice() - u.uVoice.value) * Math.min(1, delta * 6)
        u.uGlint.value = sampleGlint()
        const ft = fadeTarget.current
        u.uArtFade.value += (ft - u.uArtFade.value) * Math.min(1, delta * 1.4)
        if (ft === 0 && u.uArtFade.value < 0.01) u.uHasArt.value = 0
    })

    return (
        <mesh frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial vertexShader={VERTEX} fragmentShader={FRAGMENT} uniforms={uniforms} depthTest={false} depthWrite={false} />
        </mesh>
    )
}

export const BarbieSunshine = memo(function BarbieSunshine({ art = null, performing = true, style }: { art?: string | null; performing?: boolean; style?: React.CSSProperties }) {
    const [dpr, setDpr] = useState(0.5)
    useEffect(() => {
        setSunMood(performing ? 'performing' : 'idle')
    }, [performing])
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}>
            <Canvas
                dpr={dpr}
                orthographic
                gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: false }}
                style={{ width: '100%', height: '100%', background: '#FFC6DF' }}
            >
                <PerformanceMonitor onDecline={() => setDpr(0.4)} onIncline={() => setDpr(0.5)} />
                <Print art={art} />
            </Canvas>
        </div>
    )
})
