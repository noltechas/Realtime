import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import type { ColorPickerProps } from '../../../types'
import { BONE, CANDLE, fraktur, mix, rosePetal, useStorm, useUid } from './_gothic'

// Gothic colour picker: a ROSE WINDOW. Every singer colour is a petal of
// glass round the hub, leaded and set in a stone ring. The colour you choose is
// the one pane lit from behind (a bright jewel with the light coming through
// it), and the hub glazes itself in that colour too. Every other pane is dark,
// unlit glass that still shows its colour. Lightning lights the whole window.

const SIZE = 268

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const id = useUid('grose')
  const flash = useStorm()
  const n = UNIVERSAL_SINGER_COLORS.length
  const c = SIZE / 2
  const rOut = c - 12
  const rIn = c * 0.34
  const chosen = UNIVERSAL_SINGER_COLORS[value]?.color ?? CANDLE
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    pulse.setValue(0)
    Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }).start()
  }, [value, pulse])

  const petal = (i: number) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2
    return rosePetal(c, c, rIn + 4, rOut, a0, a1)
  }

  return (
    <View style={{ alignItems: 'center' }}>
      {label ? <Text style={fraktur(22, BONE, { marginBottom: 8 })}>{label}</Text> : null}
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`${id}st`} cx="40%" cy="34%" rx="70%" ry="70%">
              <Stop offset="0" stopColor="#3D3847" />
              <Stop offset="0.7" stopColor="#1D1A23" />
              <Stop offset="1" stopColor="#121016" />
            </RadialGradient>
            {UNIVERSAL_SINGER_COLORS.map((sc, i) => (
              // Lit glass blazes; unlit glass is the same colour with no light
              // behind it: deep, dark, still recognisably its hue.
              <RadialGradient key={i} id={`${id}p${i}`} cx="50%" cy="58%" rx="60%" ry="60%">
                <Stop offset="0" stopColor={i === value ? mix(sc.color, '#FFFFFF', 0.55) : mix(sc.color, '#000000', 0.38)} />
                <Stop offset="0.55" stopColor={i === value ? sc.color : mix(sc.color, '#000000', 0.55)} />
                <Stop offset="1" stopColor={mix(sc.color, '#000000', i === value ? 0.3 : 0.72)} />
              </RadialGradient>
            ))}
            <RadialGradient id={`${id}hub`} cx="42%" cy="38%" rx="62%" ry="62%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
              <Stop offset="0.38" stopColor={chosen} />
              <Stop offset="1" stopColor={mix(chosen, '#000000', 0.45)} />
            </RadialGradient>
          </Defs>
          {/* stone ring with a dog-tooth moulding */}
          <Circle cx={c} cy={c} r={c - 1} fill={`url(#${id}st)`} />
          <Circle cx={c} cy={c} r={c - 1.5} fill="none" stroke="#AFC3EA" strokeOpacity={0.3} strokeWidth={1.2} />
          {Array.from({ length: 40 }, (_, i) => {
            const a = (i / 40) * Math.PI * 2
            const r = c - 6.5
            const x = c + Math.cos(a) * r
            const y = c + Math.sin(a) * r
            return <Path key={i} d={`M ${x} ${y - 2.2} L ${x + 2.2} ${y} L ${x} ${y + 2.2} L ${x - 2.2} ${y} Z`} fill="#AFC3EA" fillOpacity={0.14} transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} />
          })}
          <Circle cx={c} cy={c} r={rOut + 2} fill="#07060A" />
          {/* the petals */}
          <G>
            {/* stone bars first (the tracery), then each light's glass and lead */}
            {UNIVERSAL_SINGER_COLORS.map((_, i) => (
              <Path key={`b${i}`} d={petal(i)} fill="none" stroke="#2A2631" strokeWidth={7} strokeLinejoin="miter" />
            ))}
            {UNIVERSAL_SINGER_COLORS.map((_, i) => (
              <Path key={i} d={petal(i)} fill={`url(#${id}p${i})`} stroke="#060508" strokeWidth={1.8} strokeLinejoin="miter" />
            ))}
            {/* old glass is never even: a drawn streak down each light */}
            {UNIVERSAL_SINGER_COLORS.map((_, i) => {
              const am = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2
              const p = (r: number, off: number) => `${(c + Math.cos(am + off) * r).toFixed(1)} ${(c + Math.sin(am + off) * r).toFixed(1)}`
              return <Path key={`s${i}`} d={`M ${p(rIn + 14, -0.05)} L ${p(rOut - 16, -0.04)}`} stroke="#FFFFFF" strokeOpacity={i === value ? 0.32 : 0.08} strokeWidth={2} strokeLinecap="round" />
            })}
          </G>
          {/* hub */}
          <Circle cx={c} cy={c} r={rIn} fill={`url(#${id}hub)`} stroke="#060508" strokeWidth={3} />
          <Circle cx={c} cy={c} r={rIn + 2.4} fill="none" stroke="#AFC3EA" strokeOpacity={0.3} strokeWidth={1} />
          {/* quatrefoil leading over the hub */}
          {[0, 90, 180, 270].map((a) => (
            <Circle key={a} cx={c + Math.cos((a * Math.PI) / 180) * rIn * 0.36} cy={c + Math.sin((a * Math.PI) / 180) * rIn * 0.36} r={rIn * 0.4} fill="none" stroke="#060508" strokeOpacity={0.55} strokeWidth={1.6} />
          ))}
        </Svg>

        {/* The lit pane's light spilling forward. */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: pulse.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0.75] }) }]}
        >
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <RadialGradient id={`${id}spill`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0.25" stopColor={chosen} stopOpacity={0.24} />
                <Stop offset="1" stopColor={chosen} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={c} cy={c} r={c} fill={`url(#${id}spill)`} />
          </Svg>
        </Animated.View>

        {/* Lightning lights the whole window from behind. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }]}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={c} cy={c} r={rOut} fill="#D8E0FF" />
          </Svg>
        </Animated.View>

        {/* Hit targets: one wedge per petal, laid over the drawing. */}
        {UNIVERSAL_SINGER_COLORS.map((sc, i) => {
          const am = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2
          const r = (rIn + rOut) / 2 + 6
          const t = 46
          return (
            <Pressable
              key={i}
              accessibilityLabel={`Pick color ${sc.color}`}
              onPress={() => onChange(i)}
              hitSlop={2}
              style={{ position: 'absolute', left: c + Math.cos(am) * r - t / 2, top: c + Math.sin(am) * r - t / 2, width: t, height: t, borderRadius: t / 2 }}
            />
          )
        })}
      </View>
    </View>
  )
}
