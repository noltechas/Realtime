import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { StageTabIconProps } from '../../../types'

// Neo-brutal Stage/React tab icon. Lifted from the default (non-deep-sea,
// non-urban) branch of StageScreen's StageTabIcon — Ionicons mic when the
// user is up on the current track, smiley otherwise. Theme tokens don't
// affect glyph choice; the tab bar already feeds in the right color.
export function StageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  return (
    <Ionicons
      name={isUp ? 'mic' : 'happy-outline'}
      size={size}
      color={color}
    />
  )
}
