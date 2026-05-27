import React from 'react'
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle,
  Ellipse,
  G,
} from 'react-native-svg'
import { Animated } from 'react-native'
import { useLinearLoop } from '../_shared'
import type { StageTabIconProps } from '../../../types'

// Space Stage tab icon — a tiny Saturn-like planet with a tilted ring that
// rotates continuously. When `isUp` (singer is on stage), the planet is
// filled with a magenta radial gradient; otherwise it renders as a hollow
// stroked outline in the inactive color.
export function SpaceStageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  const spin = useLinearLoop(12000)
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {isUp ? (
          <Defs>
            <RadialGradient id="spaceTab" cx="38%" cy="32%" rx="60%" ry="60%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="55%" stopColor="#E040FB" stopOpacity={1} />
              <Stop offset="100%" stopColor="#5A1480" stopOpacity={0.95} />
            </RadialGradient>
          </Defs>
        ) : null}
        {/* Tilted ring — drawn first so the planet body occludes its midline */}
        <G transform="rotate(-22 12 12)">
          <Ellipse
            cx={12}
            cy={12}
            rx={11}
            ry={3.5}
            fill="none"
            stroke={isUp ? '#40E0D0' : color}
            strokeWidth={1.6}
            opacity={isUp ? 0.95 : 0.65}
          />
        </G>
        {/* Planet body */}
        <Circle
          cx={12}
          cy={12}
          r={6.5}
          fill={isUp ? 'url(#spaceTab)' : 'none'}
          stroke={isUp ? '#FFFFFF' : color}
          strokeWidth={isUp ? 0 : 2}
        />
      </Svg>
    </Animated.View>
  )
}
