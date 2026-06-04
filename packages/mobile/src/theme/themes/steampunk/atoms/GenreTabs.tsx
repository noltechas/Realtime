import React from 'react'
import { View, Text, Pressable, ScrollView, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import { Gear, Rivet } from '../Gear'
import type { GenreTabsProps } from '../../../types'

// Steampunk GenreTabs — each pill is a small brass-riveted plaque with a
// little rotating gear icon at the leading edge. Inactive pills sit dark
// mahogany with brass rim; the active pill flips to a polished-brass plate
// with deep walnut label and an amber gas-lamp glow underneath.
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

  const gearSpin = useLinearLoop(5200 + (seedHash % 11) * 220)
  const gearRot = gearSpin.interpolate({
    inputRange: [0, 1],
    outputRange: [active ? '0deg' : '0deg', active ? '360deg' : '360deg'],
  })

  // Active filament breath
  const lamp = useOscillator(2400 + (seedHash % 7) * 200)
  const lampOpacity = lamp.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] })

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 32,
          paddingRight: 14,
          paddingVertical: 8,
          minHeight: 40,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: active ? '#E8A93B' : '#7A4D1A',
          backgroundColor: active ? 'transparent' : '#2A1A0E',
          overflow: 'hidden',
          ...(active
            ? {
                shadowColor: '#E8A93B',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 8,
              }
            : {}),
        }}
      >
        {/* Active brass-plate fill */}
        {active ? (
          <LinearGradient
            colors={['#E8C078', '#B8762D', '#7A4D1A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            locations={[0, 0.5, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 2 }}
          />
        ) : null}

        {/* Active brushed sheen */}
        {active ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: '40%',
              left: 0,
              right: 0,
              height: 1.5,
              opacity: 0.55,
            }}
          >
            <LinearGradient
              colors={['rgba(255,235,180,0)', 'rgba(255,235,180,0.85)', 'rgba(255,235,180,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        ) : null}

        {/* Rotating gear marker — sits on the left edge */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 7,
            top: 0,
            bottom: 0,
            width: 22,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: gearRot }],
          }}
        >
          <Gear
            size={20}
            teeth={10}
            bodyColor={active ? '#1F1108' : '#C97D3E'}
            edgeColor={active ? '#0A0502' : '#6E3A14'}
            hubColor={active ? '#2A1A0E' : '#3A1E0A'}
            highlightColor={active ? '#5C3A12' : '#F0A058'}
          />
        </Animated.View>

        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 12,
            lineHeight: 18,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: active ? '#1F1108' : '#E8C9A0',
            opacity: active ? 1 : 0.92,
            includeFontPadding: false,
            textShadowColor: active ? 'rgba(255,235,180,0.55)' : 'transparent',
            textShadowRadius: active ? 4 : 0,
            textShadowOffset: { width: 0, height: 1 },
          }}
          numberOfLines={1}
        >
          {label}
        </Text>

        {/* Count plaque */}
        <Animated.View
          style={{
            marginLeft: 8,
            paddingHorizontal: 7,
            paddingVertical: 1,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: active ? 'rgba(31,17,8,0.55)' : '#5C8A7A',
            backgroundColor: active ? 'rgba(31,17,8,0.35)' : 'rgba(92,138,122,0.15)',
            minWidth: 22,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: active ? 1 : lampOpacity,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: 10,
              lineHeight: 14,
              letterSpacing: 0.5,
              color: active ? '#1F1108' : '#8AB5A0',
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
