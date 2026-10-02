import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ReactionCellProps } from '../../../types'
import { Awning, Gloss, PINK, Press, STRIPES, WHITE, display, useMeasured } from './_barbie'

// Barbie reaction tile: a POOLSIDE CABANA. The grid of reactions is a row of
// cabanas along the deck, each under its own candy-striped awning (walked
// through the pastel stripes by grid position, so neighbours never match),
// with the reaction set in its glossy white doorway and its name painted
// underneath. Pressing it squishes the whole cabana.
export function ReactionCell({ label, icon, onPress, onEditPress, disabled, index = 0 }: ReactionCellProps) {
  const [size, onLayout] = useMeasured()
  const stripes = STRIPES[index % STRIPES.length]
  const AWN = 16 + 3 + 10 + 7
  return (
    <View style={{ flex: 1 }}>
      <Press onPress={onPress} disabled={disabled} outerStyle={{ flex: 1 }} style={{ flex: 1, opacity: disabled ? 0.55 : 1 }}>
        <View onLayout={onLayout} style={{ flex: 1 }}>
          <Gloss tone="white" radius={20} style={{ flex: 1, marginTop: AWN - 14 }} contentStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 18, paddingBottom: 10, paddingHorizontal: 8 }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
            <Text numberOfLines={1} style={display(15, PINK, { marginTop: 4, lineHeight: 20 })}>
              {label}
            </Text>
          </Gloss>
          {size ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: -3, top: 0 }}>
              <Awning width={size.w + 6} canopy={16} valance={10} scallop={7} stripes={stripes} stripeW={11} />
            </View>
          ) : null}
        </View>
      </Press>
      {onEditPress ? (
        <Pressable onPress={onEditPress} hitSlop={10} style={{ position: 'absolute', top: 40, right: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: PINK, borderWidth: 2, borderColor: WHITE }}>
            <Ionicons name="pencil" size={13} color={WHITE} />
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}
