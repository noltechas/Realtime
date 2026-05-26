import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path } from 'react-native-svg'
import type { StageTabIconProps } from '../../../types'

// Deep-sea stage tab icon. When the local guest is on stage, draws a
// rounded fluid microphone SVG so it harmonizes with the theme's bubbly
// nav icons. When not on stage, falls back to a `happy-outline` Ionicon
// for the reaction screen.
export function StageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  if (isUp) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M12 2C9.24 2 7 4.24 7 7V11C7 13.76 9.24 16 12 16C14.76 16 17 13.76 17 11V7C17 4.24 14.76 2 12 2Z" />
        <Path d="M19 10V11C19 14.87 15.87 18 12 18C8.13 18 5 14.87 5 11V10" />
        <Path d="M12 18V22M8 22H16" />
      </Svg>
    )
  }
  return <Ionicons name="happy-outline" size={size} color={color} />
}
