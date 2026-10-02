import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import type { ToggleBoxProps } from '../../../types'
import { DUST, DUST_DIM, GOLD, GOLD_HI, GlassPanel, Press, STAR, Star, display, mono } from './_record'

// Space mic toggle (Vocal FX / Autotune): A STAR. On, it shines: a full eight-
// pointed star in gold. Off, it has gone dark to a faint point. Tapping it
// lights it (the star blooms out of the point) or lets it fade.
export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const lit = useRef(new Animated.Value(on ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(lit, { toValue: on ? 1 : 0, duration: on ? 560 : 300, easing: on ? Easing.out(Easing.back(1.3)) : Easing.in(Easing.quad), useNativeDriver: true }).start()
  }, [on, lit])
  return (
    <Press onPress={onPress} outerStyle={{ flex: 1 }} style={{ flex: 1, borderRadius: 16 }}>
      <GlassPanel lit={on} radius={16} style={{ flex: 1 }} contentStyle={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
        <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: DUST_DIM }} />
          <Animated.View style={{ position: 'absolute', opacity: lit, transform: [{ scale: lit.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }] }}>
            <Star size={40} color={GOLD_HI} />
          </Animated.View>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={display(13.5, on ? STAR : DUST, 500, { letterSpacing: 2.2 })}>
            {label}
          </Text>
          <Text style={mono(9, on ? GOLD : DUST_DIM, { marginTop: 3 })}>{on ? 'On' : 'Off'}</Text>
        </View>
      </GlassPanel>
    </Press>
  )
}
