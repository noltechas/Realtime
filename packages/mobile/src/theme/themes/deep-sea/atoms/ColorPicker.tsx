import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import type { ColorPickerProps } from '../../../types'

// Deep-sea color picker — rounded swatches with a strong cyan
// bioluminescent halo around the selected one. Reads from the universal
// palette so a user's identity color persists across theme switches.
//
// A wrapping grid rather than a horizontal scroller — a scroller cut the last
// swatches off at the screen edge. 38 + 12 fits seven per row, so 13 lands as
// a clean 7 + 6.
export function ColorPicker({
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
          rowGap: 14,
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
                borderRadius: 999,
                backgroundColor: c.color,
                borderWidth: selected ? 3 : 1,
                borderColor: selected ? tokens.accentA : 'rgba(0,255,200,0.25)',
                ...(selected
                  ? {
                      // Strong cyan bioluminescent halo on the active swatch.
                      shadowColor: tokens.accentGlowColor,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.9,
                      shadowRadius: 12,
                    }
                  : {
                      shadowColor: c.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                    }),
              }}
            />
          )
        })}
      </View>
    </View>
  )
}
