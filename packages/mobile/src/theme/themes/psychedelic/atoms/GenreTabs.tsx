import React from 'react'
import { Animated, Pressable, ScrollView, Text } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { GenreTabsProps } from '../../../types'
import {
  DYES,
  GlassPanel,
  HAIRLINE_SOFT,
  INK,
  TEXT,
  TEXT_FAINT,
  phaseFor,
  useLift,
  usePulse,
} from './_glass'

// Psychedelic genre selector.
//
// The selected tab goes OPAQUE, with ink lettering on a saturated dye — the same
// inversion the song tiles use, so the filter row reads as part of the same printed
// set rather than as chrome sitting above it. Opacity is the mechanism: against
// footage that is itself saturated, a translucent "selected" chip competes and gets
// lost, while a solid plate is unmissable on any frame and carries its own contrast.
//
// It also BREATHES, gently, so the live selection is the one moving thing in the row.
export function PsychedelicGenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 9,
        alignItems: 'center',
      }}
    >
      {list.map((genre, index) => (
        <GenreTab
          key={genre}
          label={genre}
          count={counts[genre] ?? 0}
          // Colour by position, matching the song grid, so the row is a spectrum and
          // no two neighbouring chips can draw the same hue.
          dye={DYES[index % DYES.length]}
          // Distinct phase per chip, so the row can never breathe in unison.
          phase={phaseFor(index, 5100)}
          active={genre === value}
          onPress={() => onChange(genre)}
        />
      ))}
    </ScrollView>
  )
}

function GenreTab({
  label,
  count,
  dye,
  phase,
  active,
  onPress,
}: {
  label: string
  count: number
  dye: string
  phase: number
  active: boolean
  onPress: () => void
}) {
  const { tokens } = useTheme()
  // Composed from `press` rather than useLift's ready-made transform, because the
  // selected chip needs the press scale AND the breathe scale multiplied together.
  const { press, onPressIn, onPressOut } = useLift(0.7)
  const breathe = usePulse(5100, phase)
  const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] })
  const swell = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.075] })
  const scale = active ? Animated.multiply(pressScale, swell) : pressScale

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={6}>
      <GlassPanel
        radius={999}
        fill={active ? 'none' : 'glass'}
        edgeColor={active ? INK : HAIRLINE_SOFT}
        lift={active}
        style={[{ transform: [{ scale }] }, active ? { backgroundColor: dye } : null]}
        contentStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 9,
          minHeight: 40,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 16,
            color: active ? INK : TEXT,
            fontWeight: active ? '700' : 'normal',
            includeFontPadding: false,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            marginLeft: 7,
            fontFamily: tokens.fontBody,
            fontSize: 12,
            fontWeight: '700',
            color: active ? 'rgba(8,6,12,0.55)' : TEXT_FAINT,
            includeFontPadding: false,
          }}
        >
          {count}
        </Text>
      </GlassPanel>
    </Pressable>
  )
}
