import React, { useEffect, useRef } from 'react'
import { Pressable, View, Animated, StyleSheet } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle, Polygon } from 'react-native-svg'
import { useLinearLoop, useOscillator } from '../_shared'
import { SlattedSun } from '../primitives'
import type { PlayButtonProps } from '../../../types'

// Retrowave StagePlayButton — the iconic synthwave sun rising over the grid:
//   1. Outer halo — orange→pink→purple radial that breathes on a 3s sine.
//   2. Three counter-rotating dashed rings — the outer is hot pink, middle
//      cyan, inner violet. They orbit the sun at different speeds.
//   3. Three "shockwave" rings expanding outward on staggered loops.
//   4. The center contains the slatted-sun glyph; pressing scales it down
//      slightly and reveals the play/pause overlay.
//   5. Play glyph is a chrome-bevelled triangle; pause is two italic pink
//      tubes.
export function RetrowaveStagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const halo = useOscillator(3200)
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] })

  const ring1 = useLinearLoop(18000)
  const ring2 = useLinearLoop(12000)
  const ring3 = useLinearLoop(8000)
  const ring1Rot = ring1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const ring2Rot = ring2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] })
  const ring3Rot = ring3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  const shock1 = useRef(new Animated.Value(0)).current
  const shock2 = useRef(new Animated.Value(0)).current
  const shock3 = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const mk = (val: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.timing(val, {
            toValue: 1,
            duration: 2600,
            useNativeDriver: true,
          }),
        ),
      ])
    const a = mk(shock1, 0)
    const b = mk(shock2, 866)
    const c = mk(shock3, 1733)
    a.start()
    b.start()
    c.start()
    return () => {
      a.stop()
      b.stop()
      c.stop()
    }
  }, [shock1, shock2, shock3])

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
      {/* Shockwaves */}
      <Shockwave value={shock1} color="#FF2D95" />
      <Shockwave value={shock2} color="#00F0FF" />
      <Shockwave value={shock3} color="#B967FF" />

      {/* Halo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          opacity: haloOpacity,
          transform: [{ scale: haloScale }],
        }}
      >
        <Svg width={240} height={240}>
          <Defs>
            <RadialGradient id="rwStageHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFE45A" stopOpacity={0.85} />
              <Stop offset="40%" stopColor="#FF2D95" stopOpacity={0.6} />
              <Stop offset="80%" stopColor="#B967FF" stopOpacity={0.3} />
              <Stop offset="100%" stopColor="#0A0420" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={120} cy={120} r={118} fill="url(#rwStageHalo)" />
        </Svg>
      </Animated.View>

      {/* Three counter-rotating dashed rings */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: 220, height: 220, transform: [{ rotate: ring1Rot }] }}
      >
        <Svg width={220} height={220}>
          <Circle cx={110} cy={110} r={104} fill="none" stroke="#FF2D95" strokeWidth={1.5} strokeDasharray="6,6" opacity={0.85} />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: 200, height: 200, transform: [{ rotate: ring2Rot }] }}
      >
        <Svg width={200} height={200}>
          <Circle cx={100} cy={100} r={92} fill="none" stroke="#00F0FF" strokeWidth={1.3} strokeDasharray="3,5" opacity={0.85} />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: 175, height: 175, transform: [{ rotate: ring3Rot }] }}
      >
        <Svg width={175} height={175}>
          <Circle cx={87.5} cy={87.5} r={78} fill="none" stroke="#B967FF" strokeWidth={1.2} strokeDasharray="2,4" opacity={0.7} />
        </Svg>
      </Animated.View>

      {/* Sun + play/pause overlay */}
      <View
        style={{
          position: 'absolute',
          width: 140,
          height: 140,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#FF2D95',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 20,
        }}
      >
        <View
          style={{ position: 'absolute', width: 140, height: 140, opacity: isPlaying ? 0.55 : 1 }}
        >
          <SlattedSun size={140} haloOpacity={1} showHighlight={false} />
        </View>

        {/* Singer-color ring just inside the sun edge — ties the button to
            the active singer's identity */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 132,
            height: 132,
            borderRadius: 66,
            borderWidth: 2,
            borderColor: singerColor,
            opacity: 0.75,
            shadowColor: singerColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 8,
          }}
        />

        {/* Play/pause glyph — wrapped in an absolutely-positioned container
            with an explicit zIndex so it ALWAYS renders above the sun's
            slats. Previously the slats were appearing as a horizontal dark
            line crossing the triangle because RN's sibling z-order doesn't
            reliably put a flex child above an absolutely-positioned SVG
            sibling. The triangle itself is now a solid SVG polygon (not
            the CSS-border trick) so there's no internal seam either. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 140,
            height: 140,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            elevation: 10,
          }}
        >
          {isPlaying ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={pauseBarStyle()} />
              <View style={pauseBarStyle()} />
            </View>
          ) : (
            <PlayTriangle />
          )}
        </View>
      </View>
    </Pressable>
  )
}

function Shockwave({ value, color }: { value: Animated.Value; color: string }) {
  const scale = value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.5] })
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

function pauseBarStyle() {
  return {
    width: 12,
    height: 44,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FF2D95',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  }
}

function PlayTriangle() {
  // Single SVG polygon — one solid opaque shape. The previous CSS-border
  // trick produced a triangle by stacking four trapezoids (top + bottom
  // transparent, left visible) which can show seams where the transparent
  // and opaque borders meet. A clean polygon has no internal edges.
  return (
    <View style={{ marginLeft: 6 }}>
      <Svg width={40} height={46} viewBox="0 0 40 46">
        <Polygon points="2,0 2,46 40,23" fill="#FFFFFF" />
      </Svg>
    </View>
  )
}
