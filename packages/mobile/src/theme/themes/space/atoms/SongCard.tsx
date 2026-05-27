import React, { useRef } from 'react'
import { View, Text, Image, Pressable, Animated, StyleSheet } from 'react-native'
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useOscillator, useLinearLoop } from '../_shared'
import type { SongCardProps } from '../../../types'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Space SongCard — a holographic HUD panel:
//   • Translucent void background with a subtle constellation backdrop
//     (sparse dots + connecting lines, deterministic per-track).
//   • Four HUD corner brackets (magenta + cyan) frame the card silhouette.
//   • Album art is wrapped in a planet-orbit ring; a small cyan satellite
//     traces the ring on a continuous linear loop.
//   • Title in Orbitron caps with magenta glow, artist in Exo 2.
//   • Press triggers a magenta accretion-disk ripple from the art center.
export function SpaceSongCard({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)
  const seed = track.track_id || track.name || track.artist
  const seedHash = hashKey(seed)

  // Subtle pulse on the card glow — period seeded so adjacent cards differ.
  const pulse = useOscillator(3800 + (seedHash % 17) * 220)
  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.85],
  })

  // Orbit rotation for the satellite around the art.
  const orbit = useLinearLoop(7500 + (seedHash % 7) * 600)
  const orbitAngle = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Press ripple — magenta accretion expanding from the art center.
  const ripple = useRef(new Animated.Value(0)).current
  const triggerRipple = () => {
    ripple.setValue(0)
    Animated.timing(ripple, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start()
  }
  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.7],
  })
  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.7, 0],
  })

  return (
    <Pressable
      onPress={() => {
        triggerRipple()
        onPress()
      }}
      style={{ flex: 1, marginBottom: 14 }}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(14,14,26,0.85)',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: 'rgba(224,64,251,0.35)',
          padding: 14,
          paddingTop: 16,
          shadowColor: tokens.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 14,
        }}
      >
        {/* HUD corner brackets */}
        <HudBrackets />

        {/* Album art with orbit ring + satellite */}
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            marginTop: 4,
          }}
        >
          {/* Cyan orbit ring */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: '94%',
              aspectRatio: 1,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(64,224,208,0.45)',
              borderStyle: 'dashed',
            }}
          />

          <View
            style={{
              width: '82%',
              aspectRatio: 1,
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: '#0E0E1A',
              borderWidth: 1.5,
              borderColor: 'rgba(224,64,251,0.55)',
              shadowColor: '#E040FB',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 10,
            }}
          >
            {track.art_url ? (
              <Image
                source={{ uri: track.art_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NoteGlyph color={tokens.accentA} />
              </View>
            )}

            {/* Press ripple */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 140,
                height: 140,
                marginLeft: -70,
                marginTop: -70,
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              }}
            >
              <Svg width={140} height={140} viewBox="0 0 140 140">
                <Defs>
                  <RadialGradient id="accretionDisk" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#E040FB" stopOpacity={0} />
                    <Stop offset="65%" stopColor="#E040FB" stopOpacity={0.5} />
                    <Stop offset="100%" stopColor="#40E0D0" stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={70} cy={70} r={68} fill="url(#accretionDisk)" />
                <Circle
                  cx={70}
                  cy={70}
                  r={66}
                  fill="none"
                  stroke="#E040FB"
                  strokeWidth={1.5}
                  opacity={0.55}
                />
              </Svg>
            </Animated.View>
          </View>

          {/* Orbiting satellite — a cyan dot tracing the ring. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: '94%',
              aspectRatio: 1,
              alignItems: 'center',
              transform: [{ rotate: orbitAngle }],
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#40E0D0',
                marginTop: -3.5,
                shadowColor: '#40E0D0',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.95,
                shadowRadius: 6,
              }}
            />
          </Animated.View>
        </View>

        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 14,
            color: tokens.black,
            textAlign: 'center',
            letterSpacing: 1,
            textTransform: 'uppercase',
            textShadowColor: 'rgba(224,64,251,0.6)',
            textShadowRadius: 6,
            textShadowOffset: { width: 0, height: 0 },
          }}
          numberOfLines={2}
        >
          {track.name}
        </Text>
        <Text
          style={{
            fontFamily: tokens.fontBody,
            fontSize: 12,
            color: tokens.muted,
            marginTop: 4,
            textAlign: 'center',
            letterSpacing: 0.6,
          }}
          numberOfLines={1}
        >
          {track.artist}
        </Text>
        {duration ? (
          <View
            style={{
              marginTop: 8,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Animated.View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#40E0D0',
                opacity: glowOpacity,
                shadowColor: '#40E0D0',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 4,
              }}
            />
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontSize: 11,
                color: tokens.accentB,
                letterSpacing: 1.4,
              }}
            >
              {duration}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  )
}

// Four HUD corner brackets — two magenta on the top, two cyan on the bottom.
// Each is a 14×14 view with two 2px lines hugging the inner edges.
function HudBrackets() {
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -1,
          left: -1,
          width: 14,
          height: 14,
        }}
      >
        <View style={{ width: 14, height: 2, backgroundColor: '#E040FB' }} />
        <View style={{ width: 2, height: 12, backgroundColor: '#E040FB' }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -1,
          right: -1,
          width: 14,
          height: 14,
          alignItems: 'flex-end',
        }}
      >
        <View style={{ width: 14, height: 2, backgroundColor: '#E040FB' }} />
        <View style={{ width: 2, height: 12, backgroundColor: '#E040FB' }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -1,
          left: -1,
          width: 14,
          height: 14,
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ width: 2, height: 12, backgroundColor: '#40E0D0' }} />
        <View style={{ width: 14, height: 2, backgroundColor: '#40E0D0' }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: 14,
          height: 14,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ width: 2, height: 12, backgroundColor: '#40E0D0' }} />
        <View style={{ width: 14, height: 2, backgroundColor: '#40E0D0' }} />
      </View>
    </>
  )
}

function NoteGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 32, height: 32 }}>
      <View
        style={{
          position: 'absolute',
          right: 8,
          top: 0,
          width: 3,
          height: 24,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 8,
          top: 0,
          width: 10,
          height: 4,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 14,
          height: 10,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  )
}
