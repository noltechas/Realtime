import React from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { StageTabIconProps } from '../../../types'

// Psychedelic Stage tab glyph — Ionicons, matching every other glyph in the bar.
//
// It swaps to mark state: a mic when it's your turn, a face when you're in the
// audience — the same flip the tab's label makes between "Stage" and "React".
// The white pill behind the active tab carries the emphasis.
export function PsychedelicStageTabIcon({ color, size = 19, isUp }: StageTabIconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={isUp ? 'mic' : 'happy-outline'} size={size} color={color} />
    </View>
  )
}
