import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import type { ColorPickerProps } from '../../../types'
import { INK, YELLOW, Burst } from './_comic'

// Comic-Book color picker. Swatches are inked dots; the selected one is punched
// onto a yellow STARBURST so it reads as the "chosen" pop-art spot color.
const t = COMIC_BOOK_MOBILE

const SWATCH = 38
const BURST = 60

export function ColorPicker({ value, onChange, label = 'Your Color' }: ColorPickerProps) {
  return (
    <View>
      <Text
        style={{
          fontFamily: t.fontDisplay,
          fontSize: 12,
          letterSpacing: 2,
          color: INK,
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
        contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingVertical: 10, alignItems: 'center' }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => {
          const selected = i === value
          return (
            <Pressable
              key={c.color}
              onPress={() => onChange(i)}
              hitSlop={6}
              style={{ width: BURST, height: BURST, alignItems: 'center', justifyContent: 'center' }}
            >
              {selected ? (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  <Burst width={BURST} height={BURST} fill={YELLOW} kind="burst" strokeWidth={3} />
                </View>
              ) : null}
              <View
                style={{
                  width: SWATCH,
                  height: SWATCH,
                  borderRadius: 999,
                  backgroundColor: c.color,
                  borderWidth: selected ? 3 : 2.5,
                  borderColor: INK,
                }}
              />
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
