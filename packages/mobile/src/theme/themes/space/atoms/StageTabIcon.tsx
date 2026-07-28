import React from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { StageTabIconProps } from '../../../types'

// Space Stage tab glyph.
//
// Ionicons, not hand-drawn geometry. The previous version drew a spinning
// Saturn here, which broke two rules at once: nav glyphs come from the shared
// Ionicons set so every icon in the bar sits on one optical grid, and a
// permanently-rotating icon in navigation chrome is noise. The glyph swaps to
// mark state instead — a mic when it's your turn, a face when you're in the
// audience reacting — which matches the tab's own label flipping between
// "Stage" and "React".
//
// Sizing tracks the other bar icons exactly; the active tab's lit pod behind it
// (see TabBar.tsx) is what carries the emphasis.
export function SpaceStageTabIcon({ color, size = 18, isUp }: StageTabIconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={isUp ? 'mic' : 'happy-outline'} size={size} color={color} />
    </View>
  )
}
