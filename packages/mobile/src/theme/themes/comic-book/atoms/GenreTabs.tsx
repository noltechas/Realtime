import React from 'react'
import { Text, Pressable, ScrollView, View } from 'react-native'
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import type { GenreTabsProps } from '../../../types'
import { INK, PANEL, YELLOW, inkShadow, BurstBadge } from './_comic'

// Comic-Book genre tabs. Inactive tabs are flat white ink-outlined tags. The
// active tab pops off the strip: pop-yellow fill, hard ink offset shadow, a
// jaunty tilt, and a little star burst stuck on the front like a sticker.
const t = COMIC_BOOK_MOBILE

export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}
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
              gap: 7,
              paddingHorizontal: 16,
              paddingVertical: 9,
              minHeight: 44,
              borderRadius: 999,
              borderWidth: 2.5,
              borderColor: INK,
              backgroundColor: active ? YELLOW : PANEL,
              ...(active ? { ...inkShadow(3), transform: [{ rotate: '-2deg' }] } : null),
            }}
          >
            {active ? (
              <BurstBadge size={20} fill={t.hotRed} kind="star" />
            ) : null}
            <Text
              style={{
                fontFamily: t.fontDisplay,
                fontSize: 15,
                lineHeight: 22,
                color: INK,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                includeFontPadding: false,
              }}
              numberOfLines={1}
            >
              {g}
            </Text>
            <View
              style={{
                marginLeft: 4,
                paddingHorizontal: 8,
                paddingVertical: 1,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: INK,
                backgroundColor: active ? PANEL : 'transparent',
                minWidth: 26,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: t.fontDisplay,
                  fontSize: 12,
                  lineHeight: 17,
                  color: INK,
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
