import React, { useRef } from 'react'
import { View, Text, Image, Pressable, Animated, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, RadialGradient, Stop, Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import { Gear, Rivet } from '../Gear'
import type { SongCardProps } from '../../../types'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Steampunk SongCard — a riveted brass plaque mounted on dark mahogany:
//   • Mahogany card body with a 2px brass rim and four corner rivets.
//   • A large rotating brass gear behind the album art — the art sits inside
//     the gear's hub, so it reads as the gear's escapement window. A smaller
//     copper gear meshes with it from the lower-left, counter-rotating.
//   • Engraved Cinzel title plaque with amber gas-lamp glow on the title.
//   • Bottom-right: a small pressure-gauge dial showing the duration, with
//     a swinging needle on a 4s oscillator.
//   • Press triggers an amber gas-flare from the album art center.
// Custom equality: identity is fixed by track_id. The parent screen passes a
// fresh onPress closure each render — comparing it would defeat memoization
// and bring back the FlatList-filter freeze. The closure's *behavior* (open
// the wizard for this track) is the same across renders, so it's safe to
// treat as equal.
export const SteampunkSongCard = React.memo(
  SteampunkSongCardImpl,
  (prev, next) => prev.track.track_id === next.track.track_id,
)

function SteampunkSongCardImpl({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)
  const seed = track.track_id || track.name || track.artist
  const seedHash = hashKey(seed)

  // Per-card random rivet counts for both gears. Range 3–8 — fewer than 3
  // looks unfinished, more than 8 crowds the hub. Both gears get an
  // independently-seeded count so they almost never match on the same card.
  const MIN_RIVETS = 3
  const MAX_RIVETS = 8
  const mainRivets = MIN_RIVETS + (seedHash % (MAX_RIVETS - MIN_RIVETS + 1))
  const subRivets = MIN_RIVETS + ((seedHash >> 7) % (MAX_RIVETS - MIN_RIVETS + 1))

  // Main gear — slow rotation. Period varies by seed.
  const gearMain = useLinearLoop(14000 + (seedHash % 19) * 280)
  const gearMainRot = gearMain.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Meshed counter-rotating smaller gear.
  const gearSub = useLinearLoop(9000 + (seedHash % 11) * 240)
  const gearSubRot = gearSub.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  })

  // Gauge needle — swings within a 60° arc.
  const needle = useOscillator(4200 + (seedHash % 7) * 180)
  const needleRot = needle.interpolate({
    inputRange: [0, 1],
    outputRange: ['-30deg', '30deg'],
  })

  // Pressure-gauge filament glow.
  const lamp = useOscillator(2600 + (seedHash % 5) * 180)
  const lampOpacity = lamp.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })

  // Press flare.
  const ripple = useRef(new Animated.Value(0)).current
  const triggerRipple = () => {
    ripple.setValue(0)
    Animated.timing(ripple, {
      toValue: 1,
      duration: 560,
      useNativeDriver: true,
    }).start()
  }
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.8] })
  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.85, 0],
  })

  return (
    <Pressable
      onPress={() => {
        triggerRipple()
        onPress()
      }}
      style={{ flex: 1, marginBottom: 14 }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#2A1A0E',
          borderRadius: 8,
          borderWidth: 2,
          borderColor: '#B8762D',
          padding: 14,
          paddingTop: 16,
          overflow: 'hidden',
          shadowColor: '#E8A93B',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 10,
        }}
      >
        {/* Inner engraved bevel — gives the plate dimensional depth */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              margin: 4,
              borderRadius: 5,
              borderWidth: 1,
              borderColor: 'rgba(232,169,59,0.25)',
            },
          ]}
        />

        {/* Warm interior tint — like the plate is lit by a gas-lamp from below */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(232,169,59,0.05)',
            'rgba(122,77,26,0.10)',
            'rgba(58,30,8,0.20)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Corner rivets */}
        <View style={{ position: 'absolute', top: 5, left: 5 }}><Rivet size={10} /></View>
        <View style={{ position: 'absolute', top: 5, right: 5 }}><Rivet size={10} /></View>
        <View style={{ position: 'absolute', bottom: 5, left: 5 }}><Rivet size={10} /></View>
        <View style={{ position: 'absolute', bottom: 5, right: 5 }}><Rivet size={10} /></View>

        {/* Clockwork art frame */}
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
          {/* Large rotating gear behind everything */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: '108%',
              aspectRatio: 1,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: gearMainRot }],
            }}
          >
            <GearFill seed={seedHash} rivets={mainRivets} />
          </Animated.View>

          {/* Smaller meshed counter-rotating gear at the bottom-left */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: -8,
              left: -6,
              width: 44,
              height: 44,
              transform: [{ rotate: gearSubRot }],
            }}
          >
            <Gear
              size={44}
              teeth={10}
              rivets={subRivets}
              bodyColor="#C97D3E"
              edgeColor="#6E3A14"
              hubColor="#3A1E0A"
              highlightColor="#F0A058"
            />
          </Animated.View>

          {/* Inner art window — circular brass-rimmed porthole */}
          <View
            style={{
              width: '64%',
              aspectRatio: 1,
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: '#1A0E04',
              borderWidth: 2.5,
              borderColor: '#B8762D',
              shadowColor: '#E8A93B',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.55,
              shadowRadius: 8,
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
                  backgroundColor: '#3E2810',
                }}
              >
                <NoteGlyph color={tokens.vividYellow} />
              </View>
            )}

            {/* Sepia tint over the album art so it matches the world */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(232,169,59,0.10)' },
              ]}
            />

            {/* Inner highlight — top reflection on the porthole glass */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(255,235,180,0.28)',
                  'rgba(255,235,180,0)',
                ]}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 0.45 }}
                style={{ width: '100%', height: '50%' }}
              />
            </View>

            {/* Press flare */}
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
                  <RadialGradient id="songFlare" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#FFE4A0" stopOpacity={0.9} />
                    <Stop offset="55%" stopColor="#E8A93B" stopOpacity={0.45} />
                    <Stop offset="100%" stopColor="#E8A93B" stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={70} cy={70} r={68} fill="url(#songFlare)" />
              </Svg>
            </Animated.View>
          </View>

          {/* Inner porthole bolt heads — 4 tiny rivets at compass points */}
          <View style={{ position: 'absolute', top: '15%', left: '50%', marginLeft: -3 }}>
            <Rivet size={6} />
          </View>
          <View style={{ position: 'absolute', bottom: '15%', left: '50%', marginLeft: -3 }}>
            <Rivet size={6} />
          </View>
          <View style={{ position: 'absolute', top: '50%', left: '15%', marginTop: -3 }}>
            <Rivet size={6} />
          </View>
          <View style={{ position: 'absolute', top: '50%', right: '15%', marginTop: -3 }}>
            <Rivet size={6} />
          </View>
        </View>

        {/* Title plaque */}
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 13,
            color: tokens.vividYellow,
            textAlign: 'center',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            textShadowColor: 'rgba(232,169,59,0.7)',
            textShadowRadius: 5,
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
            color: '#C9A878',
            marginTop: 4,
            textAlign: 'center',
            letterSpacing: 0.6,
            fontStyle: 'italic',
          }}
          numberOfLines={1}
        >
          {track.artist}
        </Text>

        {/* Duration pressure-gauge */}
        {duration ? (
          <View
            style={{
              marginTop: 10,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: '#B8762D',
                backgroundColor: '#1A0E04',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 2,
                  height: 9,
                  backgroundColor: '#E8A93B',
                  bottom: 9,
                  left: 9,
                  borderRadius: 1,
                  transformOrigin: 'bottom center',
                  transform: [{ rotate: needleRot }],
                  shadowColor: '#E8A93B',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 3,
                  opacity: lampOpacity,
                } as any}
              />
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#B8762D',
                }}
              />
            </View>
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontSize: 11,
                color: '#E8A93B',
                letterSpacing: 1.4,
              }}
            >
              {duration}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

// Big SVG gear that fills the area behind the album-art porthole. Caller
// passes a deterministic rivet count so each song's gear plate reads as
// distinct hardware.
function GearFill({ seed, rivets }: { seed: number; rivets: number }) {
  const teeth = 16 + (seed % 5)
  return (
    <Gear
      size={200}
      teeth={teeth}
      rivets={rivets}
      bodyColor="#B8762D"
      edgeColor="#5C3A12"
      hubColor="#2A1808"
      highlightColor="#E8C078"
      opacity={0.65}
    />
  )
}

function NoteGlyph({ color }: { color: string }) {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32">
      <Path
        d="M 22 4 L 22 22 A 4 4 0 1 1 18 18 L 18 8 L 12 10 L 12 26 A 4 4 0 1 1 8 22 L 8 6 Z"
        fill={color}
      />
    </Svg>
  )
}
