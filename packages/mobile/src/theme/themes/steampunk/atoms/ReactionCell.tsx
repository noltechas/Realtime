import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import type { ReactionCellProps } from '../../../types'
import { BRASS, BRASS_HI, BRASS_LO, BRASS_SHEEN, Plaque, Press, caps, useMeasured } from './_engine'

// Steampunk reaction tile: a push-button on the engine's control panel. A
// domed cream glass button in a brass bezel, the reaction inside it, its name
// engraved on the enamel below.
export function ReactionCell({ label, icon, onPress, onEditPress, disabled, index = 0 }: ReactionCellProps) {
  const [size, onLayout] = useMeasured()
  const d = size ? Math.min(size.w * 0.62, size.h * 0.6, 92) : 0
  const id = `rc${index}`
  return (
    <View style={{ flex: 1 }}>
      <Press onPress={onPress} disabled={disabled} outerStyle={{ flex: 1 }} style={{ flex: 1, opacity: disabled ? 0.5 : 1 }}>
        <Plaque border={10} style={{ flex: 1 }} contentStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <View onLayout={onLayout} style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
            {d ? (
              <View style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={d} height={d} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
                  <Defs>
                    <RadialGradient id={`${id}b`} cx="0.36" cy="0.3" r="0.8">
                      <Stop offset="0" stopColor={BRASS_SHEEN} />
                      <Stop offset="0.28" stopColor={BRASS_HI} />
                      <Stop offset="0.6" stopColor={BRASS} />
                      <Stop offset="1" stopColor={BRASS_LO} />
                    </RadialGradient>
                    <RadialGradient id={`${id}g`} cx="0.4" cy="0.32" r="0.72">
                      <Stop offset="0" stopColor="#FFFBEE" />
                      <Stop offset="0.55" stopColor="#EADBB6" />
                      <Stop offset="1" stopColor="#B49A68" />
                    </RadialGradient>
                  </Defs>
                  <Circle cx={51} cy={53} r={47} fill="rgba(0,0,0,0.45)" />
                  <Circle cx={50} cy={50} r={47} fill={`url(#${id}b)`} />
                  <Circle cx={50} cy={50} r={38} fill="#2A1E10" />
                  <Circle cx={50} cy={50} r={36} fill={`url(#${id}g)`} />
                  <Circle cx={39} cy={36} r={9} fill="#FFFFFF" opacity={0.55} />
                </Svg>
                {icon}
              </View>
            ) : null}
          </View>
          {label ? <Text numberOfLines={1} style={caps(9.5, BRASS_HI, { letterSpacing: 1.8 })}>{label}</Text> : null}
        </Plaque>
      </Press>
      {onEditPress ? (
        <Pressable onPress={onEditPress} hitSlop={10} style={{ position: 'absolute', top: 12, right: 12 }}>
          <Ionicons name="create-outline" size={15} color={BRASS_HI} />
        </Pressable>
      ) : null}
    </View>
  )
}
