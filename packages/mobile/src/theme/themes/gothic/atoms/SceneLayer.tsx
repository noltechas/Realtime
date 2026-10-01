import React, { useMemo } from 'react'
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native'
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { VOID, Watcher, archPath, archRise, rng, useLoop, useStorm } from './_gothic'

// ── The nave wall ───────────────────────────────────────────────────────────
// Mounted ONCE behind the entire navigator (ThemeCrossfade), never per screen.
//
// No window is drawn. Drawing the window is what makes a backdrop look like an
// illustration pasted behind the interface. Instead the phone is the wall of
// the nave, and the window is known only by the LIGHT IT THROWS on that wall:
//
//   • ASHLAR. Real masonry, generated once: courses of dressed blocks, each a
//     slightly different stone, its upper edge catching light and its lower
//     edge falling into a shadowed mortar joint; the odd chipped arris, a soot
//     stain, and one consecration cross cut into a block, as old churches have.
//   • THE CAST LIGHT. Moonlight through an unseen lancet falls across the wall
//     as a sheared, soft-edged patch with the tracery standing in it as shadow
//     (mullion, transom, the quatrefoil in the head). Clouds crossing the moon
//     slowly dim and return it.
//   • RAIN. Seen only as the shadows of drops running down the glass, sliding
//     through that patch of light. Nowhere else.
//   • THE STORM. Lightning (the app's one shared clock) makes the patch blaze
//     blue-white for an instant, so the window's shape flashes across the stone.
//   • CANDLES out of frame below: warm light raking up the bottom of the wall.
//   • and, low in the dark, now and then, a pair of eyes.
//
// The masonry is one static SVG, painted once. Everything that moves is
// native-driver opacity/transform on a few thin layers above it.

const COURSE = 34
const JOINT = 2

interface Block {
  x: number
  y: number
  w: number
  tone: number
  chip: number
  stain: boolean
}

function buildAshlar(W: number, H: number): { blocks: Block[]; cross: { x: number; y: number } } {
  const r = rng(91827)
  const blocks: Block[] = []
  for (let row = 0, y = -8; y < H + COURSE; row++, y += COURSE) {
    let x = -(row % 2 === 0 ? 0 : 38 + r() * 30)
    while (x < W + 10) {
      const w = 58 + Math.floor(r() * 70)
      blocks.push({ x, y, w, tone: r(), chip: r() < 0.12 ? (r() < 0.5 ? 1 : 2) : 0, stain: r() < 0.08 })
      x += w
    }
  }
  // The consecration cross sits in a block about a third of the way down.
  const candidates = blocks.filter((b) => b.y > H * 0.28 && b.y < H * 0.4 && b.x > W * 0.6 && b.x + b.w < W - 6)
  const pick = candidates[Math.floor(r() * Math.max(1, candidates.length))] ?? blocks[0]
  return { blocks, cross: { x: pick.x + pick.w / 2, y: pick.y + COURSE / 2 } }
}

// Four dressed-stone tones, close together: limestone isn't paint.
const STONES = ['#1A1720', '#1C1922', '#17151D', '#1E1A21']

