import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import type { ToggleBoxProps } from '../../../types'
import { ASH, BONE, CANDLE, CandleWax, Flame, PEWTER, Press, Stone, gothic, smallCaps, useFlicker } from './_gothic'

// Gothic mic toggle (Vocal FX / Autotune): a CANDLE on a stone tablet. On is a
// lit candle; off is the same candle snuffed, a thread of smoke curling up off
// the wick. Tapping it lights it (the flame grows up out of the wick) or puts it
// out (the flame shrinks to nothing and the smoke rises). The state is the
// object, not a switch drawn next to a label.
export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const lit = useRef(new Animated.Value(on ? 1 : 0)).current
  const smoke = useRef(new Animated.Value(on ? 1 : 0)).current
  const flicker = useFlicker()
  const first = useRef(true)

  useEffect(() => {
    Animated.timing(lit, { toValue: on ? 1 : 0, duration: on ? 420 : 220, easing: on ? Easing.out(Easing.back(1.6)) : Easing.in(Easing.quad), useNativeDriver: true }).start()
    if (!on && !first.current) {
      smoke.setValue(0)
      Animated.timing(smoke, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
    }
    first.current = false
  }, [on, lit, smoke])

  return (
    <Press onPress={onPress} outerStyle={{ flex: 1 }} style={{ flex: 1 }}>
      <Stone
        tone={on ? 'lit' : 'crypt'}
        cusp={11}
        seed={`tog-${label}`}
        glow={on ? CANDLE : undefined}
        contentStyle={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingVertical: 10, paddingHorizontal: 14 }}
      >
        <View style={{ width: 30, height: 52, alignItems: 'center', justifyContent: 'flex-end' }}>
          {/* smoke from a snuffed wick */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 26,
              width: 6,
              height: 22,
              borderRadius: 3,
              backgroundColor: 'rgba(200,200,215,0.35)',
              opacity: smoke.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.8, 0] }),
              transform: [
                { translateY: smoke.interpolate({ inputRange: [0, 1], outputRange: [6, -22] }) },
                { translateX: smoke.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 3, -2] }) },
                { scaleX: smoke.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) },
              ],
            }}
          />
          <View style={{ position: 'absolute', bottom: 18 }}>
            <Flame size={11} flicker={flicker} lit={lit} halo={1.3} />
          </View>
          <CandleWax width={11} height={22} wax={on ? 'ivory' : 'black'} lit={on} seed={label.length} />
        </View>
        <View style={{ flex: 1, paddingBottom: 2 }}>
          <Text numberOfLines={1} style={gothic(16, on ? BONE : PEWTER, 700)}>
            {label}
          </Text>
          <Text style={smallCaps(8.5, on ? CANDLE : ASH, { marginTop: 1 })}>{on ? 'Lit' : 'Snuffed'}</Text>
        </View>
      </Stone>
    </Press>
  )
}
