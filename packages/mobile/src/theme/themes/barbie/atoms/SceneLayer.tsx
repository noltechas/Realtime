import React, { useMemo } from 'react'
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import {
  BLUSH,
  CANDY,
  Cloud,
  HILL_FAR,
  HILL_NEAR,
  PoolWater,
  SKY_MID,
  SKY_PEACH,
  SKY_PINK,
  SKY_TOP,
  SUN_HI,
  Sun,
  Twinkle,
  WHITE,
  rng,
  useLoop,
} from './_barbie'

// Barbie Land behind every screen, mounted ONCE under the navigator (screens
// are transparent so it shows through). The same painted set as the stage, in
// portrait: a flat painted sky, the sun up in the corner with its slow two-tone
// sunburst, cumulus drifting across at three speeds, and along the bottom the
// edge of town: the desert range, the pink terrazzo deck and a strip of the
// painted pool, which the tab bar sits on.
//
// Everything is drawn once and only TRANSFORMED afterwards (rotation, drift),
// all on the native driver, so the whole scene costs nothing per frame on JS.

export function SceneLayer() {
  const { width: W, height: H } = useWindowDimensions()
  const turn = useLoop(240000, 0, false)
  const sun = { x: W - 40, y: 92, size: 156 }
  const R = Math.max(W, H) * 0.95

  const clouds = useMemo(
    () => [
      { top: H * 0.07, w: W * 0.46, seed: 0.21, dur: 160000, phase: 0.15, tone: 'blush' as const, flip: false },
      { top: H * 0.19, w: W * 0.62, seed: 0.64, dur: 120000, phase: 0.62, tone: 'day' as const, flip: true },
      { top: H * 0.36, w: W * 0.4, seed: 0.37, dur: 190000, phase: 0.4, tone: 'blush' as const, flip: false },
      { top: H * 0.52, w: W * 0.56, seed: 0.83, dur: 140000, phase: 0.88, tone: 'day' as const, flip: false },
    ],
    [W, H],
  )

  const town = 262 // the strip along the bottom: hills, deck, pool
  const hills = useMemo(() => ridges(W, 92, 0.61), [W])

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[SKY_TOP, SKY_MID, SKY_PINK, SKY_PEACH]} locations={[0, 0.3, 0.64, 1]} style={StyleSheet.absoluteFill} />

      {/* the sunburst: two tones of light turning round the sun, very slowly */}
      <Animated.View
        style={{
          position: 'absolute',
          left: sun.x - R,
          top: sun.y - R,
          width: R * 2,
          height: R * 2,
          transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }}
      >
        <Svg width={R * 2} height={R * 2} viewBox="-100 -100 200 200">
          <Defs>
            <RadialGradient id="bscn-ray" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={WHITE} stopOpacity={0.5} />
              <Stop offset="0.35" stopColor={WHITE} stopOpacity={0.24} />
              <Stop offset="0.8" stopColor={WHITE} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {Array.from({ length: 24 }, (_, i) => {
            const a0 = (i / 24) * Math.PI * 2
            const a1 = a0 + Math.PI / 24
            return <Path key={i} d={`M 0 0 L ${Math.cos(a0) * 100} ${Math.sin(a0) * 100} L ${Math.cos(a1) * 100} ${Math.sin(a1) * 100} Z`} fill="url(#bscn-ray)" />
          })}
        </Svg>
      </Animated.View>

      <View style={{ position: 'absolute', left: sun.x - sun.size / 2, top: sun.y - sun.size / 2 }}>
        <Sun size={sun.size} />
      </View>
      <Twinkle size={18} color={SUN_HI} delay={300} style={{ position: 'absolute', left: sun.x - 96, top: sun.y + 40 }} />
      <Twinkle size={13} delay={1700} style={{ position: 'absolute', left: sun.x - 60, top: sun.y + 82 }} />
      <Twinkle size={16} color={CANDY} delay={2600} style={{ position: 'absolute', left: W * 0.12, top: H * 0.3 }} />
      <Twinkle size={12} delay={900} style={{ position: 'absolute', left: W * 0.32, top: H * 0.13 }} />

      {clouds.map((c, i) => (
        <DriftCloud key={i} {...c} span={W} />
      ))}

      {/* the edge of town */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: town }}>
        <Svg width={W} height={92} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Path d={hills.far} fill={HILL_FAR} />
          {hills.farShade.map((d, i) => (
            <Path key={`f${i}`} d={d} fill="#DDA4D6" opacity={0.85} />
          ))}
          <Path d={hills.near} fill={HILL_NEAR} />
          {hills.nearShade.map((d, i) => (
            <Path key={`n${i}`} d={d} fill="#C384C6" opacity={0.85} />
          ))}
          <Rect x={0} y={64} width={W} height={28} fill="#FFD9EA" opacity={0.4} />
        </Svg>
        {/* pink terrazzo deck */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 92, height: 30, backgroundColor: '#FFBFDD' }}>
          <Terrazzo width={W} height={30} />
          <LinearGradient colors={['rgba(176,17,94,0.2)', 'rgba(176,17,94,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 10 }} />
        </View>
        {/* white coping, then the water */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 122, height: 7, backgroundColor: WHITE, borderBottomWidth: 2, borderBottomColor: BLUSH }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 129, bottom: 0 }}>
          <PoolWater width={W} height={town - 129} seed={0.4} scale={0.9} />
          <Twinkle size={14} delay={1200} style={{ position: 'absolute', left: W * 0.22, top: 10 }} />
          <Twinkle size={11} delay={2900} style={{ position: 'absolute', left: W * 0.7, top: 18 }} />
        </View>
      </View>
    </View>
  )
}

