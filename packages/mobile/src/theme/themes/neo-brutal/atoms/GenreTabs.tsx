import React from 'react'
import { Text, Pressable, ScrollView, View } from 'react-native'
import { NEO_BRUTAL_MOBILE } from '../../../tokens'
import type { GenreTabsProps } from '../../../types'

// Neo-brutal genre pills. Lifted from the default branch of the legacy
// GenreTabs component — fully rounded pills (radius 999), hard 2px black
// borders, black-fill active state with white label. No skew, no glow.
const t = NEO_BRUTAL_MOBILE

export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  const pillRadius = 999
  const idleBorder = t.dimBorder
  const activeBorder = t.black
  const activeBg = t.black
  const activeText = t.white
  const counterActiveBg = 'rgba(255,255,255,0.22)'
  const counterIdleBg = 'rgba(26,26,26,0.08)'

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
              borderRadius: pillRadius,
              borderWidth: 2,
              borderColor: active ? activeBorder : idleBorder,
              backgroundColor: active ? activeBg : 'transparent',
            }}
          >
            <Text
              style={{
                fontFamily: t.fontDisplay,
                fontWeight: '800',
                fontSize: 15,
                lineHeight: 22,
                color: active ? activeText : t.black,
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
                  fontFamily: t.fontDisplay,
                  fontWeight: '800',
                  fontSize: 13,
                  lineHeight: 18,
                  color: active ? activeText : t.muted,
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
