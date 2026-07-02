import React from 'react'
import { Animated } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'
import { Gear, useLinearLoop } from './_steam'
import type { StageTabIconProps } from '../../../types'

// Steampunk Stage tab icon — the one gear allowed in the chrome. When the
// singer is up it turns as polished brass; otherwise it idles as a thin
// engraved outline in the inactive foreground color.
export function SteampunkStageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  const spin = useLinearLoop(9000)
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  if (isUp) {
    return (
      <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
        <Gear size={size} teeth={10} tone="brass" />
      </Animated.View>
    )
  }

  // Outline gear: ring + hub + tooth nubs, stroked in the inactive color.
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={8.4} fill="none" stroke={color} strokeWidth={1.5} />
        <Circle cx={12} cy={12} r={3} fill="none" stroke={color} strokeWidth={1.3} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <Line
              key={i}
              x1={12 + Math.cos(a) * 8.4}
              y1={12 + Math.sin(a) * 8.4}
              x2={12 + Math.cos(a) * 11}
              y2={12 + Math.sin(a) * 11}
              stroke={color}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          )
        })}
      </Svg>
    </Animated.View>
  )
}
