import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import {
  BinaryMarks,
  DUST,
  ETCH,
  GOLD,
  GOLD_HI,
  GoldenRecord,
  GlassPanel,
  INK,
  Star,
  Twinkle,
  display,
  mono,
} from '../../theme/themes/space/atoms/_record'

// ─── Space ("Golden Record") wizard chrome ──────────────────────────────────
// Only rendered when the wizard's theme is 'space'; every use is guarded by
// `tokens.name === 'space' ?`. Same vocabulary as the theme's atoms
// (theme/themes/space/atoms/_record.tsx): black glass with engraved gold
// registration ticks, the record, and starlight.
//
//   HudBrackets   → registration ticks in a plate's corners
//   MissionTrail  → the step header as a flight path: Voyager's trajectory
//                   bending past one waypoint per step
//   AvatarOrbit   → a singer's photo pressed as the label of a gold record
//   PlanetSwatch  → each colour as a star; yours ringed with a target marker
//   AddCrewButton → an empty sleeve waiting for another record

// ── Registration ticks ──────────────────────────────────────────────────────
// Kept under its old name for the wizard's call sites. A singer's card passes
// their colour for the top pair, so the plate is marked as theirs.
export function HudBrackets({
  topColor = ETCH.strong,
  bottomColor = ETCH.strong,
  size = 12,
  thickness = 1,
  inset = 0,
}: {
  topColor?: string
  bottomColor?: string
  size?: number
  thickness?: number
  inset?: number
}) {
  const s = size * 0.8
  const pad = inset + 3
  const tick = (rot: number, color: string, pos: object, k: number) => (
    <Svg key={k} width={s} height={s} style={[{ position: 'absolute', transform: [{ rotate: `${rot}deg` }] }, pos]}>
      <Path d={`M ${thickness / 2} ${s * 0.7} L ${thickness / 2} ${thickness / 2} L ${s * 0.7} ${thickness / 2}`} stroke={color} strokeWidth={thickness} fill="none" />
    </Svg>
  )
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {tick(0, topColor, { left: pad, top: pad }, 0)}
      {tick(90, topColor, { right: pad, top: pad }, 1)}
      {tick(180, bottomColor, { right: pad, bottom: pad }, 2)}
      {tick(270, bottomColor, { left: pad, bottom: pad }, 3)}
      {/* the hairline's catch of light along the top edge */}
      <View style={{ position: 'absolute', left: 18, right: 18, top: 0, height: 1, backgroundColor: 'rgba(255,240,200,0.12)' }} />
    </View>
  )
}

// ── Flight path ─────────────────────────────────────────────────────────────
// The steps as waypoints on one shallow trajectory. The stretch already flown
// is solid gold; the rest is the dotted plotted course. Waypoints behind are
// small gold records, the current one is a star, the ones ahead are rings.
const TRAIL_W = 188
const TRAIL_H = 26
const P0 = { x: 10, y: 21 }
const P1 = { x: TRAIL_W / 2, y: -2 }
const P2 = { x: TRAIL_W - 10, y: 17 }

function bez(t: number) {
  const u = 1 - t
  return {
    x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x,
    y: u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y,
  }
}

export function MissionTrail({
  current,
  total,
  label,
}: {
  current: number // 1-based index of active step
  total: number
  label: string
}) {
  const n = Math.max(1, total)
  const at = (i: number) => (n === 1 ? 0.5 : 0.08 + (0.84 * i) / (n - 1))
  const flown = at(Math.min(n, Math.max(1, current)) - 1)
  // the flown part of the curve, split at `flown` (de Casteljau)
  const end = bez(flown)
  const c = { x: P0.x + flown * (P1.x - P0.x), y: P0.y + flown * (P1.y - P0.y) }
  const full = `M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`
  const done = `M ${P0.x} ${P0.y} Q ${c.x.toFixed(2)} ${c.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`

  const enter = useRef(new Animated.Value(0)).current
  useEffect(() => {
    enter.setValue(0)
    Animated.timing(enter, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [current, enter])

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: TRAIL_W, height: TRAIL_H }}>
        <Svg width={TRAIL_W} height={TRAIL_H}>
          <Path d={full} stroke={ETCH.mid} strokeWidth={1} strokeDasharray="1.5 4" strokeLinecap="round" fill="none" />
          <Path d={done} stroke={ETCH.strong} strokeWidth={1.2} fill="none" />
          {Array.from({ length: n }, (_, i) => {
            const p = bez(at(i))
            const step = i + 1
            if (step < current) {
              return (
                <React.Fragment key={i}>
                  <Circle cx={p.x} cy={p.y} r={4.2} fill={GOLD} />
                  <Circle cx={p.x} cy={p.y} r={1.3} fill={INK} />
                </React.Fragment>
              )
            }
            if (step > current) return <Circle key={i} cx={p.x} cy={p.y} r={3.6} fill="#05060C" stroke={ETCH.strong} strokeWidth={1} />
            return null
          })}
        </Svg>
        {(() => {
          const p = bez(at(Math.min(n, Math.max(1, current)) - 1))
          return (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: p.x - 15,
                top: p.y - 15,
                opacity: enter,
                transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              }}
            >
              <Twinkle size={30} color={GOLD_HI} period={3600} />
            </Animated.View>
          )
        })()}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }}>
        <Text style={mono(9, DUST, { letterSpacing: 2.2 })}>
          Step {current} of {total}
        </Text>
        <BinaryMarks n={current} bits={2} height={8} gap={2.5} color={ETCH.strong} />
      </View>
      <Text numberOfLines={1} style={display(15, GOLD_HI, 400, { letterSpacing: 3.4, marginTop: 3 })}>
        {label}
      </Text>
    </View>
  )
}

