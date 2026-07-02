import React from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../ThemeContext'
import {
  BRASS_FACE,
  BRASS_INK,
  PARCH_DIM,
  AMBER,
  HAIRLINE_SOFT,
  DEPTH_SHADOW,
} from './_steam'
import type { GenreTabsProps } from '../../../types'

// Steampunk GenreTabs — a rail of engraved index plates. Inactive plates are
// quiet iron with a soft hairline; the ONE active plate is polished brass
// with engraved dark lettering. No icons, no gears — the material shift IS
// the selection state.
export function SteampunkGenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14, gap: 10 }}
    >
      {list.map((g) => (
        <GenrePlate
          key={g}
          label={g}
          count={counts[g] ?? 0}
          active={g === value}
          onPress={() => onChange(g)}
        />
      ))}
    </ScrollView>
  )
}

const GenrePlate = React.memo(GenrePlateImpl)

function GenrePlateImpl({
  label,
  count,
  active,
  onPress,
}: {
  label: string
  count: number
  active: boolean
  onPress: () => void
}) {
  const { tokens } = useTheme()

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          height: 38,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: active ? 'rgba(46,30,8,0.9)' : HAIRLINE_SOFT,
          backgroundColor: active ? 'transparent' : 'rgba(34,23,17,0.85)',
          overflow: 'hidden',
          ...(active ? DEPTH_SHADOW : {}),
        }}
      >
        {active ? (
          <>
            <LinearGradient
              colors={BRASS_FACE}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: 1, left: 5, right: 5, height: 1, backgroundColor: 'rgba(255,245,220,0.5)' }}
            />
          </>
        ) : null}

        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 11,
            lineHeight: 16,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: active ? BRASS_INK : PARCH_DIM,
            includeFontPadding: false,
            textShadowColor: active ? 'rgba(255,245,220,0.35)' : 'transparent',
            textShadowRadius: 0,
            textShadowOffset: { width: 0, height: active ? 1 : 0 },
          }}
          numberOfLines={1}
        >
          {label}
        </Text>

        {/* engraved count plaque */}
        <View
          style={{
            minWidth: 22,
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: active ? 'rgba(20,12,4,0.4)' : 'rgba(200,151,62,0.10)',
            borderWidth: active ? 0 : StyleSheet.hairlineWidth,
            borderColor: HAIRLINE_SOFT,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: 10,
              lineHeight: 14,
              color: active ? '#F5E5BD' : AMBER,
              includeFontPadding: false,
            }}
            numberOfLines={1}
          >
            {count}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}
