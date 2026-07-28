import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import type { ColorPickerProps } from '../../../types'

// Cyberpunk color picker — sharp-cornered (borderRadius 0) swatches with a
// neon glow under the currently selected one. Reads from the universal
// palette (every theme shows the same 13 colors so a user's identity
// persists across theme switches).
//
// A wrapping grid rather than a horizontal scroller — a scroller cut the last
// swatches off at the screen edge. 38 + 12 fits seven per row, so 13 lands as
// a clean 7 + 6.
export function CyberpunkColorPicker({
  value,
  onChange,
  label = 'Your Color',
}: ColorPickerProps) {
  const { tokens } = useTheme()
  return (
    <View>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '800',
          fontSize: 11,
          letterSpacing: 2,
          color: tokens.muted,
          textTransform: 'uppercase',
          marginBottom: 10,
          paddingHorizontal: 24,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          paddingHorizontal: 24,
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 12,
          rowGap: 12,
        }}
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
                borderRadius: 0,
                backgroundColor: c.color,
                borderWidth: selected ? 4 : 2,
                borderColor: selected ? tokens.black : tokens.dimBorder,
                ...(selected
                  ? {
                      shadowColor: c.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 10,
                    }
                  : {}),
              }}
            />
          )
        })}
      </View>
    </View>
  )
}
