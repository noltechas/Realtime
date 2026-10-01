import React, { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg'
import type { SongsSearchBarProps } from '../../../types'
import { ASH, BONE, CANDLE, PEWTER, SERIF, cuspPath, useMeasured, useUid } from './_gothic'

// Gothic search: a slot CARVED INTO the stone: the field is recessed (dark at
// its upper wall, catching candlelight on its lower lip), cusped at the corners
// like every tablet in the building. Focus lights a candle-gold rim inside the
// cut rather than swapping the whole style.
export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const [focused, setFocused] = useState(false)
  const f = useRef(new Animated.Value(0)).current
  const [size, onLayout] = useMeasured()
  const id = useUid('gsrch')

  useEffect(() => {
    const a = Animated.timing(f, { toValue: focused ? 1 : 0, duration: 220, useNativeDriver: true })
    a.start()
    return () => a.stop()
  }, [focused, f])

  return (
    <View onLayout={onLayout} style={{ height: 52, justifyContent: 'center' }}>
      {size ? (
        <>
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#050407" />
                <Stop offset="0.5" stopColor="#0C0A10" />
                <Stop offset="1" stopColor="#15111A" />
              </SvgLinearGradient>
              <SvgLinearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity={0.9} />
                <Stop offset="0.6" stopColor="#2A2631" stopOpacity={1} />
                <Stop offset="1" stopColor="#E3B04B" stopOpacity={0.45} />
              </SvgLinearGradient>
            </Defs>
            <Path d={cuspPath(size.w, size.h, 10)} fill={`url(#${id}r)`} />
            <Path d={cuspPath(size.w, size.h, 10, 1.4)} fill={`url(#${id}f)`} />
            {/* the cut's upper wall throws a shadow down into the slot */}
            <Path d={`M 14 4 L ${size.w - 14} 4`} stroke="#000" strokeOpacity={0.7} strokeWidth={3} />
          </Svg>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: f }]}>
            <Svg width={size.w} height={size.h}>
              <Path d={cuspPath(size.w, size.h, 10, 3)} stroke={CANDLE} strokeOpacity={0.7} strokeWidth={1.2} fill="none" />
            </Svg>
          </Animated.View>
        </>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
        <Ionicons name="search" size={18} color={focused ? CANDLE : PEWTER} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search the hymnal"
          placeholderTextColor={ASH}
          selectionColor={CANDLE}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{ flex: 1, fontFamily: SERIF, fontSize: 17, color: BONE, paddingVertical: 10 }}
        />
        {value ? (
          <Pressable onPress={() => onChangeText('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={PEWTER} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
