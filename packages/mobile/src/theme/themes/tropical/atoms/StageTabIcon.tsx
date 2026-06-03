import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { StageTabIconProps } from '../../../types'

// Tropical Stage/React tab icon — Ionicons mic when the user is up on the
// current track, smiley otherwise (per project rule: nav icons always use the
// shared Ionicons set, never custom SVG). The tab bar feeds in the right color.
export function StageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  return <Ionicons name={isUp ? 'mic' : 'happy-outline'} size={size} color={color} />
}
