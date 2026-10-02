import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import type { ColorPickerProps } from '../../../types'
import { BRASS_HI, JewelLamp, Plaque, caps } from './_engine'

// Steampunk colour picker: a panel of jewel lamps, one per colour. Yours is
// lit, swells a little, and is ringed with a brass indicator collar.
export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const colors = UNIVERSAL_SINGER_COLORS
  return (
    <View>
      {label ? <Text style={caps(11, BRASS_HI, { letterSpacing: 2.4, marginBottom: 8 })}>{label}</Text> : null}
      <Plaque border={10} contentStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingVertical: 4 }}>
        {colors.map((c, i) => (
          <Lamp key={c.color} color={c.color} chosen={i === value} onPress={() => onChange(i)} />
        ))}
      </Plaque>
    </View>
  )
}

function Lamp({ color, chosen, onPress }: { color: string; chosen: boolean; onPress: () => void }) {
  const grow = useRef(new Animated.Value(chosen ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(grow, { toValue: chosen ? 1 : 0, stiffness: 240, damping: chosen ? 11 : 18, mass: 0.7, useNativeDriver: true }).start()
  }, [chosen, grow])
  const S = 42
  return (
    <Pressable onPress={onPress} hitSlop={3} accessibilityRole="button" accessibilityState={{ selected: chosen }} style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      {chosen ? (
        <Svg width={S} height={S} style={{ position: 'absolute' }}>
          <Circle cx={S / 2} cy={S / 2} r={S / 2 - 1.5} fill="none" stroke={BRASS_HI} strokeWidth={2} />
          <Circle cx={S / 2} cy={S / 2} r={S / 2 - 5} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
        </Svg>
      ) : null}
      <Animated.View style={{ transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.08] }) }] }}>
        <JewelLamp color={color} size={28} glow={chosen} />
      </Animated.View>
    </Pressable>
  )
}
