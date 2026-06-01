import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import { hexToRgba } from '../../../helpers'
import type { GenreTabsProps } from '../../../types'

// Cyberpunk genre tabs — sharp-cornered pills, dark idle state, neon-green
// glow + tinted background on the active pill. No skew, no wobble — pure
// hard edges + accent glow.
export function CyberpunkGenreTabs({
  list,
  counts,
  value,
  onChange,
}: GenreTabsProps) {
  const { tokens } = useTheme()
  if (list.length <= 1) return null

  const tint = (opacity: number): string =>
    hexToRgba(tokens.accentA, opacity) ?? `rgba(255,255,255,${opacity})`

  const activeBorder = tokens.accentA
  const idleBorder = tokens.dimBorder
  const activeBg = tint(0.18)
  const activeText = tokens.accentA
  const counterActiveBg = tint(0.25)
  const counterIdleBg = tint(0.1)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14, gap: 10 }}
    >
      {list.map((g) => {
        const active = g === value
        return (
          <Pressable
            key={g}
            onPress={() => onChange(g)}
            hitSlop={6}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 18,
              paddingVertical: 10,
              minHeight: 44,
              borderRadius: 0,
              borderWidth: 1,
              borderColor: active ? activeBorder : idleBorder,
              backgroundColor: active ? activeBg : 'transparent',
              ...(active
                ? {
                    shadowColor: tokens.accentGlowColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                  }
                : {}),
            }}
          >
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '800',
                fontSize: 17,
                lineHeight: 22,
                color: active ? activeText : tokens.black,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                includeFontPadding: false,
              }}
              numberOfLines={1}
            >
              {g}
            </Text>
            <View
              style={{
                marginLeft: 10,
                paddingHorizontal: 9,
                paddingVertical: 2,
                borderRadius: 0,
                backgroundColor: active ? counterActiveBg : counterIdleBg,
                minWidth: 28,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  // Genre count is numeric — SD Glitch display has no digit
                  // glyphs, so use the full-coverage Glitch body face.
                  fontFamily: tokens.fontBody,
                  fontWeight: '800',
                  fontSize: 13,
                  lineHeight: 18,
                  color: active ? activeText : tokens.muted,
                  includeFontPadding: false,
                }}
                numberOfLines={1}
              >
                {counts[g] ?? 0}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
