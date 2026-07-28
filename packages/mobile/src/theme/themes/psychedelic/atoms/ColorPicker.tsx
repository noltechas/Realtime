import React from 'react'
import { Animated, Pressable, ScrollView, Text, View } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import type { ColorPickerProps } from '../../../types'
import { HAIRLINE, ON_FOOTAGE_SHADOW, TEXT_DIM, useLift } from './_glass'

// Psychedelic colour picker.
//
// Swatches are plain discs. The singer colours are arbitrary and saturated, and
// the footage behind is too, so the only reliable way to show selection is
// STRUCTURE, not colour: the selected disc grows and gains a white ring with a gap
// around it. That reads at a glance whatever is playing underneath.
export function PsychedelicColorPicker({
  value,
  onChange,
  label = 'Your Color',
}: ColorPickerProps) {
  const { tokens } = useTheme()
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          marginBottom: 10,
          gap: 10,
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 17,
            color: tokens.black,
            ...ON_FOOTAGE_SHADOW,
          }}
        >
          {label}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: HAIRLINE }} />
        <Text style={{ fontFamily: tokens.fontBody, fontSize: 12, color: TEXT_DIM }}>
          {value + 1}/{UNIVERSAL_SINGER_COLORS.length}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 6 }}
      >
        {UNIVERSAL_SINGER_COLORS.map((entry, index) => (
          <Swatch
            key={entry.color}
            color={entry.color}
            selected={index === value}
            onPress={() => onChange(index)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function Swatch({
  color,
  selected,
  onPress,
}: {
  color: string
  selected: boolean
  onPress: () => void
}) {
  const { transform, onPressIn, onPressOut } = useLift(0.9)
  const size = selected ? 44 : 34

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={8}>
      <Animated.View
        style={[
          { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
          { transform },
        ]}
      >
        {/* The selection ring sits OUTSIDE the disc with a gap, so it stays legible
            even when the swatch colour is close to white. */}
        {selected ? (
          <View
            style={{
              position: 'absolute',
              width: 52,
              height: 52,
              borderRadius: 26,
              borderWidth: 2,
              borderColor: '#FFFFFF',
            }}
          />
        ) : null}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.28)',
          }}
        />
      </Animated.View>
    </Pressable>
  )
}
