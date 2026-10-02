import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Image, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { PlayButtonProps } from '../../../types'
import { BrassPlate, Gauge, IMG, INK, JewelLamp, SteamPuffs } from './_engine'

// Steampunk play control: the engine's main STEAM VALVE. A brass hand wheel;
// press it to open the valve and it spins up, the pressure gauge beside it
// climbs into the red and steam blows off behind; press again and it winds
// down and the needle falls back. Your colour burns in the jewel lamp on the
// boss.
const WHEEL = 168
const GAUGE = 74

export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const spin = useRef(new Animated.Value(0)).current
  const pressure = useRef(new Animated.Value(isPlaying ? 0.86 : 0.06)).current
  const press = useRef(new Animated.Value(0)).current
  const turned = useRef(0)

  useEffect(() => {
    Animated.timing(pressure, { toValue: isPlaying ? 0.86 : 0.06, duration: isPlaying ? 1400 : 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
    if (!isPlaying) return
    // keep turning while the valve is open
    let stopped = false
    const step = () => {
      if (stopped) return
      turned.current += 1
      Animated.timing(spin, { toValue: turned.current, duration: 2600, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => finished && step())
    }
    // a hard quarter turn to crack the valve open, then steady
    turned.current += 0.25
    Animated.timing(spin, { toValue: turned.current, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => finished && step())
    return () => {
      stopped = true
      spin.stopAnimation((v) => {
        turned.current = v
        // and a short wind-down
        Animated.timing(spin, { toValue: v + 0.12, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
        turned.current = v + 0.12
      })
    }
  }, [isPlaying, spin, pressure])

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  return (
    <View style={{ width: WHEEL + 60, height: WHEEL + 20, alignItems: 'center', justifyContent: 'center' }}>
      {isPlaying ? <SteamPuffs x={WHEEL * 0.22} y={WHEEL * 0.3} size={70} period={3600} rise={110} /> : null}
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.timing(press, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, stiffness: 320, damping: 15, useNativeDriver: true }).start()}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        hitSlop={8}
      >
        <Animated.View style={{ width: WHEEL, height: WHEEL, transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) }] }}>
          <Animated.Image source={IMG.handwheel} style={{ position: 'absolute', width: WHEEL, height: WHEEL, transform: [{ rotate }] }} />
          <View style={{ position: 'absolute', left: WHEEL / 2 - 30, top: WHEEL / 2 - 30 }}>
            <BrassPlate radius={30} contentStyle={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={INK} style={{ marginLeft: isPlaying ? 0 : 3 }} />
            </BrassPlate>
          </View>
          <View style={{ position: 'absolute', left: WHEEL / 2 - 7, top: WHEEL / 2 + 33 }}>
            <JewelLamp color={singerColor} size={14} lit={isPlaying} />
          </View>
        </Animated.View>
      </Pressable>
      <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0 }}>
        <Gauge size={GAUGE} value={pressure} />
      </View>
      <Image source={IMG.pipeCoupling} style={{ position: 'absolute', right: GAUGE / 2 - 6, top: GAUGE - 6, width: 12, height: 18 }} />
    </View>
  )
}
