import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { GenreTabsProps } from '../../../types'
import { FAINT, Glass, GlassGroup, Press, SOFT, WHITE, sf } from './_glass'

// Liquid Glass genre tabs: capsules of glass in a row that melt into each
// other where they meet; the chosen one is tinted brighter.
export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  return (
    // flexGrow 0: a ScrollView grows by default, and in the Songs column it
    // took half the spare height whenever the grid was short (a search with
    // one result), opening a gap between the tabs and the results.
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8 }}>
      <GlassGroup spacing={8} style={{ flexDirection: 'row', gap: 8 }}>
        {list.map((g) => {
          const on = g === value
          const n = counts[g] ?? 0
          return (
            <Press key={g} onPress={() => onChange(g)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Glass radius={20} interactive tint={on ? 'rgba(255,255,255,0.32)' : undefined} variant={on ? 'regular' : 'clear'} shadow={false} style={{ height: 40, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text numberOfLines={1} style={sf(15, on ? '700' : '600', on ? WHITE : SOFT)}>
                  {g}
                </Text>
                <View>
                  <Text style={sf(13, '500', on ? SOFT : FAINT)}>{n}</Text>
                </View>
              </Glass>
            </Press>
          )
        })}
      </GlassGroup>
    </ScrollView>
  )
}
