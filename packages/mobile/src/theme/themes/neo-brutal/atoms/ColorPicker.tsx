import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { NEO_BRUTAL_MOBILE } from '../../../tokens'
import type { ColorPickerProps } from '../../../types'

// Neo-brutal color picker. Reads the universal singer palette from shared
// rather than per-theme tokens — singer color is an identity choice, not a
// visual one, so it must stay stable across theme switches.
//
// Swatch styling: fully rounded circles, hard 2/4px black borders. No glow.
const t = NEO_BRUTAL_MOBILE

export function ColorPicker({ value, onChange, label = 'Your Color' }: ColorPickerProps) {
  return (
    <View>
      <Text
        style={{
          fontFamily: t.fontDisplay,
          fontWeight: '800',
          fontSize: 11,
          letterSpacing: 2,
          color: t.muted,
          textTransform: 'uppercase',
          marginBottom: 10,
          paddingHorizontal: 24,
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => {
          const selected = i === value
          return (
            <Pressable
              key={c.color}
              onPress={() => onChange(i)}
              hitSlop={6}
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                backgroundColor: c.color,
                borderWidth: selected ? 4 : 2,
                borderColor: selected ? t.black : t.dimBorder,
              }}
            />
          )
        })}
      </ScrollView>
    </View>
  )
}