export function SceneLayer(): React.ReactElement {
  const { width: W, height: H } = useWindowDimensions()
  const flash = useStorm()
  const clouds = useLoop(23000)
  const rain = useLoop(2600, 0, false)
  const rainB = useLoop(3700, 900, false)
  const fog = useLoop(46000)

  const { blocks, cross } = useMemo(() => buildAshlar(W, H), [W, H])

  // The cast window: a lancet of light, sheared because the moon is high and to
  // the right, laid across the upper middle of the wall.
  const pw = Math.round(W * 0.62)
  const ph = Math.round(H * 0.62)
  const px = Math.round(W * 0.36)
  const py = Math.round(H * 0.11)
  const SHEAR = '-17deg'
  const rise = archRise(pw, 1)
  const half = pw / 2
  const subRise = archRise(half, 1)
  const transom = ph * 0.64
  const ocR = pw * 0.14
  const ocY = rise * 0.62

  const tracery = (
    <G stroke="#000" fill="none">
      {/* mullion */}
      <Path d={`M ${half} ${rise * 0.78} L ${half} ${ph}`} strokeWidth={pw * 0.034} />
      {/* sub-arch heads of the two lights */}
      <Path d={archPath(half, ph, 0, 1, 0, rise * 0.92)} strokeWidth={pw * 0.02} />
      <Path d={archPath(half, ph, 0, 1, half, rise * 0.92)} strokeWidth={pw * 0.02} />
      {/* transom */}
      <Path d={`M 0 ${transom} L ${pw} ${transom}`} strokeWidth={pw * 0.024} />
      {/* quatrefoil in the head */}
      {[0, 90, 180, 270].map((a) => (
        <Circle key={a} cx={half + Math.cos((a * Math.PI) / 180) * ocR * 0.5} cy={ocY + Math.sin((a * Math.PI) / 180) * ocR * 0.5} r={ocR * 0.52} strokeWidth={pw * 0.014} />
      ))}
      <Circle cx={half} cy={ocY} r={ocR * 1.08} strokeWidth={pw * 0.018} />
    </G>
  )

  // The patch itself, drawn at a given brightness with its tracery cut out.
  const patch = (id: string, color: string, edgeColor: string) => (
    <Svg width={pw + 24} height={ph + 24} style={{ position: 'absolute', left: -12, top: -12 }}>
      <Defs>
        <RadialGradient id={`${id}g`} cx="50%" cy="34%" rx="62%" ry="70%">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="0.7" stopColor={color} stopOpacity={0.75} />
          <Stop offset="1" stopColor={edgeColor} stopOpacity={0.35} />
        </RadialGradient>
        <SvgLinearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={1} />
          <Stop offset="0.75" stopColor="#fff" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </SvgLinearGradient>
        <Mask id={`${id}m`} x="0" y="0" width={pw + 24} height={ph + 24} maskUnits="userSpaceOnUse">
          <G transform="translate(12 12)">
            {/* soft edge: the opening, then two slightly larger, fainter copies */}
            <Path d={archPath(pw + 14, ph + 8, 0, 1, -7, -6)} fill="#fff" opacity={0.18} />
            <Path d={archPath(pw + 6, ph + 3, 0, 1, -3, -2.5)} fill="#fff" opacity={0.35} />
            <Path d={archPath(pw, ph, 0, 1)} fill={`url(#${id}f)`} />
            {/* Shadows of the tracery have a penumbra: a wide faint edge round a
                narrower core, neither fully dark (sky light still leaks past). */}
            <G opacity={0.2} transform={`translate(${pw * 0.5} ${ph * 0.5}) scale(1.035) translate(${-pw * 0.5} ${-ph * 0.5})`}>{tracery}</G>
            <G opacity={0.4}>{tracery}</G>
          </G>
        </Mask>
      </Defs>
      <Rect x={0} y={0} width={pw + 24} height={ph + 24} fill={`url(#${id}g)`} mask={`url(#${id}m)`} />
    </Svg>
  )

  const rainColumn = (k: number, total: number, seed: number) => {
    const r = rng(seed + k * 31)
    const drops = Array.from({ length: 6 }, () => ({ y: r() * ph * 1.4, len: 10 + r() * 26, w: 1.4 + r() * 2.2, x: r() * 6 - 3 }))
    const x = ((k + 0.5) / total) * pw
    return drops.map((d, i) => (
      <Rect key={`${k}-${i}`} x={x + d.x} y={d.y} width={d.w} height={d.len} rx={d.w / 2} fill="#000" opacity={0.16} />
    ))
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: VOID, overflow: 'hidden' }]}>
      {/* the masonry, painted once */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          {STONES.map((c, i) => (
            <SvgLinearGradient key={i} id={`gnv-st${i}`} x1="0" y1="0" x2="0.2" y2="1">
              <Stop offset="0" stopColor={c} />
              <Stop offset="1" stopColor="#0F0D13" />
            </SvgLinearGradient>
          ))}
          <RadialGradient id="gnv-stain" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#000" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#000" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="gnv-moon" cx="85%" cy="-10%" rx="95%" ry="70%">
            <Stop offset="0" stopColor="#8EA2CC" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#8EA2CC" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="gnv-candle" cx="50%" cy="112%" rx="80%" ry="46%">
            <Stop offset="0" stopColor="#F0A048" stopOpacity={0.26} />
            <Stop offset="0.5" stopColor="#C9702A" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#C9702A" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="#09080C" />
        {blocks.map((b, i) => {
          const x = b.x + JOINT / 2
          const y = b.y + JOINT / 2
          const w = b.w - JOINT
          const h = COURSE - JOINT
          return (
            <G key={i}>
              <Rect x={x} y={y} width={w} height={h} fill={`url(#gnv-st${Math.floor(b.tone * STONES.length)})`} />
              {/* the dressed face catches light on its upper and left arrises */}
              <Path d={`M ${x} ${y + h} L ${x} ${y} L ${x + w} ${y}`} stroke="#B9B0C6" strokeOpacity={0.07 + b.tone * 0.05} strokeWidth={1} fill="none" />
              <Path d={`M ${x + 1} ${y + h - 0.5} L ${x + w - 0.5} ${y + h - 0.5} L ${x + w - 0.5} ${y + 1}`} stroke="#000" strokeOpacity={0.55} strokeWidth={1.2} fill="none" />
              {b.chip === 1 ? <Path d={`M ${x} ${y} L ${x + 7} ${y} L ${x} ${y + 5} Z`} fill="#0A090D" /> : null}
              {b.chip === 2 ? <Path d={`M ${x + w} ${y + h} L ${x + w - 9} ${y + h} L ${x + w} ${y + h - 6} Z`} fill="#0A090D" /> : null}
              {b.stain ? <Rect x={x} y={y - 4} width={w} height={h + 14} fill="url(#gnv-stain)" /> : null}
            </G>
          )
        })}
        {/* consecration cross, cut shallow into one stone */}
        <G transform={`translate(${cross.x} ${cross.y})`} opacity={0.5}>
          <Circle r={10} stroke="#000" strokeOpacity={0.6} strokeWidth={1.4} fill="none" />
          <Path d="M 0 -7 L 0 7 M -7 0 L 7 0" stroke="#000" strokeOpacity={0.6} strokeWidth={2} />
          <Path d="M 0.8 -6.2 L 0.8 7.8 M -6.2 0.8 L 7.8 0.8" stroke="#B9B0C6" strokeOpacity={0.1} strokeWidth={0.8} />
        </G>
        <Rect x={0} y={0} width={W} height={H} fill="url(#gnv-moon)" />
        <Rect x={0} y={0} width={W} height={H} fill="url(#gnv-candle)" />
      </Svg>

      {/* The window's light on the wall: dims as clouds cross the moon. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: px,
          top: py,
          width: pw,
          height: ph,
          opacity: clouds.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.24] }),
          transform: [{ skewX: SHEAR }],
        }}
      >
        {patch('gnv-lp', '#C9D6F5', '#7F93C2')}
      </Animated.View>

      {/* Rain: the shadows of drops on the glass, sliding through the light. */}
      <View style={{ position: 'absolute', left: px, top: py + rise, width: pw, height: ph - rise, overflow: 'hidden', opacity: 0.55, transform: [{ skewX: SHEAR }] }}>
        <Animated.View style={{ position: 'absolute', left: 0, top: -ph * 0.4, width: pw, height: ph * 1.4, transform: [{ translateY: rain.interpolate({ inputRange: [0, 1], outputRange: [0, ph * 0.4] }) }] }}>
          <Svg width={pw} height={ph * 1.4}>
            {Array.from({ length: 7 }, (_, k) => rainColumn(k, 7, 5))}
          </Svg>
        </Animated.View>
        <Animated.View style={{ position: 'absolute', left: 0, top: -ph * 0.4, width: pw, height: ph * 1.4, transform: [{ translateY: rainB.interpolate({ inputRange: [0, 1], outputRange: [0, ph * 0.4] }) }] }}>
          <Svg width={pw} height={ph * 1.4}>
            {Array.from({ length: 5 }, (_, k) => rainColumn(k, 5, 77))}
          </Svg>
        </Animated.View>
      </View>

      {/* Lightning: the window blazes across the stone, and the room goes cold. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: flash }]}>
        <View style={{ position: 'absolute', left: px, top: py, width: pw, height: ph, transform: [{ skewX: SHEAR }] }}>
          {patch('gnv-fp', '#E4EAFF', '#AFC3EA')}
        </View>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(150,170,230,0.08)' }]} />
      </Animated.View>

      {/* fog low on the floor */}
      <Animated.View
        style={{
          position: 'absolute',
          left: -W * 0.3,
          width: W * 1.6,
          bottom: 0,
          height: H * 0.3,
          opacity: 0.9,
          transform: [{ translateX: fog.interpolate({ inputRange: [0, 1], outputRange: [-W * 0.08, W * 0.08] }) }],
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="gnv-fog" cx="50%" cy="100%" rx="55%" ry="70%">
              <Stop offset="0" stopColor="#9AA6C8" stopOpacity={0.12} />
              <Stop offset="0.6" stopColor="#9AA6C8" stopOpacity={0.05} />
              <Stop offset="1" stopColor="#9AA6C8" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#gnv-fog)" />
        </Svg>
      </Animated.View>

      {/* something low in the dark */}
      <View style={{ position: 'absolute', left: W * 0.08, top: H * 0.7 }}>
        <Watcher size={28} />
      </View>

      {/* vignette */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="gnv-vig" cx="52%" cy="40%" rx="78%" ry="66%">
            <Stop offset="0.5" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.62} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#gnv-vig)" />
      </Svg>
    </View>
  )
}
