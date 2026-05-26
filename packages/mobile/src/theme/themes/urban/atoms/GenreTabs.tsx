import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import { hexToRgba } from '../../../helpers'
import type { GenreTabsProps } from '../../../types'

// Urban genre tabs — parallelogram pills. The container is skewed (skewX
// -10deg) and the inner text/counter is counter-skewed (skewX +10deg) so the
// glyphs stay upright inside the warped shell. Active pill picks up a hard
// toxic-green punch shadow; idle pills are bare dim outlines.
export function UrbanGenreTabs({
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
              borderRadius: 0,
              borderWidth: 1,
              borderColor: active ? activeBorder : idleBorder,
              backgroundColor: active ? activeBg : 'transparent',
              transform: [{ skewX: '-10deg' }],
              ...(active
                ? {
                    shadowColor: tokens.accentGlowColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 12,
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
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                includeFontPadding: false,
                transform: [{ skewX: '10deg' }],
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
                transform: [{ skewX: '10deg' }],
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
