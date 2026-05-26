import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { StageTabIconProps } from '../../../types'

// Cyberpunk Stage-tab icon — uses Ionicons mic/happy-outline at the standard
// 22px. Same default behavior as neo-brutal; the cyberpunk tab bar renders
// it in neon-green on void-black so the canonical glyph reads cleanly.
export function CyberpunkStageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  return (
    <Ionicons
      name={isUp ? 'mic' : 'happy-outline'}
      size={size}
      color={color}
    />
  )
}
