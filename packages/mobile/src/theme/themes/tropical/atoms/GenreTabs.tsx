import React from 'react'
import { Text, Pressable, ScrollView, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { TROPICAL_MOBILE } from '../../../tokens'
import type { GenreTabsProps } from '../../../types'
import { INK, PALM_DK, PANEL, PANEL_GLASS, LAGOON, SKY, LAGOON_DK, BAMBOO_LT, softShadow, Hibiscus } from './_tropical'

// Tropical genre tabs. Inactive tabs are translucent sand pills with a soft
// bamboo keyline. The active tab rides a lagoon→sky gradient wave with a little
// hibiscus pinned to the front, lifted off the strip on a soft sun-shadow.
const t = TROPICAL_MOBILE

export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}
    >
      {list.map((g) => {
        const active = g === value
        const count = counts[g] ?? 0
        const inner = (
          <>
            {active ? <Hibiscus size={20} color={PANEL} stroke={false} /> : null}
            <Text
              style={{
                fontFamily: t.fontBody,
                fontWeight: '700',
                fontSize: 14,
                lineHeight: 20,
                color: active ? PANEL : INK,
                letterSpacing: 0.3,
                includeFontPadding: false,
              }}
              numberOfLines={1}
            >
              {g}
            </Text>
            <View
              style={{
                marginLeft: 2,
                paddingHorizontal: 8,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: active ? 'rgba(255,255,255,0.30)' : 'rgba(18,58,51,0.10)',
                minWidth: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: t.fontBody, fontWeight: '700', fontSize: 12, lineHeight: 17, color: active ? PANEL : PALM_DK, includeFontPadding: false }} numberOfLines={1}>
                {count}
              </Text>
            </View>
          </>
        )

        const row: React.ComponentProps<typeof View>['style'] = {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          paddingHorizontal: 16,
          paddingVertical: 9,
          minHeight: 44,
          borderRadius: 999,
        }

        return (
          <Pressable key={g} onPress={() => onChange(g)} hitSlop={6}>
            {active ? (
              <LinearGradient colors={[LAGOON, SKY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[row, { borderWidth: 2, borderColor: LAGOON_DK, ...softShadow(5) }]}>
                {inner}
              </LinearGradient>
            ) : (
              <View style={[row, { backgroundColor: PANEL_GLASS, borderWidth: 2, borderColor: BAMBOO_LT }]}>{inner}</View>
            )}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
