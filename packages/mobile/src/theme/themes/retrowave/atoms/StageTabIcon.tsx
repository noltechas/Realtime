import React from 'react'
import { View } from 'react-native'
import { SlattedSun } from '../primitives'
import Svg, { Circle, Line } from 'react-native-svg'
import type { StageTabIconProps } from '../../../types'

// Retrowave Stage tab icon — when on stage (isUp), shows the canonical
// slatted sun glyph. When not, shows a hollow sun ring with the slat-cuts
// drawn as horizontal hairlines in the inactive color.
export function RetrowaveStageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  if (isUp) {
    return (
      <View style={{ width: size, height: size }}>
        <SlattedSun size={size} haloOpacity={0.6} />
      </View>
    )
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.6} />
      {/* Slat hairlines bisecting the ring */}
      <Line x1={4} y1={14} x2={20} y2={14} stroke={color} strokeWidth={1} />
      <Line x1={5} y1={16.5} x2={19} y2={16.5} stroke={color} strokeWidth={1} />
      <Line x1={6.5} y1={18.5} x2={17.5} y2={18.5} stroke={color} strokeWidth={1} />
    </Svg>
  )
}
