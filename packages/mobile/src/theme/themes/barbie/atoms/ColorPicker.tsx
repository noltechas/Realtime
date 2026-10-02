import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import type { ColorPickerProps } from '../../../types'
import { PINK, SUN, Twinkle, WHITE, display, mix, useUid } from './_barbie'

// Barbie colour picker: ICE POPS. Every singer colour is an ice pop on a
// wooden stick, glossy and a little melty at the bottom, laid out like the
// cooler at the pool bar. The one that's yours has a BITE taken out of its
// corner, lifts up out of the row and gets a twinkle. Tap another and it's
// bitten instead.

const POP_W = 36
const POP_H = 54
const STICK_H = 22

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const colors = UNIVERSAL_SINGER_COLORS
  const rows = [colors.slice(0, 7), colors.slice(7)]
  return (
    <View style={{ alignItems: 'center' }}>
      {label ? <Text style={display(19, PINK, { marginBottom: 6, alignSelf: 'flex-start' })}>{label}</Text> : null}
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 7, marginTop: r === 0 ? 4 : 2 }}>
          {row.map((c, i) => {
            const idx = r * 7 + i
            return <Pop key={c.color} color={c.color} chosen={idx === value} onPress={() => onChange(idx)} />
          })}
        </View>
      ))}
    </View>
  )
}

function Pop({ color, chosen, onPress }: { color: string; chosen: boolean; onPress: () => void }) {
  const lift = useRef(new Animated.Value(chosen ? 1 : 0)).current
  const id = useUid('bpop')
  useEffect(() => {
    Animated.spring(lift, { toValue: chosen ? 1 : 0, stiffness: 260, damping: chosen ? 9 : 16, mass: 0.7, useNativeDriver: true }).start()
  }, [chosen, lift])

  const whole = `M 0 ${POP_W / 2} A ${POP_W / 2} ${POP_W / 2} 0 0 1 ${POP_W} ${POP_W / 2} L ${POP_W} ${POP_H - 7} Q ${POP_W} ${POP_H} ${POP_W - 7} ${POP_H} L 7 ${POP_H} Q 0 ${POP_H} 0 ${POP_H - 7} Z`
  // The bite: the top-right shoulder replaced by three tooth marks.
  const bitten =
    `M 0 ${POP_W / 2} A ${POP_W / 2} ${POP_W / 2} 0 0 1 14 0.6 ` +
    `A 6 6 0 0 0 21 7 A 6 6 0 0 0 28 12.5 A 6 6 0 0 0 ${POP_W} 20 ` +
    `L ${POP_W} ${POP_H - 7} Q ${POP_W} ${POP_H} ${POP_W - 7} ${POP_H} L 7 ${POP_H} Q 0 ${POP_H} 0 ${POP_H - 7} Z`
  const body = chosen ? bitten : whole
  const light = mix(color, '#FFFFFF', 0.4)
  const dark = mix(color, '#4B0A35', 0.22)
  return (
    <Pressable onPress={onPress} hitSlop={4} accessibilityRole="button" accessibilityState={{ selected: chosen }}>
      <Animated.View style={{ width: POP_W, height: POP_H + STICK_H, transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }, { rotate: lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-6deg'] }) }] }}>
        <Svg width={POP_W} height={POP_H + STICK_H} style={{ overflow: 'visible' }}>
          <Defs>
            <SvgLinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={light} />
              <Stop offset="0.45" stopColor={color} />
              <Stop offset="1" stopColor={dark} />
            </SvgLinearGradient>
          </Defs>
          {/* the wooden stick */}
          <Rect x={POP_W / 2 - 4.5} y={POP_H - 6} width={9} height={STICK_H + 4} rx={4.5} fill="#EECB93" />
          <Rect x={POP_W / 2 - 4.5} y={POP_H - 6} width={3} height={STICK_H + 4} rx={1.5} fill="#F8E2BB" />
          {/* the pop, with a white rim when it's yours */}
          {chosen ? <Path d={body} fill="none" stroke={WHITE} strokeWidth={5} /> : null}
          <Path d={body} fill={`url(#${id}b)`} />
          {/* a melty drip along the bottom edge */}
          <Path d={`M 5 ${POP_H - 1} q 3 6 6 0 M ${POP_W - 13} ${POP_H - 1} q 3 8 6 0`} fill={color} stroke={color} strokeWidth={1} />
          {/* the gloss: one hard stripe of light */}
          <Rect x={6} y={chosen ? 12 : 9} width={5} height={POP_H - 22} rx={2.5} fill={WHITE} opacity={0.55} />
          {/* the ridge lines moulded into an ice pop */}
          <Path d={`M ${POP_W * 0.62} ${POP_W / 2 + 4} L ${POP_W * 0.62} ${POP_H - 8}`} stroke={dark} strokeOpacity={0.25} strokeWidth={1.4} />
        </Svg>
        {chosen ? (
          <View pointerEvents="none" style={{ position: 'absolute', right: -10, top: -10 }}>
            <Twinkle size={16} color={SUN} period={2200} />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  )
}
