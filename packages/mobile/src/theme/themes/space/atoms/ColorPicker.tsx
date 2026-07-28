import React from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import type { ColorPickerProps } from '../../../types'
import { ICE, Lamp, MONO, TEXT_FAINT, usePressTravel } from './_ship'

// Space colour picker — a lamp bank.
//
// The obvious move for a space theme is planets-as-swatches, which is what the
// previous version did (and what the pick-a-planet metaphor pulls every designer
// toward). A row of hexagonal annunciator lamps is both more honest to the
// flight-deck premise and more legible: a lamp is unambiguously a *selectable
// indicator*, whereas a planet with a ring is a picture of something.
//
// Unselected lamps are genuinely unlit — dim lens, steel bezel, no halo — so the
// lit one is unmistakable at a glance.
//
// The bank wraps rather than scrolling sideways: a scroller cut the last lamps
// off at the screen edge, and a panel that hides half its annunciators is not a
// panel. CELL + gap fits seven per row, so 13 lands as a clean 7 + 6. Each lamp
// sits in a fixed CELL and only its own diameter changes when lit, so selecting
// a colour never reflows the bank.
const CELL = 44
export function SpaceColorPicker({ value, onChange, label = 'Your Color' }: ColorPickerProps) {
  const { tokens } = useTheme()
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          marginBottom: 10,
          gap: 8,
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 10,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: tokens.muted,
          }}
        >
          {label}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(91,233,255,0.14)' }} />
        <Text style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.2, color: TEXT_FAINT }}>
          {(value + 1).toString().padStart(2, '0')}/
          {UNIVERSAL_SINGER_COLORS.length.toString().padStart(2, '0')}
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 24,
          paddingVertical: 6,
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 6,
          rowGap: 10,
        }}
      >
        {UNIVERSAL_SINGER_COLORS.map((entry, index) => (
          <LampKey
            key={entry.color}
            color={entry.color}
            lit={index === value}
            onPress={() => onChange(index)}
          />
        ))}
      </View>
    </View>
  )
}

function LampKey({
  color,
  lit,
  onPress,
}: {
  color: string
  lit: boolean
  onPress: () => void
}) {
  const { transform, onPressIn, onPressOut } = usePressTravel(0.8)
  const size = lit ? 40 : 32

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={8}>
      {/* Animated.View, not View — the press transform is a set of animated
          interpolations and a plain View can't resolve them. */}
      <Animated.View
        style={[
          {
            width: CELL,
            height: CELL,
            alignItems: 'center',
            justifyContent: 'center',
          },
          { transform },
        ]}
      >
        <Lamp size={size} color={color} lit={lit} glow={1.1} />
        {/* Selected lamps get a machined index mark beneath, so selection is
            legible even for a colour that happens to be low-contrast here. */}
        <View
          style={{
            position: 'absolute',
            bottom: -1,
            width: lit ? 14 : 0,
            height: 2,
            backgroundColor: ICE,
          }}
        />
      </Animated.View>
    </Pressable>
  )
}
