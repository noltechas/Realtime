import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { GenreTabsProps } from '../../../types'
import { GRAPHITE, GRAPHITE_SOFT, INK, LETTER_B, Press, RED, RingAround, letter, note } from './_pencil'

// Sketch genre tabs: the genres written along the sheet in pencil, the
// chosen one inked and ringed fast in red. The count is a pencil note.
export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 18, paddingVertical: 10, alignItems: 'center' }}>
      {list.map((g, i) => {
        const on = g === value
        const n = counts[g] ?? 0
        return (
          <Press key={g} onPress={() => onChange(g)} accessibilityRole="button" accessibilityState={{ selected: on }} hitSlop={6}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: 4 }}>
              {on ? <RingAround color={RED} variant={i} padX={13} padY={9} /> : null}
              <Text numberOfLines={1} style={letter(16, on ? INK : GRAPHITE, undefined, on ? undefined : LETTER_B)}>
                {g}
              </Text>
              <Text style={note(17, on ? RED : GRAPHITE_SOFT)}>{n}</Text>
            </View>
          </Press>
        )
      })}
    </ScrollView>
  )
}
