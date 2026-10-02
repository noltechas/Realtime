import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import type { ColorPickerProps } from '../../../types'
import { FAINT, Glass, WHITE, sf } from './_glass'

// Liquid Glass colour picker: a pane of glass with a drop of each colour on
// it. Yours swells, ringed in white with a tick.
export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const colors = UNIVERSAL_SINGER_COLORS
  // Pads itself to the page gutter (ProfileView renders pickers full-bleed).
  return (
    <View style={{ paddingHorizontal: 24 }}>
      {label ? <Text style={sf(13, '600', FAINT, { textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 6 })}>{label}</Text> : null}
      <Glass radius={26} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, padding: 14 }}>
        {colors.map((c, i) => (
          <Drop key={c.color} color={c.color} chosen={i === value} onPress={() => onChange(i)} />
        ))}
      </Glass>
    </View>
  )
}

function Drop({ color, chosen, onPress }: { color: string; chosen: boolean; onPress: () => void }) {
  const grow = useRef(new Animated.Value(chosen ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(grow, { toValue: chosen ? 1 : 0, stiffness: 260, damping: chosen ? 11 : 18, mass: 0.7, useNativeDriver: true }).start()
  }, [chosen, grow])
  const S = 40
  return (
    <Pressable onPress={onPress} hitSlop={3} accessibilityRole="button" accessibilityState={{ selected: chosen }} style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
        <View style={{ width: S - 6, height: S - 6, borderRadius: (S - 6) / 2, backgroundColor: color, borderWidth: chosen ? 2.5 : 0, borderColor: WHITE, alignItems: 'center', justifyContent: 'center', shadowColor: color, shadowOpacity: 0.6, shadowRadius: chosen ? 8 : 0 }}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 5, top: 4, width: (S - 6) * 0.4, height: (S - 6) * 0.26, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          {chosen ? <Ionicons name="checkmark" size={18} color={WHITE} /> : null}
        </View>
      </Animated.View>
    </Pressable>
  )
}
