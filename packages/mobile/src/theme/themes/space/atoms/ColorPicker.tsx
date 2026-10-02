import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import Svg, { Circle, Line, Polyline } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import type { ColorPickerProps } from '../../../types'
import { ETCH, GOLD_HI, Star, display, rng, useMeasured } from './_record'

// Space colour picker: a STAR CHART. Every singer colour is a star, joined to
// the next by an engraved constellation line, laid out the way a chart plots a
// constellation. The one that's yours is drawn larger, its spikes reaching
// out, and ringed with the chart's target marker.

const ROW_H = 58

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [size, onLayout] = useMeasured()
  const colors = UNIVERSAL_SINGER_COLORS
  const pts = useMemo(() => {
    if (!size) return []
    const r = rng(0.4271)
    const w = size.w
    const top = colors.slice(0, 7)
    const bot = colors.slice(7)
    const out: Array<{ x: number; y: number }> = []
    top.forEach((_, i) => out.push({ x: (w / 7) * (i + 0.5), y: ROW_H * 0.5 + (r() - 0.5) * 16 }))
    bot.forEach((_, i) => out.push({ x: (w / 7) * (i + 1), y: ROW_H * 1.5 + (r() - 0.5) * 16 }))
    return out
  }, [size, colors])
  return (
    <View>
      {label ? <Text style={display(13, GOLD_HI, 400, { letterSpacing: 3, marginBottom: 8 })}>{label}</Text> : null}
      <View onLayout={onLayout} style={{ height: ROW_H * 2 + 6 }}>
        {size ? (
          <Svg width={size.w} height={ROW_H * 2 + 6} style={{ position: 'absolute' }}>
            <Polyline points={pts.slice(0, 7).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={ETCH.mid} strokeWidth={1} strokeDasharray="2 5" />
            <Polyline points={pts.slice(7).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={ETCH.mid} strokeWidth={1} strokeDasharray="2 5" />
            {pts.length > 8 ? <Line x1={pts[6].x} y1={pts[6].y} x2={pts[12].x} y2={pts[12].y} stroke={ETCH.faint} strokeWidth={1} strokeDasharray="2 5" /> : null}
            {pts[value] ? (
              <>
                <Circle cx={pts[value].x} cy={pts[value].y} r={21} fill="none" stroke={ETCH.strong} strokeWidth={1} />
                {[0, 90, 180, 270].map((a) => {
                  const rad = (a * Math.PI) / 180
                  const p = pts[value]
                  return <Line key={a} x1={p.x + Math.cos(rad) * 17} y1={p.y + Math.sin(rad) * 17} x2={p.x + Math.cos(rad) * 26} y2={p.y + Math.sin(rad) * 26} stroke={ETCH.strong} strokeWidth={1.2} />
                })}
              </>
            ) : null}
          </Svg>
        ) : null}
        {size
          ? colors.map((c, i) => (
              <ChartStar key={c.color} color={c.color} chosen={i === value} x={pts[i].x} y={pts[i].y} onPress={() => onChange(i)} />
            ))
          : null}
      </View>
    </View>
  )
}

function ChartStar({ color, chosen, x, y, onPress }: { color: string; chosen: boolean; x: number; y: number; onPress: () => void }) {
  const grow = useRef(new Animated.Value(chosen ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(grow, { toValue: chosen ? 1 : 0, stiffness: 220, damping: chosen ? 11 : 18, mass: 0.7, useNativeDriver: true }).start()
  }, [chosen, grow])
  const S = 44
  return (
    <Pressable onPress={onPress} hitSlop={4} accessibilityRole="button" accessibilityState={{ selected: chosen }} style={{ position: 'absolute', left: x - S / 2, top: y - S / 2, width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1.08] }) }] }}>
        <Star size={S} color={color} />
      </Animated.View>
    </Pressable>
  )
}

