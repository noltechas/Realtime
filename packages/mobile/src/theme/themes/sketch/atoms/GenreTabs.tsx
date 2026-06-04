import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import { sketchAngle } from '../../../helpers'
import type { GenreTabsProps } from '../../../types'

// Sketch genre pills — paper rectangles with mostly-square but slightly
// asymmetric corners (it's the corner-shape jitter that sells the hand-drawn
// look without warping the readability of the pill itself). Active pill
// drops the fill in favor of a darker outline, the way someone might re-trace
// a word to mark it. Idle pills get a faint paper-yellow tint and a soft drop.
export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  const { tokens } = useTheme()
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14, gap: 10 }}
    >
      {list.map((g) => {
        const active = g === value
        const angle = sketchAngle(g)

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
              // Each corner gets a different tiny radius — reads as a
              // hand-drawn rectangle rather than a perfect pill.
              borderTopLeftRadius: 1,
              borderTopRightRadius: 4,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 2,
              borderWidth: active ? 2 : 1,
              borderColor: active ? tokens.black : 'rgba(0,0,0,0.1)',
              backgroundColor: active ? 'transparent' : '#F7F4EC',
              transform: [{ rotate: `${angle}deg` }] as any,
              ...(active
                ? null
                : {
                    shadowColor: '#000',
                    shadowOffset: { width: 1, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 2,
                  }),
            }}
          >
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '800',
                fontSize: 15,
                lineHeight: 22,
                color: tokens.black,
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
                borderRadius: 2,
                backgroundColor: active ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)',
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
                  color: active ? tokens.black : tokens.muted,
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
