import React from 'react'
import { Text, View } from 'react-native'
import type { ToggleBoxProps } from '../../../types'
import { BLUE, GRAPHITE, GRAPHITE_SOFT, IMG, INK, Mark, PencilBox, Press, SHEET, letter, note } from './_pencil'

// Sketch toggle: a box on the form, ticked in pencil when it's on, left
// empty when it's off. The tick is drawn, never a glyph.
export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  return (
    <Press onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} outerStyle={{ flex: 1 }} style={{ flex: 1 }}>
      <PencilBox border={14} fill={SHEET} style={{ flex: 1 }} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2, paddingHorizontal: 4 }}>
        <View style={{ width: 34, height: 34 }}>
          <PencilBox border={10} color={GRAPHITE} contentStyle={{ width: 20, height: 20 }} />
          {on ? <Mark src={IMG.check} color={INK} width={36} height={36} style={{ position: 'absolute', left: 4, top: -8 }} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={letter(16.5, INK, { lineHeight: 21 })}>
            {label}
          </Text>
          <Text style={note(18, on ? BLUE : GRAPHITE_SOFT)}>{on ? 'on' : 'off'}</Text>
        </View>
      </PencilBox>
    </Press>
  )
}
