import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { TROPICAL_MOBILE } from '../../../tokens'
import type { ColorPickerProps } from '../../../types'
import { PALM_DK, PANEL, Hibiscus } from './_tropical'

// Tropical color picker. Swatches are sand-ringed dots; the selected one is
// tucked into the heart of a hibiscus bloom so it reads as the "flower you
// picked from behind your ear."
const t = TROPICAL_MOBILE

const SWATCH = 34
const BLOOM = 62

export function ColorPicker({ value, onChange, label = 'Your Color' }: ColorPickerProps) {
  return (
    <View>
      <Text
        style={{
          fontFamily: t.fontDisplay,
          fontSize: 21,
          color: PALM_DK,
          marginBottom: 10,
          paddingHorizontal: 24,
          textShadowColor: 'rgba(255,255,255,0.6)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 6,
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
              style={{ width: BLOOM, height: BLOOM, alignItems: 'center', justifyContent: 'center' }}
            >
              {selected ? (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Hibiscus size={BLOOM} color={c.color} />
                </View>
              ) : null}
              <View
                style={{
                  width: SWATCH,
                  height: SWATCH,
                  borderRadius: 999,
                  backgroundColor: c.color,
                  borderWidth: selected ? 3 : 2.5,
                  borderColor: selected ? PANEL : 'rgba(255,255,255,0.85)',
                }}
              />
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
