import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

interface ColorPickerProps {
  value: number
  onChange: (index: number) => void
  label?: string
}

// Horizontal scroll of singer-color swatches. Pure rendering — selection state
// lives with the caller so the chosen color can drive other UI (e.g. the
// AvatarPicker ring).
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
        {tokens.singerColors.map((c, i) => {
          const selected = i === value
          return (
            <Pressable
              key={c.color}
              onPress={() => onChange(i)}
              hitSlop={6}
              style={{
                width: 38,
                height: 38,
                borderRadius: tokens.cornerStyle === 'sharp' ? 0 : 999,
                backgroundColor: c.color,
                borderWidth: selected ? 4 : 2,
                borderColor: selected ? tokens.black : tokens.dimBorder,
                ...(selected && tokens.isDark
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
      </ScrollView>
    </View>
  )
}

// Helper for matching a saved hex color back to its index in the singer palette.
export function findColorIndex(tokens: { singerColors: { color: string }[] }, color: string | undefined): number {
  if (!color) return 0
  const idx = tokens.singerColors.findIndex(
    (c) => c.color.toLowerCase() === color.toLowerCase(),
  )
  return idx >= 0 ? idx : 0
}
