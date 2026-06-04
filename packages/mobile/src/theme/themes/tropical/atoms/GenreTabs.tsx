import React from 'react'
import { Text, Pressable, ScrollView, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { TROPICAL_MOBILE } from '../../../tokens'
import type { GenreTabsProps } from '../../../types'
import { softShadow, Hibiscus } from './_tropical'

// Tropical genre tabs — each is a little WOOD PLANK with a nail hammered into
// each end. The active plank lights up (sun-bleached timber + a sunshine
// keyline + a hibiscus pinned on); inactive planks sit as plain, dimmer wood.
const t = TROPICAL_MOBILE

function Nail() {
  return (
    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2E2014', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.35)' }} />
    </View>
  )
}

export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}
    >
      {list.map((g) => {
        const active = g === value
        const count = counts[g] ?? 0
        const woodColors: readonly [string, string] = active ? ['#C08A4E', '#9A6A36'] : ['#8A5E32', '#6E4423']
        const ink = active ? '#FFF7E6' : 'rgba(255,241,196,0.82)'
        return (
          <Pressable key={g} onPress={() => onChange(g)} hitSlop={6} style={{ borderRadius: 10, ...softShadow(active ? 5 : 3) }}>
            <LinearGradient
              colors={woodColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 18,
                paddingVertical: 9,
                minHeight: 44,
                borderRadius: 10,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: active ? '#FFC83D' : '#5A3A1E',
              }}
            >
              {/* wood grain + a soft top sheen */}
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <View style={{ position: 'absolute', left: 8, right: 8, top: '34%', height: 1, backgroundColor: 'rgba(0,0,0,0.16)' }} />
                <View style={{ position: 'absolute', left: 8, right: 8, top: '66%', height: 1, backgroundColor: 'rgba(0,0,0,0.16)' }} />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: 'rgba(255,255,255,0.06)' }} />
              </View>
              {/* a nail hammered into each end */}
              <View pointerEvents="none" style={{ position: 'absolute', left: 5, top: '50%', marginTop: -3 }}><Nail /></View>
              <View pointerEvents="none" style={{ position: 'absolute', right: 5, top: '50%', marginTop: -3 }}><Nail /></View>

              {active ? <Hibiscus size={20} stroke={false} /> : null}
              <Text
                style={{ fontFamily: t.fontBody, fontWeight: '700', fontSize: 14, lineHeight: 20, color: ink, letterSpacing: 0.3, includeFontPadding: false }}
                numberOfLines={1}
              >
                {g}
              </Text>
              <View
                style={{
                  marginLeft: 2,
                  paddingHorizontal: 8,
                  paddingVertical: 1,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0,0,0,0.22)',
                  minWidth: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: t.fontBody, fontWeight: '700', fontSize: 12, lineHeight: 17, color: '#FFF1C4', includeFontPadding: false }} numberOfLines={1}>
                  {count}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
