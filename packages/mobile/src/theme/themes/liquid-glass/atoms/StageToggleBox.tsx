import React, { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'
import type { ToggleBoxProps } from '../../../types'
import { GREEN, Glass, Press, SOFT, WHITE, sf } from './_glass'

// Liquid Glass toggle: a pane with the system switch on it. As it flips, the
// knob swells into a drop of glass and springs across (the way iOS 26's
// switches turn to glass under your finger), then settles back to white.
const TW = 56
const TH = 32
const K = 26

export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current
  const swell = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.parallel([
      Animated.spring(v, { toValue: on ? 1 : 0, stiffness: 300, damping: 22, mass: 0.8, useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(swell, { toValue: 1, duration: 110, useNativeDriver: false }),
        Animated.spring(swell, { toValue: 0, stiffness: 260, damping: 14, useNativeDriver: false }),
      ]),
    ]).start()
  }, [on, v, swell])
  const track = v.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.22)', GREEN] })
  return (
    // Only the outer press flexes, and only along the row it sits in. A
    // `flex: 1` on the layers inside sets their basis to 0 in a row of auto
    // height, and the toggle collapses to a sliver (StageScreen's toggle row
    // has no fixed height).
    <Press onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} outerStyle={{ flex: 1 }}>
      <Glass radius={24} interactive style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={sf(16.5, '700', WHITE)}>
            {label}
          </Text>
          <Text style={sf(13, '500', SOFT, { marginTop: 1 })}>{on ? 'On' : 'Off'}</Text>
        </View>
        <Animated.View style={{ width: TW, height: TH, borderRadius: TH / 2, backgroundColor: track, justifyContent: 'center' }}>
          <Animated.View
            style={{
              position: 'absolute',
              left: v.interpolate({ inputRange: [0, 1], outputRange: [3, TW - K - 3] }),
              width: swell.interpolate({ inputRange: [0, 1], outputRange: [K, K + 12] }),
              height: K,
              borderRadius: K / 2,
              backgroundColor: swell.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,1)', 'rgba(255,255,255,0.55)'] }),
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.9)',
              shadowColor: '#000',
              shadowOpacity: 0.22,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              transform: [{ scale: swell.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
            }}
          />
        </Animated.View>
      </Glass>
    </Press>
  )
}
