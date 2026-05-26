import React from 'react'
import Svg, { Path, Polygon } from 'react-native-svg'
import type { StageTabIconProps } from '../../../types'

// Urban Stage tab icon — sharp graffiti-stencil silhouettes. When the guest is
// on stage (`isUp` true) the icon is a square-stroke microphone; otherwise
// it's an angular lightning bolt (the "REACT" affordance). Both stay on the
// 24×24 viewBox so the tab bar's `size` prop scales them uniformly.
export function UrbanStageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  if (isUp) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="square"
      >
        {/* Microphone for Stage */}
        <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <Path d="M12 19v4" />
        <Path d="M8 23h8" />
      </Svg>
    )
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="square"
    >
      {/* Lightning bolt / React for Stage */}
      <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  )
}
