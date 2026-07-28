import React from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import {
  DYES,
  INK,
  INK_LINE,
  INK_SOFT,
  Sunburst,
  WARM,
  phaseFor,
  pouredRadii,
  usePulse,
  useSpin,
} from './_glass'

// ── "You're up" — the one moment the interface is allowed to shout ──────────
//
// A cream poster panel with a slow multicolour wheel turning behind the lettering and a
// row of dye lamps burning underneath it. Every device in the theme's vocabulary at once,
// which is appropriate exactly here and nowhere else: this is the announcement that the
// guest is on stage NOW.
//
// It replaced a plain white panel with one small pink dot, which read as a notification
// rather than a callout.
//
// Two constraints keep it from becoming unreadable:
//
//   • THE WHEEL STAYS DIM (14%) AND BEHIND. Ink on cream is ~18:1; ink on cream veiled by
//     a 14% wheel is still far past AA at this size. Any louder and the lettering starts
//     to fight the rays crossing it.
//   • THE LETTERING NEVER ANIMATES. The lamps and the wheel move; the words hold still at
//     full contrast. An alert whose text is mid-fade when you glance at it has failed.
const LAMPS = 5

export function PsychedelicYoureUpHero() {
  const { tokens } = useTheme()
  // 40s per revolution — at this size anything quicker reads as a loading spinner.
  const spin = useSpin(40000)
  const radii = pouredRadii('youre-up', 24, 10)

  return (
    <View
      style={[
        radii,
        {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 10,
        },
      ]}
    >
      <View style={[radii, { overflow: 'hidden', backgroundColor: WARM }]}>
        {/* The wheel, clipped to the panel and centred on the lettering. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { alignItems: 'center', justifyContent: 'center', transform: [{ rotate: spin }] },
          ]}
        >
          <Sunburst size={520} colors={DYES} spokes={24} opacity={0.14} />
        </Animated.View>

        <View style={{ paddingVertical: 22, paddingHorizontal: 22, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: 40,
              lineHeight: 46,
              color: INK,
            }}
          >
            You're Up!
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontFamily: tokens.fontBody,
              fontSize: 13,
              fontWeight: '800',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              color: INK_SOFT,
            }}
          >
            Grab the mic
          </Text>

          {/* Footlights. Each burns on its own period and phase, so the row ripples
              rather than blinking as one. */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {Array.from({ length: LAMPS }, (_, index) => (
              <Lamp key={index} index={index} />
            ))}
          </View>
        </View>

        {/* Keyline last, above the wheel and the type. */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { ...radii, borderWidth: INK_LINE, borderColor: INK }]}
        />
      </View>
    </View>
  )
}

function Lamp({ index }: { index: number }) {
  // Periods are staggered as well as phases: identical periods on different phases still
  // drift into alignment for a moment every cycle, which shows up as the whole row
  // flashing together.
  const period = 2200 + index * 260
  const beat = usePulse(period, phaseFor(index, period))
  const scale = beat.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.18] })
  return (
    <Animated.View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: DYES[index % DYES.length],
        borderWidth: 2,
        borderColor: INK,
        transform: [{ scale }],
      }}
    />
  )
}
