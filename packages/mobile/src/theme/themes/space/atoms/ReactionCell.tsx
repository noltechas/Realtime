import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Line } from 'react-native-svg'
import type { ReactionCellProps } from '../../../types'
import { ETCH, GOLD_HI, GlassPanel, Press, STAR, display, useMeasured } from './_record'

// Space reaction tile: a black-glass plate with the reaction set inside an
// engraved RETICLE (a ring with four ticks, the way a telescope's finder marks
// the target), its name in widely tracked capitals beneath.
export function ReactionCell({ label, icon, onPress, onEditPress, disabled }: ReactionCellProps) {
  return (
    <View style={{ flex: 1 }}>
      <Press onPress={onPress} disabled={disabled} outerStyle={{ flex: 1 }} style={{ flex: 1, borderRadius: 16, opacity: disabled ? 0.5 : 1 }}>
        <GlassPanel radius={16} style={{ flex: 1 }} contentStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 10 }}>
          <Reticle>{icon}</Reticle>
          <Text numberOfLines={1} style={display(12, STAR, 500, { letterSpacing: 2.4, marginTop: 8 })}>
            {label}
          </Text>
        </GlassPanel>
      </Press>
      {onEditPress ? (
        <Pressable onPress={onEditPress} hitSlop={10} style={{ position: 'absolute', top: 9, right: 9 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ETCH.strong, backgroundColor: 'rgba(2,3,8,0.7)' }}>
            <Ionicons name="create-outline" size={14} color={GOLD_HI} />
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}

function Reticle({ children }: { children: React.ReactNode }) {
  const [size, onLayout] = useMeasured()
  return (
    // Sized from the tile's height (flex in the column) so it always fits.
    <View onLayout={onLayout} style={{ flex: 1, aspectRatio: 1, maxWidth: '78%', alignItems: 'center', justifyContent: 'center' }}>
      {size ? (
        <Svg width={size.w} height={size.h} style={{ position: 'absolute' }}>
          <Circle cx={size.w / 2} cy={size.h / 2} r={size.w / 2 - 2} stroke={ETCH.mid} strokeWidth={1} fill="rgba(2,3,8,0.45)" />
          <Circle cx={size.w / 2} cy={size.h / 2} r={size.w / 2 - 6} stroke={ETCH.faint} strokeWidth={0.8} fill="none" strokeDasharray="1.5 4" />
          {[0, 90, 180, 270].map((a) => {
            const r = (a * Math.PI) / 180
            const c = size.w / 2
            const R = size.w / 2 - 2
            return <Line key={a} x1={c + Math.cos(r) * (R - 7)} y1={c + Math.sin(r) * (R - 7)} x2={c + Math.cos(r) * (R + 2)} y2={c + Math.sin(r) * (R + 2)} stroke={ETCH.strong} strokeWidth={1.2} />
          })}
        </Svg>
      ) : null}
      <View style={{ transform: [{ scale: 0.84 }] }}>{children}</View>
    </View>
  )
}
