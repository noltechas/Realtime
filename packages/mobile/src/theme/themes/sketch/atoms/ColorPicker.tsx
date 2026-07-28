import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { blobCornerRadii, sketchAngle } from '../../../helpers'
import type { ColorPickerProps } from '../../../types'

// Sketch color picker — universal palette, blob-shaped swatches with a slight
// per-color rotation so the chips read as paint chips taped to a page rather
// than a uniform row of circles.
//
// A wrapping grid rather than a horizontal scroller — a scroller cut the last
// chips off at the screen edge. 40 + 10 fits seven per row, so 13 lands as a
// clean 7 + 6, which suits the taped-to-a-page look better than a strip anyway.
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
      <View
        style={{
          paddingHorizontal: 24,
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 10,
          rowGap: 12,
        }}
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
      </View>
    </View>
  )
}
