import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import type { ColorPickerProps } from '../../../types'
import { FORM, GRAPHITE, IMG, Mark, PencilBox, SHEET, printed, wobble } from './_pencil'

// Sketch colour picker: a test sheet of coloured pencils, one worked swatch
// per colour. Yours is ringed in graphite and ticked.
export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const colors = UNIVERSAL_SINGER_COLORS
  return (
    <View>
      {label ? <Text style={printed(10.5, FORM, { marginBottom: 6, marginLeft: 4 })}>{label}</Text> : null}
      <PencilBox border={14} fill={SHEET} contentStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, paddingVertical: 4 }}>
        {colors.map((c, i) => (
          <Swatch key={c.color} color={c.color} index={i} chosen={i === value} onPress={() => onChange(i)} />
        ))}
      </PencilBox>
    </View>
  )
}

function Swatch({ color, index, chosen, onPress }: { color: string; index: number; chosen: boolean; onPress: () => void }) {
  const grow = useRef(new Animated.Value(chosen ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(grow, { toValue: chosen ? 1 : 0, stiffness: 240, damping: chosen ? 12 : 18, mass: 0.7, useNativeDriver: true }).start()
  }, [chosen, grow])
  const S = 44
  return (
    <Pressable onPress={onPress} hitSlop={3} accessibilityRole="button" accessibilityState={{ selected: chosen }} style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.04] }) }, { rotate: `${wobble(index, 9) * 40}deg` }] }}>
        <Mark src={IMG.swatch} color={color} width={S - 6} height={S - 6} />
      </Animated.View>
      {chosen ? (
        <>
          <Mark src={IMG.ringRound} color={GRAPHITE} width={S + 6} height={S + 6} style={{ position: 'absolute', left: -3, top: -3 }} />
          <Mark src={IMG.check} color={GRAPHITE} width={22} height={22} style={{ position: 'absolute', right: -6, top: -8 }} />
        </>
      ) : null}
    </Pressable>
  )
}
