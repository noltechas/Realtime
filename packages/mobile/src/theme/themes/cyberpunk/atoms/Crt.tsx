import React, { useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type DimensionValue,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

// ── Cyberpunk CRT / glitch toolkit ──────────────────────────────────────────
// Shared primitives that give the cyberpunk theme its early-2000s "image on a
// dying CRT/LCD" look: always-on scanlines + TV-snow shimmer, plus rare,
// self-scheduling glitch bursts (RGB tear bars + horizontal jitter). Built on
// the stock React Native Animated API (no reanimated) — every animated value
// drives only opacity/transform, so they all run on the native driver.
//
// Usage: drop <CRTOverlay/> as the LAST child of any clipped (overflow:'hidden')
// box to film it. Drive jitter/tears at the parent with useGlitch(): apply
// `jitterStyle(g)` to the box you want to shake and render <GlitchBars g={g}/>
// inside the clipped box for the colored tear lines.

const SNOW = 'rgba(208,255,232,0.9)' // WHITE_TINTED — TV-snow speckle color
const SCAN = 'rgba(0,0,0,0.28)' // dark scanline gap
const NEON_CYAN = '#00e5ff'
const NEON_MAGENTA = '#ff00aa'
const NEON_GREEN = '#00ff88'

const fill: ViewStyle = StyleSheet.absoluteFillObject

// Hash a fractional pseudo-random sequence so the snow field is stable across
// re-renders (computed once via useMemo at mount) but still looks scattered.
function snowField(count: number, seed: number) {
  const dots: { top: DimensionValue; left: DimensionValue; size: number; op: number }[] = []
  let s = seed
  const rnd = () => {
    // xorshift-ish — deterministic, decent spread, no Math.random in render
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return ((s >>> 0) % 10000) / 10000
  }
  for (let i = 0; i < count; i++) {
    dots.push({
      top: `${Math.round(rnd() * 100)}%`,
      left: `${Math.round(rnd() * 100)}%`,
      size: rnd() > 0.85 ? 2 : 1,
      op: 0.25 + rnd() * 0.6,
    })
  }
  return dots
}

// Always-on CRT film: fine horizontal scanlines, a flickering TV-snow speckle
// layer, and a faint glassy top-to-bottom sheen. pointerEvents none — purely
// decorative, never intercepts the parent's press.
export function CRTOverlay({
  lineStep = 3,
  coverage = 320,
  snowCount = 46,
  seed = 1337,
  tint = NEON_GREEN,
}: {
  lineStep?: number
  coverage?: number
  snowCount?: number
  seed?: number
  tint?: string
}) {
  // `coverage` is how tall the clipped art well is; the line layer is one
  // line-period taller so it can crawl by exactly one period and loop with no
  // visible seam (lines are identical every `lineStep`px).
  const snow = useRef(new Animated.Value(0)).current
  const lineRoll = useRef(new Animated.Value(0)).current
  const band = useRef(new Animated.Value(0)).current
  const band2 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loops = [
      // TV-snow shimmer
      Animated.loop(
        Animated.sequence([
          Animated.timing(snow, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(snow, { toValue: 0, duration: 90, easing: Easing.linear, useNativeDriver: true }),
        ]),
      ),
      // Fine raster crawl — travels exactly one line period, so the reset is
      // pixel-identical (seamless). Linear only; any ease pulses at the seam.
      Animated.loop(
        Animated.timing(lineRoll, { toValue: 1, duration: 850, easing: Easing.linear, useNativeDriver: true }),
      ),
      // Two soft luminance "tracking bands" rolling top→bottom at coprime-ish
      // speeds so they never visibly re-sync — this is the camcorder vertical
      // hold, the motion the eye actually reads as analog video.
      Animated.loop(
        Animated.timing(band, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }),
      ),
      Animated.loop(
        Animated.timing(band2, { toValue: 1, duration: 7600, easing: Easing.linear, useNativeDriver: true }),
      ),
    ]
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [snow, lineRoll, band, band2])

  const dots = useMemo(() => snowField(snowCount, seed), [snowCount, seed])

  // +2 extra periods so the crawl never reveals an empty edge at either end.
  const lineLayerH = coverage + lineStep * 2
  const lineCount = Math.ceil(lineLayerH / lineStep)
  const lines = useMemo(() => {
    const out: React.ReactElement[] = []
    for (let i = 0; i < lineCount; i++) {
      out.push(
        <View
          key={`scan-${i}`}
          style={{
            position: 'absolute',
            top: i * lineStep,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: SCAN,
          }}
        />,
      )
    }
    return out
  }, [lineCount, lineStep])

  const BAND_H = Math.max(26, Math.round(coverage * 0.16))
  const lineTranslate = lineRoll.interpolate({ inputRange: [0, 1], outputRange: [0, -lineStep] })
  const bandTranslate = band.interpolate({ inputRange: [0, 1], outputRange: [-BAND_H, coverage] })
  const band2Translate = band2.interpolate({ inputRange: [0, 1], outputRange: [-BAND_H, coverage] })
  const snowOpacity = snow.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.11] })

  // Soft band gradient — feathered to transparent at BOTH ends so the wrap is
  // invisible. A faint tint tinge sells the green-phosphor color bleed.
  const bandColors = ['transparent', rgba(tint, 0.04), 'rgba(255,255,255,0.12)', rgba(tint, 0.04), 'transparent'] as const
  // Each band rides with two lower-opacity copies offset a few px down — a
  // cheap vertical "smear"/ghost that fakes analog blur without a BlurView.
  const ghosts: { translate: Animated.AnimatedInterpolation<number>; dy: number; op: number }[] = [
    { translate: bandTranslate, dy: 0, op: 1 },
    { translate: bandTranslate, dy: 3, op: 0.5 },
    { translate: bandTranslate, dy: 6, op: 0.25 },
    { translate: band2Translate, dy: 0, op: 0.6 },
    { translate: band2Translate, dy: 4, op: 0.3 },
  ]

  return (
    <View pointerEvents="none" style={fill}>
      {/* fine rolling raster */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: lineLayerH, transform: [{ translateY: lineTranslate }] }}
      >
        {lines}
      </Animated.View>

      {/* TV-snow shimmer */}
      <Animated.View pointerEvents="none" style={[fill, { opacity: snowOpacity }]}>
        {dots.map((d, i) => (
          <View
            key={`snow-${i}`}
            style={{
              position: 'absolute',
              top: d.top,
              left: d.left,
              width: d.size,
              height: d.size,
              backgroundColor: SNOW,
              opacity: d.op,
            }}
          />
        ))}
      </Animated.View>

      {/* rolling tracking bands + ghost smear */}
      {ghosts.map((b, i) => (
        <Animated.View
          key={`band-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: BAND_H,
            opacity: b.op,
            transform: [{ translateY: Animated.add(b.translate, new Animated.Value(b.dy)) }],
          }}
        >
          <LinearGradient colors={bandColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={fill} />
        </Animated.View>
      ))}

      {/* chroma fringe — tiny horizontal R/C offset = analog color bleed */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,0,90,0.045)', 'transparent', 'rgba(0,220,255,0.045)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.05, y: 0 }}
        style={fill}
      />
      {/* glass vignette — subtly darkens edges so the art reads as a screen */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.22)', 'transparent', 'rgba(0,0,0,0.28)']}
        locations={[0, 0.5, 1]}
        style={fill}
      />
    </View>
  )
}

function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

// ── Rare glitch burst controller ────────────────────────────────────────────
export interface GlitchState {
  jitter: Animated.Value // -1..1, drives horizontal shake
  burst: Animated.Value // 0..1, drives tear-bar opacity + offset
}

// Self-scheduling glitch. Fires a short (~250ms) burst at a random interval in
// [minMs,maxMs], then re-schedules. `enabled=false` keeps it dormant. The
// staggered per-instance timers make a wall of cards glitch independently
// rather than in unison.
export function useGlitch({
  minMs = 5000,
  maxMs = 14000,
  enabled = true,
}: { minMs?: number; maxMs?: number; enabled?: boolean } = {}): GlitchState {
  const jitter = useRef(new Animated.Value(0)).current
  const burst = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!enabled) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>

    const fire = () => {
      if (!alive) return
      Animated.sequence([
        Animated.timing(burst, { toValue: 1, duration: 45, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 0.35, duration: 55, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 0.9, duration: 40, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 0, duration: 90, easing: Easing.linear, useNativeDriver: true }),
      ]).start()
      Animated.sequence([
        Animated.timing(jitter, { toValue: 1, duration: 35, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(jitter, { toValue: -1, duration: 45, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(jitter, { toValue: 0.5, duration: 35, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(jitter, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      ]).start()
      schedule()
    }

    const schedule = () => {
      const delay = minMs + Math.random() * (maxMs - minMs)
      timer = setTimeout(fire, delay)
    }

    schedule()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [jitter, burst, minMs, maxMs, enabled])

  return { jitter, burst }
}

// Transform style applying a glitch's horizontal jitter. Native-driver safe.
export function jitterStyle(g: GlitchState, amount = 4): Animated.WithAnimatedObject<ViewStyle> {
  return {
    transform: [
      {
        translateX: g.jitter.interpolate({ inputRange: [-1, 1], outputRange: [-amount, amount] }),
      },
    ],
  }
}

// Colored RGB "tear" bars that flash across a clipped box during a burst.
// Render INSIDE the overflow:'hidden' box (after the content). pointerEvents
// none. Bars slide opposite directions for a torn-signal feel.
export function GlitchBars({ g }: { g: GlitchState }) {
  const bars = [
    { top: '18%', h: 3, color: NEON_CYAN, dir: 1 },
    { top: '46%', h: 2, color: NEON_MAGENTA, dir: -1 },
    { top: '63%', h: 4, color: NEON_GREEN, dir: 1 },
    { top: '82%', h: 2, color: NEON_CYAN, dir: -1 },
  ] as const

  return (
    <View pointerEvents="none" style={fill}>
      {bars.map((b, i) => (
        <Animated.View
          key={`bar-${i}`}
          style={{
            position: 'absolute',
            top: b.top as ViewStyle['top'],
            left: 0,
            right: 0,
            height: b.h,
            backgroundColor: b.color,
            opacity: g.burst.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }),
            transform: [
              {
                translateX: g.burst.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, b.dir * (8 + i * 4)],
                }),
              },
            ],
          }}
        />
      ))}
      {/* full-frame brightness flash on the spike */}
      <Animated.View
        style={[
          fill,
          {
            backgroundColor: NEON_GREEN,
            opacity: g.burst.interpolate({ inputRange: [0, 1], outputRange: [0, 0.06] }),
          },
        ]}
      />
    </View>
  )
}

// ── Chromatic-aberration glitch text ────────────────────────────────────────
// Renders `text` three times: cyan + magenta ghosts offset behind a crisp main
// layer. The ghosts drift on a slow loop and snap further apart on a glitch
// burst — the signature RGB-split look. Pass the SAME GlitchState used for the
// surrounding jitter so the split lines up with the shake.
export function GlitchText({
  text,
  style,
  color = NEON_GREEN,
  ghostA = NEON_CYAN,
  ghostB = NEON_MAGENTA,
  g,
}: {
  text: string
  style: TextStyle
  color?: string
  ghostA?: string
  ghostB?: string
  g?: GlitchState
}) {
  const drift = useRef(new Animated.Value(0)).current
  const zero = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [drift])

  // Idle split breathes ±2px; a burst (if wired) kicks the ghosts to ±8px.
  const idle = drift.interpolate({ inputRange: [0, 1], outputRange: [1.4, 2.6] })
  const burstKick = g ? g.burst.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) : zero
  const splitA = Animated.add(idle, burstKick)
  const splitB = Animated.multiply(splitA, -1)

  const ghostStyle: TextStyle = { ...style, position: 'absolute' }

  return (
    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={[ghostStyle, { color: ghostA, opacity: 0.85, transform: [{ translateX: splitA }] }]}>
        {text}
      </Animated.Text>
      <Animated.Text style={[ghostStyle, { color: ghostB, opacity: 0.85, transform: [{ translateX: splitB }] }]}>
        {text}
      </Animated.Text>
      <Text style={[style, { color }]}>{text}</Text>
    </View>
  )
}

// ── Self-contained art-well overlay ─────────────────────────────────────────
// Films whatever it's layered over (e.g. the stage now-playing album art) with
// the rolling CRT raster + tracking bands, plus its own rare glitch tears.
// Drop it as the LAST child of a clipped (overflow:'hidden') box. Owns its own
// glitch state so callers don't have to wire one up.
export function CyberArtOverlay({
  coverage = 220,
  seed = 7,
  tint = NEON_GREEN,
}: {
  coverage?: number
  seed?: number
  tint?: string
}) {
  const glitch = useGlitch({ minMs: 5000, maxMs: 13000 })
  return (
    <View pointerEvents="none" style={fill}>
      <CRTOverlay coverage={coverage} snowCount={40} seed={seed} tint={tint} />
      <GlitchBars g={glitch} />
    </View>
  )
}
