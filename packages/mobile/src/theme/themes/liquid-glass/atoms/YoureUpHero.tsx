import React from 'react'
import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Glass, LIFT, WHITE, sf } from './_glass'

// Liquid Glass "You're up": a capsule of glass with the mic, and the words
// set large beneath it.
export function YoureUpHero() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 10, gap: 10 }}>
      <Glass radius={18} tint="rgba(255,55,95,0.5)" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7 }}>
        <Ionicons name="mic" size={15} color={WHITE} />
        <Text style={sf(14, '700', WHITE)}>Your turn</Text>
      </Glass>
      <Text style={[sf(48, '800', WHITE, { letterSpacing: -1.4 }), LIFT]}>You're up</Text>
    </View>
  )
}
