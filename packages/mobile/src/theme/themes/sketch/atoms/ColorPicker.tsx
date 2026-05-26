import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { blobCornerRadii, sketchAngle } from '../../../helpers'
import type { ColorPickerProps } from '../../../types'

// Sketch color picker — universal palette, blob-shaped swatches with a slight
// per-color rotation so the strip reads as paint chips taped to a page rather
// than a uniform row of circles.
export function ColorPicker({ value, onChange, label = 'Your Color' }: ColorPickerProps) {
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => {
          const selected = i === value
          const angle = sketchAngle(c.color)
          return (
            <Pressable
              key={c.color}
              onPress={() => onChange(i)}
              hitSlop={6}
              style={{
                width: 40,
                height: 40,
                ...blobCornerRadii(c.color),
                backgroundColor: c.color,
                borderWidth: selected ? 3 : 2,
                borderColor: selected ? tokens.black : tokens.dimBorder,
                transform: [{ rotate: `${angle}deg` }] as any,
                shadowColor: '#000',
                shadowOffset: { width: 1, height: 2 },
                shadowOpacity: selected ? 0.18 : 0.1,
                shadowRadius: selected ? 4 : 2,
                elevation: selected ? 3 : 1,
              }}
            />
          )
        })}
      </ScrollView>
    </View>
  )
}
