import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient as SvgLinear, Rect, Stop } from 'react-native-svg'
import type { ToggleBoxProps } from '../../../types'
import { BRASS, BRASS_HI, BRASS_LO, BRASS_SHEEN, CAST, JewelLamp, LAMP, PARCHMENT_DIM, Plaque, Press, caps, display } from './_engine'

// Steampunk toggle: a brass knife-switch lever on the control panel. Throw it
// up and it's on (its jewel lamp lights); throw it down and it's off. The
// lever swings on its pivot with a little overshoot, the way a sprung switch
// snaps home.
export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(v, { toValue: on ? 1 : 0, stiffness: 260, damping: 13, mass: 0.7, useNativeDriver: true }).start()
  }, [on, v])
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['145deg', '35deg'] })
  return (
    <Press onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} outerStyle={{ flex: 1 }} style={{ flex: 1 }}>
      <Plaque border={10} style={{ flex: 1 }} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2, paddingHorizontal: 4 }}>
        <View style={{ width: 44, height: 50 }}>
          <Svg width={44} height={50} viewBox="0 0 44 50" style={{ position: 'absolute' }}>
            <Defs>
              <SvgLinear id="tb" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={BRASS_SHEEN} />
                <Stop offset="0.3" stopColor={BRASS_HI} />
                <Stop offset="0.7" stopColor={BRASS} />
                <Stop offset="1" stopColor={BRASS_LO} />
              </SvgLinear>
            </Defs>
            {/* the mounting plate, with its two screws */}
            <Rect x={10} y={8} width={24} height={34} rx={4} fill="url(#tb)" stroke={BRASS_LO} strokeWidth={1} />
            <Circle cx={22} cy={12.5} r={2} fill={BRASS_LO} />
            <Circle cx={22} cy={37.5} r={2} fill={BRASS_LO} />
            <Circle cx={22} cy={25} r={5.5} fill="#1A120A" />
          </Svg>
          {/* the lever, pivoting at the plate's centre: a dark iron arm with
              a black knob, so it reads against the brass */}
          <Animated.View style={{ position: 'absolute', left: 22 - 5, top: 25 - 26, width: 10, height: 26, transformOrigin: '50% 100%', transform: [{ rotate }] }}>
            <View style={{ position: 'absolute', left: 3, top: 6, width: 4, height: 20, borderRadius: 2, backgroundColor: '#2E2A26', borderLeftWidth: 1, borderLeftColor: '#6B655E' }} />
            <View style={{ position: 'absolute', left: -1, top: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#120C08', borderWidth: 1, borderColor: '#3A2A1E' }}>
              <View style={{ position: 'absolute', left: 2.5, top: 2, width: 4, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            </View>
          </Animated.View>
          <View style={{ position: 'absolute', left: 17, top: 20, width: 10, height: 10, borderRadius: 5, backgroundColor: BRASS_HI, borderWidth: 1, borderColor: BRASS_LO }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[display(16, undefined, { lineHeight: 21 }), CAST]}>{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <JewelLamp color={on ? LAMP : '#8A7A62'} size={11} lit={on} />
            <Text style={caps(9, on ? LAMP : PARCHMENT_DIM, { letterSpacing: 1.8 })}>{on ? 'On' : 'Off'}</Text>
          </View>
        </View>
      </Plaque>
    </Press>
  )
}
