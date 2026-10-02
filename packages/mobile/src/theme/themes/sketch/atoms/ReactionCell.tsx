import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ReactionCellProps } from '../../../types'
import { GRAPHITE, GRAPHITE_SOFT, PencilBox, Press, SHEET, note, wobble } from './_pencil'

// Sketch reaction tile: a box pencilled on the sheet, the reaction inside it
// and its name noted underneath, each box at its own slight angle.
export function ReactionCell({ label, icon, onPress, onEditPress, disabled, index = 0 }: ReactionCellProps) {
  return (
    <View style={{ flex: 1 }}>
      <Press onPress={onPress} disabled={disabled} outerStyle={{ flex: 1 }} style={{ flex: 1, opacity: disabled ? 0.45 : 1, transform: [{ rotate: `${wobble(index, 5) * 1.2}deg` }] }}>
        <PencilBox border={14} fill={SHEET} style={{ flex: 1 }} contentStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>{icon}</View>
          {label ? <Text numberOfLines={1} style={note(20, GRAPHITE)}>{label}</Text> : null}
        </PencilBox>
      </Press>
      {onEditPress ? (
        <Pressable onPress={onEditPress} hitSlop={10} style={{ position: 'absolute', top: 12, right: 12 }} accessibilityLabel="Edit">
          <Ionicons name="create-outline" size={15} color={GRAPHITE_SOFT} />
        </Pressable>
      ) : null}
    </View>
  )
}
