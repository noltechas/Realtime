import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  BLUE,
  GRAPHITE,
  GRAPHITE_SOFT,
  Ghost,
  IMG,
  INK,
  LETTER,
  Mark,
  PencilBox,
  Press,
  RED,
  SHEET,
  Tape,
  WaitingBall,
  letter,
  note,
  printed,
  wobble,
} from '../../theme/themes/sketch/atoms/_pencil'

// ─── Sketch ("Follow the Bouncing Ball") wizard chrome ──────────────────────
// Only rendered when the wizard's theme is 'sketch'; every use is guarded by
// `tokens.name === 'sketch' ?`. Same vocabulary as the theme's atoms
// (theme/themes/sketch/atoms/_pencil.tsx): drawn marks, tape, prints, the ball.
//
//   SheetTape          a scrap of masking tape holding a card to the sheet
//   BounceTrail        the steps as frames along a ground line; the ball sits
//                      on the current one, onion skins on the ones done
//   AvatarPrint        a singer as a little print taped to the card
//   PencilSwatch       each colour as a coloured-pencil swatch; yours ringed
//                      and ticked, one already taken crossed out
//   SketchAddSingerButton  a pencilled box: another hand at the desk

export const SKETCH_HEADING = { fontFamily: LETTER, fontWeight: 'normal' as const, color: INK }

export function SheetTape({ seed = 0 }: { seed?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: -7, alignItems: 'center' }}>
      <Tape width={84} variant={seed % 3} angle={wobble(seed, 2) * 4} style={{ position: 'relative' }} />
    </View>
  )
}

// ── The steps, as frames of a bounce ────────────────────────────────────────
const GAP = 34

export function BounceTrail({ current, total, label }: { current: number; total: number; label: string }) {
  const n = Math.max(1, total)
  const w = (n - 1) * GAP + 24
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: w, height: 40 }}>
        {/* the ground, ruled in pencil */}
        <View style={{ position: 'absolute', left: -6, right: -6, top: 27, height: 1.6, borderRadius: 1, backgroundColor: GRAPHITE, opacity: 0.6 }} />
        {Array.from({ length: n }, (_, i) => {
          const step = i + 1
          const x = 12 + i * GAP
          const done = step < current
          const here = step === current
          return (
            <View key={i} style={{ position: 'absolute', left: x - 10, top: 0, width: 20, height: 40, alignItems: 'center' }}>
              {done ? <Ghost d={12} color={BLUE} opacity={0.55} style={{ position: 'absolute', top: 27 - 12 - (12 / 0.77 - 12) / 2 - 1 }} /> : null}
              {here ? (
                <View style={{ position: 'absolute', top: 27 - 14 - (14 / 0.77 - 14) / 2 }}>
                  <WaitingBall d={14} color={RED} height={7} period={1000} />
                </View>
              ) : null}
              <Text style={note(14, here ? RED : done ? GRAPHITE : GRAPHITE_SOFT, { position: 'absolute', top: 29 })}>{step}</Text>
            </View>
          )
        })}
      </View>
      <Text style={printed(8.5, GRAPHITE_SOFT, { marginTop: 4 })}>
        Step {current} of {total}
      </Text>
      <Text numberOfLines={1} style={letter(17, INK, { marginTop: 1, lineHeight: 22 })}>
        {label}
      </Text>
    </View>
  )
}

// ── A singer, as a print taped to the card ──────────────────────────────────
export function AvatarPrint({ size = 44, color, children }: { size?: number; color: string; children: React.ReactNode }) {
  const P = size + 10
  return (
    <View style={{ width: P, height: P }}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FBFAF6', padding: 3, shadowColor: '#2A2218', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }]}>
        <View style={{ flex: 1, overflow: 'hidden', backgroundColor: SHEET, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      </View>
      <Tape width={34} variant={1} angle={-6} style={{ left: P / 2 - 17, top: -7 }} />
      <Mark src={IMG.swatch} color={color} width={18} height={18} style={{ position: 'absolute', right: -7, bottom: -5, transform: [{ rotate: '30deg' }] }} />
    </View>
  )
}

// ── A colour, as a coloured-pencil swatch ───────────────────────────────────
export function PencilSwatch({
  color,
  selected,
  takenByOther,
  onPress,
  seed,
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
      style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center', opacity: takenByOther ? 0.38 : 1 }}
    >
      <Mark src={IMG.swatch} color={color} width={selected ? 36 : 31} height={selected ? 36 : 31} style={{ transform: [{ rotate: `${wobble(seed, 4) * 40}deg` }] }} />
      {selected ? (
        <>
          <Mark src={IMG.ringRound} color={GRAPHITE} width={S + 4} height={S + 4} style={{ position: 'absolute', left: -2, top: -2 }} />
          <Mark src={IMG.check} color={GRAPHITE} width={20} height={20} style={{ position: 'absolute', right: -6, top: -7 }} />
        </>
      ) : null}
      {takenByOther ? <Mark src={IMG.cross} color={GRAPHITE} width={26} height={26} style={{ position: 'absolute' }} /> : null}
    </Pressable>
  )
}

// ── Add another singer ──────────────────────────────────────────────────────
export function SketchAddSingerButton({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" style={{ marginTop: 4 }}>
      <PencilBox border={14} color={GRAPHITE_SOFT} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4, paddingHorizontal: 6 }}>
        <Text style={letter(30, BLUE, { lineHeight: 34 })}>+</Text>
        <View style={{ flex: 1 }}>
          <Text style={letter(16, INK, { lineHeight: 21 })}>Add another singer</Text>
          <Text style={note(18, GRAPHITE_SOFT)}>another hand at the desk</Text>
        </View>
      </PencilBox>
    </Press>
  )
}