function DriftCloud({ top, w, seed, dur, phase, tone, flip, span }: { top: number; w: number; seed: number; dur: number; phase: number; tone: 'day' | 'blush'; flip: boolean; span: number }) {
  const v = useLoop(dur, 0, false)
  const from = -w - 20
  const to = span + 20
  const at = from + (to - from) * phase
  // A sawtooth that starts part-way across: the loop runs 0..1 and the cloud
  // wraps from the right edge back to the left at (1 - phase).
  const cut = 1 - phase
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left: 0,
        transform: [{ translateX: v.interpolate({ inputRange: [0, cut, Math.min(1, cut + 0.0001), 1], outputRange: [at, to, from, at] }) }],
      }}
    >
      <Cloud width={w} seed={seed} tone={tone} flip={flip} />
    </Animated.View>
  )
}

/** The desert range: soft summits joined by sagging saddles, each with a
 *  flat second tone down its side away from the sun. */
function ridges(width: number, height: number, seed: number) {
  const r = rng(seed)
  const mk = (n: number, top: number, spread: number) => {
    const peaks: Array<{ x: number; y: number }> = []
    for (let i = 0; i <= n; i++) peaks.push({ x: (i / n) * width + (r() - 0.5) * (width / n) * 0.5, y: top + r() * spread })
    let d = `M -20 ${height} L -20 ${peaks[0].y}`
    const shades: string[] = []
    for (let i = 0; i < peaks.length - 1; i++) {
      const a = peaks[i]
      const b = peaks[i + 1]
      const sx = (a.x + b.x) / 2 + (r() - 0.5) * 20
      const sy = Math.max(a.y, b.y) + (height - Math.max(a.y, b.y)) * (0.35 + r() * 0.3)
      // control points just below each summit, along its slope: the curve
      // leaves the summit nearly straight, so peaks stay pointed and the
      // slopes sag into concave desert saddles
      const c1 = `${a.x + (sx - a.x) * 0.22} ${a.y + (sy - a.y) * 0.12}`
      const c2 = `${b.x - (b.x - sx) * 0.22} ${b.y + (sy - b.y) * 0.12}`
      d += ` Q ${c1} ${sx} ${sy}`
      d += ` Q ${c2} ${b.x} ${b.y}`
      shades.push(`M ${a.x} ${a.y} Q ${c1} ${sx} ${sy} L ${sx - 4} ${height} L ${a.x + 6} ${height} Q ${a.x + 10} ${(a.y + height) / 2} ${a.x} ${a.y} Z`)
    }
    d += ` L ${width + 20} ${height} Z`
    return { d, shades }
  }
  const far = mk(5, 6, 30)
  const near = mk(4, 36, 24)
  return { far: far.d, farShade: far.shades, near: near.d, nearShade: near.shades }
}

/** Terrazzo chips: mostly pale, a few in the town's colours. */
function Terrazzo({ width, height }: { width: number; height: number }) {
  const chips = useMemo(() => {
    const r = rng(0.271)
    const cols = ['#FFFFFF', '#FFFFFF', '#FFE3F0', '#F6A3CC', '#F27DB9', '#FFE7A0', '#D9C3F5']
    return Array.from({ length: Math.round((width * height) / 90) }, () => ({
      x: r() * width,
      y: r() * height,
      s: 0.7 + Math.pow(r(), 2.2) * 2.6,
      c: cols[Math.floor(r() * cols.length)],
    }))
  }, [width, height])
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {chips.map((c, i) => (
        <Rect key={i} x={c.x} y={c.y} width={c.s * 1.4} height={c.s} rx={c.s / 2} fill={c.c} />
      ))}
    </Svg>
  )
}
