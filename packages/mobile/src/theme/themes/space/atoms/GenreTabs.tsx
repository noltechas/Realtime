import React from 'react'
import { Pressable, ScrollView, Text } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { GenreTabsProps } from '../../../types'
import {
  CUT_TIGHT,
  ICE,
  MONO,
  MachinedPanel,
  TEXT,
  TEXT_FAINT,
  usePressTravel,
} from './_ship'

// Space genre selector — a bank of labelled selector keys.
//
// The count is set in the telemetry face inside square brackets rather than in
// a rounded badge: on a machined panel a number is an engraved readout, not a
// pill. Selection is carried by the key's face going ice-lit and its system bar
// coming up, which is the same grammar every other control in the theme uses —
// no per-chip planet glyph, no orbiting dot.
export function SpaceGenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
        alignItems: 'center',
      }}
    >
      {list.map((genre) => (
        <SelectorKey
          key={genre}
          label={genre}
          count={counts[genre] ?? 0}
          active={genre === value}
          onPress={() => onChange(genre)}
        />
      ))}
    </ScrollView>
  )
}

function SelectorKey({
  label,
  count,
  active,
  onPress,
}: {
  label: string
  count: number
  active: boolean
  onPress: () => void
}) {
  const { tokens } = useTheme()
  const { transform, onPressIn, onPressOut } = usePressTravel(0.7)

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={6}
    >
      <MachinedPanel
        cuts={CUT_TIGHT}
        tone={active ? 'ice' : 'steel'}
        fill={active ? 'raised' : 'glass'}
        edgeStrength={active ? 1.4 : 0.6}
        systemBar={active}
        style={{ transform }}
        contentStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: active ? 12 : 10,
          paddingRight: 10,
          paddingVertical: 7,
          minHeight: 34,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 11,
            letterSpacing: 1.7,
            textTransform: 'uppercase',
            color: active ? ICE : TEXT,
            opacity: active ? 1 : 0.7,
            includeFontPadding: false,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            marginLeft: 7,
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: 0.6,
            color: active ? ICE : TEXT_FAINT,
            includeFontPadding: false,
          }}
        >
          [{count}]
        </Text>
      </MachinedPanel>
    </Pressable>
  )
}
