import React from 'react'
import { View, Text, Pressable, ScrollView, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useOscillator } from '../_shared'
import { ChromeBevel } from '../primitives'
import type { GenreTabsProps } from '../../../types'

// Retrowave GenreTabs — sharp-rectangle pills. Inactive pills sit dark
// indigo with a thin pink rim and chromatic-aberration label. Active pill
// gets a chrome-pink bevel fill (a polished metal gradient) with deep
// indigo dark italic text, plus a hot-pink halo and a small cyan triangle
// arrow on the leading edge — like the "PLAY" button on an arcade cab.
export function RetrowaveGenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14, gap: 10 }}
    >
      {list.map((g) => (
        <GenrePill
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

const GenrePill = React.memo(GenrePillImpl)

function GenrePillImpl({
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
  const seedHash = hashKey(label)

  // Active pill: subtle filament breath
  const breath = useOscillator(2200 + (seedHash % 9) * 200)
  const breathOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  })

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 22,
          paddingRight: 12,
          paddingVertical: 8,
          minHeight: 40,
          borderRadius: 0,
          borderWidth: 1,
          borderColor: active ? '#FF2D95' : 'rgba(255,45,149,0.45)',
          backgroundColor: active ? 'transparent' : '#1A0A3A',
          overflow: 'hidden',
          ...(active
            ? {
                shadowColor: '#FF2D95',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 10,
              }
            : {}),
        }}
      >
        {/* Active chrome bevel fill */}
        {active ? <ChromeBevel variant="pink" /> : null}

        {/* Leading arrow — a small cyan triangle pointing right; on active pills
            it flips to deep indigo so it reads on the bright bevel */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 8,
            top: 0,
            bottom: 0,
            width: 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: 5,
              borderBottomWidth: 5,
              borderLeftWidth: 8,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: active ? '#0A0420' : '#00F0FF',
            }}
          />
        </View>

        <Text
          style={{
            fontFamily: tokens.fontBody,
            fontSize: 12,
            lineHeight: 18,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: active ? '#0A0420' : '#F4E8FF',
            opacity: active ? 1 : 0.95,
            includeFontPadding: false,
            textShadowColor: active ? 'rgba(255,255,255,0.7)' : 'transparent',
            textShadowRadius: active ? 3 : 0,
            textShadowOffset: { width: 0, height: 1 },
            fontStyle: 'italic',
          }}
          numberOfLines={1}
        >
          {label}
        </Text>

        {/* Count chip — cyan badge */}
        <Animated.View
          style={{
            marginLeft: 8,
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 0,
            borderWidth: 1,
            borderColor: active ? '#0A0420' : '#00F0FF',
            backgroundColor: active ? 'rgba(10,4,32,0.4)' : 'rgba(0,240,255,0.1)',
            minWidth: 22,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: active ? 1 : breathOpacity,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontBody,
              fontSize: 10,
              lineHeight: 14,
              letterSpacing: 0.5,
              color: active ? '#0A0420' : '#00F0FF',
              includeFontPadding: false,
            }}
            numberOfLines={1}
          >
            {count}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  )
}
