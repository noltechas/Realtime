import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { GenreTabsProps } from '../../../types'
import { ItemFloater } from './ItemFloater'

// Deep-sea genre tabs — rounded pills with a faint cyan border at rest and
// a vivid bioluminescent glow + tinted background on the active pill.
// Each pill is wrapped in the deep-sea bubble float so the row reads as
// drifting kelp tags caught in a current.
export function GenreTabs({
  list,
  counts,
  value,
  onChange,
}: GenreTabsProps) {
  const { tokens } = useTheme()
  if (list.length <= 1) return null

  const pillRadius = tokens.radius
  const idleBorder = 'rgba(0,255,200,0.2)'
  const activeBorder = 'rgba(0,255,200,0.55)'
  const activeBg = tokens.vividYellow // light cyan background tint
  const activeText = tokens.accentA
  const counterActiveBg = 'rgba(0,255,200,0.15)'
  const counterIdleBg = 'rgba(0,255,200,0.05)'

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8, gap: 10 }}
    >
      {list.map((g) => {
        const active = g === value
        return (
          <ItemFloater key={g} delay={((g.length + g.charCodeAt(0)) % 10) * 100}>
            <Pressable
              onPress={() => onChange(g)}
              hitSlop={6}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 18,
                paddingVertical: 10,
                minHeight: 44,
                borderRadius: pillRadius,
                borderWidth: 1,
                borderColor: active ? activeBorder : idleBorder,
                backgroundColor: active ? activeBg : 'transparent',
                ...(active
                  ? {
                      // Bioluminescent glow on the active pill.
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
                  letterSpacing: 0.2,
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
                  borderRadius: 999,
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
          </ItemFloater>
        )
      })}
    </ScrollView>
  )
}
