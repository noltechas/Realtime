import React, { useEffect, useRef } from 'react'
import { Pressable, View, Animated, StyleSheet } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import { useLinearLoop, useOscillator } from '../_shared'
import { Gear, Rivet } from '../Gear'
import type { PlayButtonProps } from '../../../types'

// Steampunk StagePlayButton — a Great Clockwork Engine:
//   1. Three concentric brass gear rings counter-rotating on independent
//      periods, each at a different scale. The outer gear is the largest
//      and slowest; the inner gear is the smallest and fastest.
//   2. A pulsing gas-lamp halo (amber radial gradient) breathing on a 3s sine.
//   3. Three steam-burst rings expanding outward on staggered loops.
//   4. The central singer-color disc is mounted in a brass bezel with eight
//      compass-rivets and a heavy glow.
//   5. The play glyph is a brass-stamped triangle; pause is two pneumatic
//      pistons (vertical brass bars with rivet heads top and bottom).
export function SteampunkStagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const haloBreath = useOscillator(3000)
  const haloScale = haloBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.1],
  })
  const haloOpacity = haloBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  })

  // Three counter-rotating gear rings.
  const ring1 = useLinearLoop(22000)
  const ring2 = useLinearLoop(15000)
  const ring3 = useLinearLoop(10000)
  const ring1Rot = ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const ring2Rot = ring2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] })
  const ring3Rot = ring3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  // Three steam-burst rings — staggered.
  const burst1 = useRef(new Animated.Value(0)).current
  const burst2 = useRef(new Animated.Value(0)).current
  const burst3 = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const mk = (val: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.timing(val, {
            toValue: 1,
            duration: 2800,
            useNativeDriver: true,
          }),
        ),
      ])
    const a = mk(burst1, 0)
    const b = mk(burst2, 930)
    const c = mk(burst3, 1860)
    a.start()
    b.start()
    c.start()
    return () => {
      a.stop()
      b.stop()
      c.stop()
    }
  }, [burst1, burst2, burst3])

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 260,
        height: 260,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.95 : 1 }],
      })}
    >
      {/* Steam burst rings — behind everything */}
      <SteamBurst value={burst1} color="#E8A93B" />
      <SteamBurst value={burst2} color="#C97D3E" />
      <SteamBurst value={burst3} color="#F0DDB5" />

      {/* Gas-lamp halo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 230,
          height: 230,
          opacity: haloOpacity,
          transform: [{ scale: haloScale }],
        }}
      >
        <Svg width={230} height={230}>
          <Defs>
            <RadialGradient id="steamHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFE4A0" stopOpacity={0.7} />
              <Stop offset="50%" stopColor="#E8A93B" stopOpacity={0.35} />
              <Stop offset="100%" stopColor="#7A4D1A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={115} cy={115} r={113} fill="url(#steamHalo)" />
        </Svg>
      </Animated.View>

      {/* Outer gear ring */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          opacity: 0.75,
          transform: [{ rotate: ring1Rot }],
        }}
      >
        <Gear
          size={240}
          teeth={18}
          bodyColor="#B8762D"
          edgeColor="#5C3A12"
          hubColor="#1F1108"
          highlightColor="#E8C078"
          opacity={0.6}
        />
      </Animated.View>

      {/* Middle gear ring */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 190,
          height: 190,
          opacity: 0.85,
          transform: [{ rotate: ring2Rot }],
        }}
      >
        <Gear
          size={190}
          teeth={14}
          bodyColor="#5C8A7A"
          edgeColor="#2E4640"
          hubColor="#1A2820"
          highlightColor="#8AB5A0"
          opacity={0.75}
        />
      </Animated.View>

      {/* Inner gear ring */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 150,
          height: 150,
          transform: [{ rotate: ring3Rot }],
        }}
      >
        <Gear
          size={150}
          teeth={12}
          bodyColor="#C97D3E"
          edgeColor="#6E3A14"
          hubColor="#3A1E0A"
          highlightColor="#F0A058"
        />
      </Animated.View>

      {/* Center singer-color disc with compass rivets */}
      <View
        style={{
          position: 'absolute',
          width: 110,
          height: 110,
          borderRadius: 55,
          backgroundColor: singerColor,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: '#E8C078',
          shadowColor: singerColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.95,
          shadowRadius: 18,
        }}
      >
        {/* Inner brass ring */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 1.5,
            borderColor: 'rgba(58,30,8,0.6)',
          }}
        />
        {/* 8 compass rivets */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2
          const r = 48
          const x = 55 + Math.cos(a) * r - 4
          const y = 55 + Math.sin(a) * r - 4
          return (
            <View key={i} style={{ position: 'absolute', left: x, top: y }}>
              <Rivet size={8} color="#B8762D" highlight="#F0DDB5" shadow="#3E2810" />
            </View>
          )
        })}

        {isPlaying ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PistonBar />
            <PistonBar />
          </View>
        ) : (
          <BrassPlayTri />
        )}
      </View>
    </Pressable>
  )
}

function SteamBurst({ value, color }: { value: Animated.Value; color: string }) {
  const scale = value.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1.5],
  })
  const opacity = value.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.55, 0],
  })
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <View
        style={{
          width: 230,
          height: 230,
          borderRadius: 115,
          borderWidth: 2,
          borderColor: color,
        }}
      />
    </Animated.View>
  )
}

function PistonBar() {
  return (
    <View style={{ width: 14, height: 50, alignItems: 'center', justifyContent: 'space-between' }}>
      <Rivet size={8} color="#B8762D" highlight="#F0DDB5" shadow="#3E2810" />
      <View
        style={{
          width: 8,
          height: 32,
          backgroundColor: '#1F1108',
          borderWidth: 1,
          borderColor: '#5C3A12',
        }}
      />
      <Rivet size={8} color="#B8762D" highlight="#F0DDB5" shadow="#3E2810" />
    </View>
  )
}

function BrassPlayTri() {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: 22,
        borderBottomWidth: 22,
        borderLeftWidth: 36,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: '#1F1108',
        marginLeft: 10,
      }}
    />
  )
}
