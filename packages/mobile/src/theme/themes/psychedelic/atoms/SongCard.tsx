import React, { useRef } from 'react'
import { View, Text, Image, Pressable, Animated } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useOscillator } from '../_shared'
import type { SongCardProps } from '../../../types'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Psychedelic SongCard — plain rounded rectangle with a hot-pink border + neon
// pink glow + continuous scale breath. (Per request: scrap the wavy blob, just
// use a clean rounded rectangle.) The card stays on-theme via the deep-purple
// translucent fill, the pink rim, and the soft glow halo.
export function PsychedelicSongCard({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)
  const seed = track.track_id || track.name || track.artist
  const seedHash = hashKey(seed)

  // Continuous scale-only breath. Wide per-card period spread (3200-6400ms)
  // seeded by the track id so adjacent cards in the grid pulse out of sync.
  const breath = useOscillator(3200 + (seedHash % 17) * 200)
  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1.018],
  })

  // Press ripple — lime circle expanding from card center.
  const ripple = useRef(new Animated.Value(0)).current
  const triggerRipple = () => {
    ripple.setValue(0)
    Animated.timing(ripple, {
      toValue: 1,
      duration: 460,
      useNativeDriver: true,
    }).start()
  }
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] })
  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.55, 0],
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
          backgroundColor: 'rgba(42,20,80,0.78)',
          borderRadius: 22,
          borderWidth: 1.5,
          borderColor: 'rgba(255,45,149,0.55)',
          padding: 12,
          transform: [{ scale: breathScale }],
          shadowColor: tokens.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55,
          shadowRadius: 14,
        }}
      >
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            overflow: 'hidden',
            backgroundColor: tokens.appBg,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,140,45,0.4)',
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

          {/* Press ripple over the art. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 120,
              height: 120,
              marginLeft: -60,
              marginTop: -60,
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            }}
          >
            <Svg width={120} height={120} viewBox="0 0 120 120">
              <Circle cx={60} cy={60} r={58} fill="#b6ff2d" fillOpacity={0.28} />
            </Svg>
          </Animated.View>
        </View>

        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 16,
            color: tokens.accentA,
            marginTop: 10,
            textShadowColor: 'rgba(255,45,149,0.55)',
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
            fontSize: 13,
            color: tokens.muted,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {track.artist}
        </Text>
        {duration ? (
          <Text
            style={{
              fontFamily: tokens.fontBody,
              fontSize: 11,
              color: tokens.accentC,
              marginTop: 4,
              opacity: 0.85,
            }}
          >
            {duration}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
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
