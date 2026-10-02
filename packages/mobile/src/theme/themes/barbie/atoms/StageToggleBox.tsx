import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { ToggleBoxProps } from '../../../types'
import { Cloud, Gloss, MUTED, PINK, PLUM, Press, Sun, caps, display } from './_barbie'

// Barbie mic toggle (Vocal FX / Autotune): A LITTLE PIECE OF SKY. On, the sun
// is out over a blue sky. Off, a cloud drifts across in front of it and the
// sky goes overcast lilac. Tapping it sends the cloud across one way or the
// other. The state is the weather, not a switch drawn next to a label.
export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const cover = useRef(new Animated.Value(on ? 0 : 1)).current
  useEffect(() => {
    Animated.timing(cover, { toValue: on ? 0 : 1, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start()
  }, [on, cover])

  const SKY = 50
  return (
    <Press onPress={onPress} outerStyle={{ flex: 1 }} style={{ flex: 1 }}>
      <Gloss tone="white" radius={20} glint={on} style={{ flex: 1 }} contentStyle={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9, paddingHorizontal: 10 }}>
        <View style={{ width: SKY, height: SKY, borderRadius: SKY / 2, overflow: 'hidden', borderWidth: 2.5, borderColor: '#FFFFFF' }}>
          <LinearGradient colors={['#8FD8F2', '#FFC6DF']} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: cover }}>
            <LinearGradient colors={['#C9B8DE', '#E7D3E9']} style={{ flex: 1 }} />
          </Animated.View>
          <View style={{ position: 'absolute', left: 4, top: 3 }}>
            <Sun size={40} halo={false} spin={on} />
          </View>
          <Animated.View
            style={{
              position: 'absolute',
              left: -10,
              top: 14,
              transform: [{ translateX: cover.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
            }}
          >
            <Cloud width={66} seed={0.58} />
          </Animated.View>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={display(15.5, on ? PINK : PLUM, { lineHeight: 21 })}>
            {label}
          </Text>
          <Text style={caps(9, on ? PINK : MUTED, { marginTop: 0 })}>{on ? 'On, sunny' : 'Off, cloudy'}</Text>
        </View>
      </Gloss>
    </Press>
  )
}