// ── A singer pressed as a record ────────────────────────────────────────────
// The photo (or initial) is the label of a small gold record; a ring in the
// singer's colour runs round the label, and their star sits on the rim.
export function AvatarOrbit({
  size = 44,
  color,
  children,
}: {
  size?: number
  color: string
  children: React.ReactNode
}) {
  const outer = size + 18
  const ratio = size / outer
  const ring = size + 3
  return (
    <View style={{ width: outer, height: outer }}>
      <GoldenRecord size={outer} labelRatio={ratio} labelColor={color}>
        {children}
      </GoldenRecord>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: (outer - ring) / 2,
          top: (outer - ring) / 2,
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 1.5,
          borderColor: color,
        }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', right: -6, top: -6 }}>
        <Star size={20} color={color} />
      </View>
    </View>
  )
}

// ── A colour as a star ──────────────────────────────────────────────────────
// Unchosen stars sit small and steady; the chosen one swells, its spikes
// reaching out, inside the chart's target marker. A colour someone else has
// is a dim star with an engraved strike through it.
export function PlanetSwatch({
  color,
  selected,
  takenByOther,
  onPress,
}: {
  color: string
  selected: boolean
  takenByOther: boolean
  onPress: () => void
  seed: number
}) {
  const grow = useRef(new Animated.Value(selected ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(grow, { toValue: selected ? 1 : 0, stiffness: 220, damping: selected ? 11 : 18, mass: 0.7, useNativeDriver: true }).start()
  }, [selected, grow])
  const S = 44
  return (
    <Pressable
      onPress={() => {
        if (takenByOther) return
        onPress()
      }}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: takenByOther }}
      style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={S} height={S} style={StyleSheet.absoluteFill}>
        {selected ? (
          <>
            <Circle cx={S / 2} cy={S / 2} r={17} fill="none" stroke={ETCH.strong} strokeWidth={1} />
            {[0, 90, 180, 270].map((a) => {
              const r = (a * Math.PI) / 180
              return (
                <Line
                  key={a}
                  x1={S / 2 + Math.cos(r) * 14}
                  y1={S / 2 + Math.sin(r) * 14}
                  x2={S / 2 + Math.cos(r) * 21}
                  y2={S / 2 + Math.sin(r) * 21}
                  stroke={ETCH.strong}
                  strokeWidth={1.2}
                />
              )
            })}
          </>
        ) : null}
      </Svg>
      <Animated.View
        style={{
          opacity: takenByOther ? 0.28 : 1,
          transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.62, 0.95] }) }],
        }}
      >
        <Star size={S} color={color} />
      </Animated.View>
      {takenByOther ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width={S} height={S}>
            <Line x1={12} y1={32} x2={32} y2={12} stroke={ETCH.mid} strokeWidth={1} />
          </Svg>
        </View>
      ) : null}
    </Pressable>
  )
}

// ── Add another singer ──────────────────────────────────────────────────────
// An empty sleeve: a dotted gold outline where another record will go,
// beside the line that asks for one.
export function AddCrewButton({ onPress }: { onPress: () => void }) {
  const press = useRef(new Animated.Value(0)).current
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: v ? 90 : 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  return (
    <Pressable onPress={onPress} onPressIn={() => to(1)} onPressOut={() => to(0)} style={{ marginTop: 4 }} accessibilityRole="button">
      <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] }) }] }}>
        <GlassPanel radius={12} edge={ETCH.faint} contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 14 }}>
          <Svg width={40} height={40}>
            <Circle cx={20} cy={20} r={18.5} fill="none" stroke={ETCH.strong} strokeWidth={1} strokeDasharray="1.5 3.5" strokeLinecap="round" />
            <Circle cx={20} cy={20} r={8} fill="none" stroke={ETCH.mid} strokeWidth={1} strokeDasharray="1.5 3" strokeLinecap="round" />
            <Line x1={20} y1={15} x2={20} y2={25} stroke={GOLD} strokeWidth={1.4} strokeLinecap="round" />
            <Line x1={15} y1={20} x2={25} y2={20} stroke={GOLD} strokeWidth={1.4} strokeLinecap="round" />
          </Svg>
          <View style={{ flex: 1 }}>
            <Text style={display(13, GOLD_HI, 500, { letterSpacing: 2.6 })}>Add another singer</Text>
            <Text style={mono(9, DUST, { marginTop: 3, letterSpacing: 1.6 })}>Another voice for the record</Text>
          </View>
        </GlassPanel>
      </Animated.View>
    </Pressable>
  )
}
