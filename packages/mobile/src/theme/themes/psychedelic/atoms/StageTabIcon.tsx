import React from 'react'
import Svg, { Defs, RadialGradient, Stop, Path, Circle } from 'react-native-svg'
import { Animated } from 'react-native'
import { useLinearLoop } from '../_shared'
import type { StageTabIconProps } from '../../../types'

// Psychedelic Stage tab icon — a swirling spiral that rotates continuously.
// On `isUp` (singer is on stage) the spiral is filled with a lava-orb radial
// gradient; otherwise it's drawn with a 2px stroke in the inactive color.
export function PsychedelicStageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  const spin = useLinearLoop(14000)
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Approximate archimedean spiral, 3 turns.
  const spiralPath =
    'M12 12 Q12.8 11.2 13.6 12 Q13.6 13.6 12 13.6 Q9.4 13.6 9.4 11.2 Q9.4 7.4 13.4 7.4 Q18 7.4 18 11.6 Q18 17 12.6 17 Q6 17 6 10.8 Q6 4 12.8 4 Q21 4 21 11.2'

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {isUp ? (
          <>
            <Defs>
              <RadialGradient id="psyStageIcon" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor="#ffe98a" stopOpacity={1} />
                <Stop offset="60%" stopColor="#ff8c2d" stopOpacity={1} />
                <Stop offset="100%" stopColor="#ff2d95" stopOpacity={0.8} />
              </RadialGradient>
            </Defs>
            <Circle cx={12} cy={12} r={10} fill="url(#psyStageIcon)" />
            <Path d={spiralPath} stroke="#1a0a2e" strokeWidth={1.6} strokeLinecap="round" fill="none" />
          </>
        ) : (
          <Path d={spiralPath} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
        )}
      </Svg>
    </Animated.View>
  )
}
