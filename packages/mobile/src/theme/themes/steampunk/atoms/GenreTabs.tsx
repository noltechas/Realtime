import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { GenreTabsProps } from '../../../types'
import { CAST, ENAMEL, ENAMEL_HI, JewelLamp, LAMP, PARCHMENT, PARCHMENT_DIM, Pipe, Plaque, Press, caps, display, mix } from './_engine'

// Steampunk genre tabs: nameplates hung along a copper pipe. Each carries a
// jewel lamp; the chosen one's lamp is lit and its enamel is warmed by it,
// its name cast in brass. The count is engraved beneath.
export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  return (
    <View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 24 }}>
        <Pipe length={1200} d={10} every={160} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingVertical: 4 }}>
        {list.map((g) => {
          const on = g === value
          const n = counts[g] ?? 0
          return (
            <Press key={g} onPress={() => onChange(g)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Plaque
                border={9}
                enamel={on ? [mix(ENAMEL_HI, '#6A5020', 0.35), mix(ENAMEL, '#3A2C10', 0.3), '#0C1511'] : undefined}
                contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, paddingVertical: 1 }}
              >
                <JewelLamp color={LAMP} size={13} lit={on} />
                <View>
                  <Text numberOfLines={1} style={[display(15, on ? undefined : PARCHMENT, { lineHeight: 19 }), on ? CAST : null]}>
                    {g}
                  </Text>
                  <Text style={caps(8, on ? LAMP : PARCHMENT_DIM, { letterSpacing: 1.6 })}>{n} songs</Text>
                </View>
              </Plaque>
            </Press>
          )
        })}
      </ScrollView>
    </View>
  )
}
