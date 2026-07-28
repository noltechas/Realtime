import React from 'react'
import { Animated, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import {
  AMBER,
  CUT_PLATE,
  ICE,
  Lamp,
  MONO,
  MachinedPanel,
  STEEL_HI,
  TickLadder,
  useMeasuredSize,
  useOscillator,
} from './_ship'

// "You're up" — the master caution annunciator.
//
// Real flight decks announce the thing that needs you right now with a caption
// panel and a pair of lamps, so that is what this is: an amber-toned plate,
// `CREW CALL` in the telemetry face, the call itself in wide display caps, and
// two lamps that breathe in ANTIPHASE either side of it. Alternating rather than
// synchronised is the whole trick — synchronised lamps read as decoration,
// alternating lamps read as an alarm.
export function SpaceYoureUpHero() {
  const { tokens } = useTheme()
  const { size, onLayout } = useMeasuredSize()

  const pulse = useOscillator(1500)
  const leftOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.28] })
  const rightOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1] })

  return (
    <MachinedPanel
      cuts={CUT_PLATE}
      tone="amber"
      fill="raised"
      systemBar
      bolts
      contentStyle={{ paddingVertical: 16, paddingHorizontal: 18, paddingLeft: 20 }}
    >
      <Text
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: 3,
          color: AMBER,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        CREW CALL
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <Animated.View style={{ opacity: leftOpacity }}>
          <Lamp size={22} color={AMBER} lit glow={1.2} />
        </Animated.View>

        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 30,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: tokens.black,
            textShadowColor: 'rgba(255,180,61,0.45)',
            textShadowRadius: 12,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          You're Up
        </Text>

        <Animated.View style={{ opacity: rightOpacity }}>
          <Lamp size={22} color={AMBER} lit glow={1.2} />
        </Animated.View>
      </View>

      {/* Machined rule under the call, with an engraved ladder to its right. */}
      <View style={{ height: 8, marginTop: 12 }} onLayout={onLayout}>
        {size && size.width > 1 ? (
          <Svg width={size.width} height={8}>
            <Path
              d={`M 0 1.5 L ${size.width * 0.34} 1.5`}
              stroke={AMBER}
              strokeWidth={2}
              strokeOpacity={0.85}
            />
            <Path
              d={`M ${size.width * 0.34 + 5} 1.5 L ${size.width} 1.5`}
              stroke={STEEL_HI}
              strokeWidth={1}
              strokeOpacity={0.22}
            />
            <TickLadder
              x={size.width * 0.34 + 11}
              y={2}
              length={Math.max(20, size.width * 0.6)}
              count={Math.max(6, Math.round((size.width * 0.6) / 13))}
              color={ICE}
              opacity={0.28}
            />
          </Svg>
        ) : null}
      </View>
    </MachinedPanel>
  )
}
