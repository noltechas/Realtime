import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import type { GenreCounts } from '@karaoke/shared'
import { useTheme } from '../theme/ThemeContext'
import { themeRadius, themeAccentTint } from '../theme/styles'

interface GenreTabsProps {
  list: string[]
  counts: GenreCounts
  value: string
  onChange: (genre: string) => void
}

export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  const { tokens } = useTheme()
  const isDark = tokens.isDark
  if (list.length <= 1) return null

  // Pill shape per theme: rounded by default, sharp for cyberpunk/urban.
  const pillRadius = tokens.cornerStyle === 'sharp' ? 0 : 999
  const idleBorder = tokens.dimBorder
  const activeBorder = isDark ? tokens.accentA : tokens.black
  const activeBg = isDark ? themeAccentTint(tokens, 0.18) : tokens.black
  const activeText = isDark ? tokens.accentA : tokens.white
  const counterActiveBg = isDark ? themeAccentTint(tokens, 0.25) : 'rgba(255,255,255,0.22)'
  const counterIdleBg = isDark ? themeAccentTint(tokens, 0.1) : 'rgba(26,26,26,0.08)'

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8, gap: 10 }}
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
              borderRadius: pillRadius,
              borderWidth: isDark ? 1 : 2,
              borderColor: active ? activeBorder : idleBorder,
              backgroundColor: active ? activeBg : 'transparent',
              // Cyberpunk gets a faint glow on the active pill.
              ...(active && isDark
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
                fontSize: 15,
                lineHeight: 22,
                color: active ? activeText : tokens.black,
                letterSpacing: tokens.displayUppercase ? 1.5 : 0.2,
                textTransform: tokens.displayUppercase ? 'uppercase' : 'none',
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
                borderRadius: themeRadius(tokens, 999),
                backgroundColor: active ? counterActiveBg : counterIdleBg,
                minWidth: 28,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: tokens.fontDisplay,
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
