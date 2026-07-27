import React, { useEffect, useRef } from 'react'
import { Animated, ScrollView, Text, View } from 'react-native'
import type { GenreTabsProps } from '../../../types'
import {
  CREAM,
  Hibiscus3D,
  LAGOON,
  PAINTED,
  Press,
  Timber,
  glow,
  lift,
  sans,
} from './_tropical'

// Tropical genre tabs — a rack of little carved trail markers. Every tag is a
// real plank (seeded grain, beveled edge); the active one is dipped in lagoon
// enamel, springs up a touch, takes a warm glow, and a hibiscus bloom pops onto
// its corner (scaling in on its own spring — flair you can only earn by being
// selected). Counts sit in a small carved notch on each tag.

function Tag({
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
  const v = useRef(new Animated.Value(active ? 1 : 0)).current

  useEffect(() => {
    const a = Animated.spring(v, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      damping: 11,
      stiffness: 200,
      mass: 0.7,
    })
    a.start()
    return () => a.stop()
  }, [active, v])

  return (
    <Press onPress={onPress} hitSlop={4} scaleTo={0.94} style={{ borderRadius: 11 }}>
      <Animated.View
        style={[
          { borderRadius: 11 },
          active ? glow('#FFB84D', 2) : lift(1),
          { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] },
        ]}
      >
        <Timber
          radius={11}
          paint={active ? LAGOON : undefined}
          seed={`genre-${label}`}
          knot={false}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            minHeight: 42,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Text style={[sans(13.5, 'bold', active ? '#FFFFFF' : CREAM), PAINTED]} numberOfLines={1}>
            {label}
          </Text>
          {/* carved count notch */}
          <View
            style={{
              minWidth: 23,
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 999,
              backgroundColor: 'rgba(28,13,2,0.34)',
              borderWidth: 1,
              borderColor: 'rgba(255,232,185,0.24)',
              alignItems: 'center',
            }}
          >
            <Text style={sans(11, 'bold', active ? '#EFFFFC' : 'rgba(255,240,214,0.9)')} numberOfLines={1}>
              {count}
            </Text>
          </View>
        </Timber>

        {/* the bloom pinned to the active tag's corner */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -9,
            left: -8,
            opacity: v,
            transform: [
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
              { rotate: '-14deg' },
            ],
          }}
        >
          <Hibiscus3D size={26} />
        </Animated.View>
      </Animated.View>
    </Press>
  )
}

export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 14, paddingTop: 16, gap: 10 }}
    >
      {list.map((g) => (
        <Tag key={g} label={g} count={counts[g] ?? 0} active={g === value} onPress={() => onChange(g)} />
      ))}
    </ScrollView>
  )
}
