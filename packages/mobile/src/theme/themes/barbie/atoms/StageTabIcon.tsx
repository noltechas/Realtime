import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { StageTabIconProps } from '../../../types'

// Barbie Stage/React tab icon: the shared Ionicons set (never hand-drawn nav
// glyphs): a mic when you're up on the current song, a smiley otherwise.
export function StageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  return <Ionicons name={isUp ? 'mic' : 'happy-outline'} size={size} color={color} />
}
