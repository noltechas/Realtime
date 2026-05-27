import React from 'react'
import { Animated } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle, G } from 'react-native-svg'
import { useLinearLoop } from '../_shared'
import { Gear } from '../Gear'
import type { StageTabIconProps } from '../../../types'

// Steampunk Stage tab icon — a rotating brass cog. When `isUp` (singer on
// stage), the cog is polished aged brass with an amber gas-lamp glow;
// otherwise it renders as a hollow stroked outline in the inactive color.
export function SteampunkStageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  const spin = useLinearLoop(7000)
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  if (isUp) {
    return (
      <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
        <Gear
          size={size}
          teeth={10}
          bodyColor="#E8C078"
          edgeColor="#7A4D1A"
          hubColor="#3E2810"
          highlightColor="#FFF4D0"
        />
      </Animated.View>
    )
  }

  // Inactive — single ring of teeth outlines, no fill
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <RadialGradient id="stageInactive" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.0} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </RadialGradient>
        </Defs>
        <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.6} />
        <Circle cx={12} cy={12} r={3.2} fill="none" stroke={color} strokeWidth={1.4} />
        {/* Sparse outline teeth */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i / 8) * Math.PI * 2
          const x1 = 12 + Math.cos(a) * 9
          const y1 = 12 + Math.sin(a) * 9
          const x2 = 12 + Math.cos(a) * 11
          const y2 = 12 + Math.sin(a) * 11
          return (
            <G key={i}>
              <Circle cx={x2} cy={y2} r={1.5} fill="none" stroke={color} strokeWidth={1.4} />
            </G>
          )
        })}
      </Svg>
    </Animated.View>
  )
}
