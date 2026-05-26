import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { StageTabIconProps } from '../../../types'

// Sketch keeps the same Ionicons mic/happy-face the canonical TAB_ICONS map
// uses for other themes — the custom hand-drawn sketch icons live on the
// surrounding TabBar atom (TabBar.tsx) which renders its own SKETCH_ICONS
// dictionary for non-Stage tabs.
export function StageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  return <Ionicons name={isUp ? 'mic' : 'happy-outline'} size={size} color={color} />
}
