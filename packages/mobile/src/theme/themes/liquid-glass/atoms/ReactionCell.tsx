import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ReactionCellProps } from '../../../types'
import { Glass, Press, SOFT, sf } from './_glass'

// Liquid Glass reaction tile: a rounded square of interactive glass, the
// reaction inside it, its name beneath.
export function ReactionCell({ label, icon, onPress, onEditPress, disabled }: ReactionCellProps) {
  return (
    <View style={{ flex: 1 }}>
      <Press onPress={onPress} disabled={disabled} outerStyle={{ flex: 1 }} style={{ flex: 1, opacity: disabled ? 0.45 : 1 }}>
        <Glass radius={28} interactive style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>{icon}</View>
          {label ? <Text numberOfLines={1} style={sf(14, '600', SOFT)}>{label}</Text> : null}
        </Glass>
      </Press>
      {onEditPress ? (
        <Pressable onPress={onEditPress} hitSlop={10} style={{ position: 'absolute', top: 12, right: 14 }} accessibilityLabel="Edit">
          <Ionicons name="ellipsis-horizontal-circle" size={18} color={SOFT} />
        </Pressable>
      ) : null}
    </View>
  )
}
