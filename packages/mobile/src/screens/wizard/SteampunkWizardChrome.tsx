import React, { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'
import {
  BRASS_HI,
  CAST,
  GearTrain,
  JewelLamp,
  LAMP,
  PARCHMENT_DIM,
  Plaque,
  Porthole,
  Press,
  Rivet,
  caps,
  display,
  gearGeometry,
  meshTrain,
  type TrainLink,
} from '../../theme/themes/steampunk/atoms/_engine'

// ─── Steampunk ("The Vox Engine") wizard chrome ──────────────────────────────
// Only rendered when the wizard's theme is 'steampunk'; every use is guarded by
// `tokens.name === 'steampunk' ?`. Same vocabulary as the theme's atoms
// (theme/themes/steampunk/atoms/_engine.tsx): rendered rivets, meshing gears,
// portholes, jewel lamps, enamel plates in riveted brass frames.
//
//   BrassFrame              rendered rivets in a card's corners
//   ConveyorTrail           the steps as a little train of meshing gears; the
//                           current step's gear has its lamp lit
//   AvatarGearWreath        a singer seen through a small porthole
//   JewelBezelSwatch        each colour as a jewel lamp; yours ringed in brass
//   SteampunkAddCrewButton  an empty porthole, waiting for another singer

export function BrassFrame({
  size = 7,
  filigree = true,
}: {
  size?: number
  rivetColor?: string
  filigree?: boolean
}) {
  const r = Math.max(6, size)
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Rivet size={r} style={{ position: 'absolute', left: 5, top: 5 }} />
      <Rivet size={r} style={{ position: 'absolute', right: 5, top: 5 }} />
      <Rivet size={r} style={{ position: 'absolute', left: 5, bottom: 5 }} />
      <Rivet size={r} style={{ position: 'absolute', right: 5, bottom: 5 }} />
      {filigree ? (
        <>
          <View style={{ position: 'absolute', top: 3, left: 20, right: 20, height: 1, backgroundColor: 'rgba(233,199,127,0.35)' }} />
          <View style={{ position: 'absolute', bottom: 3, left: 20, right: 20, height: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        </>
      ) : null}
    </View>
  )
}

// ── The steps, as a train of gears ──────────────────────────────────────────
const TRAIN_SCALE = 0.13

export function ConveyorTrail({ current, total, label }: { current: number; total: number; label: string }) {
  const n = Math.max(1, total)
  const teeth = (i: number) => (i % 2 === 0 ? 18 : 14) as 18 | 14
  const gears = useMemo(() => {
    const links: TrainLink[] = Array.from({ length: n - 1 }, (_, i) => ({ teeth: teeth(i + 1), deg: i % 2 === 0 ? -8 : 8 }))
    const first = gearGeometry(teeth(0)).size * TRAIN_SCALE
    return meshTrain({ teeth: teeth(0), x: first / 2 + 2, y: 20, phase: 0 }, links, TRAIN_SCALE)
  }, [n])
  const width = gears.length ? gears[gears.length - 1].x + (gearGeometry(teeth(n - 1)).size * TRAIN_SCALE) / 2 + 2 : 40
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width, height: 40 }}>
        <GearTrain gears={gears} shadow={2} opacity={1} />
        {gears.map((g, i) => {
          const step = i + 1
          return (
            <View key={i} pointerEvents="none" style={{ position: 'absolute', left: g.x - 6, top: g.y - 6 }}>
              <JewelLamp color={LAMP} size={12} lit={step <= current} />
            </View>
          )
        })}
      </View>
      <Text style={caps(9, PARCHMENT_DIM, { letterSpacing: 2.2, marginTop: 2 })}>
        Step {current} of {total}
      </Text>
      <Text numberOfLines={1} style={[display(17, undefined, { marginTop: 1 }), CAST]}>
        {label}
      </Text>
    </View>
  )
}

// ── A singer through a porthole ─────────────────────────────────────────────
export function AvatarGearWreath({ size = 44, color, children }: { size?: number; color: string; children: React.ReactNode }) {
  const P = size + 24
  return (
    <View style={{ width: P, height: P }}>
      <Porthole size={P}>
        <View style={{ width: '100%', height: '100%', backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </Porthole>
      <View pointerEvents="none" style={{ position: 'absolute', right: -3, top: -3 }}>
        <JewelLamp color={color} size={16} />
      </View>
    </View>
  )
}

// ── A colour as a jewel lamp ────────────────────────────────────────────────
export function JewelBezelSwatch({
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
  const S = 42
  return (
    <Pressable
      onPress={() => {
        if (takenByOther) return
        onPress()
      }}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: takenByOther }}
      style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center', opacity: takenByOther ? 0.32 : 1 }}
    >
      {selected ? (
        <Svg width={S} height={S} style={{ position: 'absolute' }}>
          <Circle cx={S / 2} cy={S / 2} r={S / 2 - 1.5} fill="none" stroke={BRASS_HI} strokeWidth={2} />
        </Svg>
      ) : null}
      <JewelLamp color={color} size={selected ? 31 : 26} glow={selected} />
      {takenByOther ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
          <Svg width={S} height={S}>
            <Line x1={11} y1={31} x2={31} y2={11} stroke={BRASS_HI} strokeWidth={1.4} />
          </Svg>
        </View>
      ) : null}
    </Pressable>
  )
}

// ── Add another singer ──────────────────────────────────────────────────────
export function SteampunkAddCrewButton({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" style={{ marginTop: 4 }}>
      <Plaque border={10} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2, paddingHorizontal: 6 }}>
        <Porthole size={46} glass={false}>
          <Text style={display(22, BRASS_HI, { lineHeight: 26 })}>+</Text>
        </Porthole>
        <View style={{ flex: 1 }}>
          <Text style={[display(16), CAST]}>Add another singer</Text>
          <Text style={caps(8.5, PARCHMENT_DIM, { letterSpacing: 1.6, marginTop: 2 })}>Another hand at the controls</Text>
        </View>
      </Plaque>
    </Press>
  )
}
