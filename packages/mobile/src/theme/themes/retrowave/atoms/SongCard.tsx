import React, { useRef } from 'react'
import { View, Text, Image, Pressable, Animated, StyleSheet } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop, Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import { ScanlineOverlay, NeonText } from '../primitives'
import type { SongCardProps } from '../../../types'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Retrowave SongCard — minimal CRT-monitor frame. The card is essentially a
// neon viewport showing the album art as if it were a VHS still:
//
//   ┌──────────────────────────┐
//   │   ┌──────────────────┐   │ ← thin cyan-rimmed CRT screen with the
//   │   │                  │   │   album art glowing inside, scanlines,
//   │   │   ALBUM ART      │   │   four corner registration marks, and a
//   │   │                  │   │   slow vertical refresh sweep
//   │   └──────────────────┘   │
//   │  TRACK TITLE             │ ← chromatic-aberration neon title
//   │  ARTIST · 3:42           │ ← italic body line w/ diamond divider
//   └──────────────────────────┘
//
// Frame border is the only chrome — a 1.5px hot-pink rim with a dual
// pink/cyan glow + a single top-edge cyan hairline that reads as a screen
// bezel. No ventilation ribs, no LED, no title plate, no footer — those
// were the noise that made the previous version feel busy.
export const RetrowaveSongCard = React.memo(
  RetrowaveSongCardImpl,
  (prev, next) => prev.track.track_id === next.track.track_id,
)

function RetrowaveSongCardImpl({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)
  const seed = track.track_id || track.name || track.artist
  const seedHash = hashKey(seed)

  // CRT refresh line — slowly creeps down the screen
  const refresh = useLinearLoop(4400 + (seedHash % 9) * 220)

  // Press flare
  const ripple = useRef(new Animated.Value(0)).current
  const triggerRipple = () => {
    ripple.setValue(0)
    Animated.timing(ripple, {
      toValue: 1,
      duration: 520,
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
          backgroundColor: '#160830',
          borderWidth: 1.5,
          borderColor: '#FF2D95',
          padding: 12,
          overflow: 'hidden',
          shadowColor: '#FF2D95',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 12,
        }}
      >
        {/* Single cyan hairline along the top — "screen bezel" accent */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1.5,
            backgroundColor: '#00F0FF',
            opacity: 0.75,
          }}
        />

        {/* CRT screen with album art */}
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            backgroundColor: '#08021A',
            borderWidth: 1.5,
            borderColor: '#00F0FF',
            overflow: 'hidden',
            shadowColor: '#00F0FF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.95,
            shadowRadius: 8,
            marginBottom: 10,
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
                backgroundColor: '#28104E',
              }}
            >
              <NoteGlyph color="#FF2D95" />
            </View>
          )}

          {/* CRT tint */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(255,45,149,0.08)' },
            ]}
          />

          {/* Scanlines */}
          <ScanlineOverlay rowGap={3} opacity={0.18} color="#000000" />

          {/* CRT refresh sweep */}
          <CrtRefreshSweep driver={refresh} />

          {/* Corner registration marks */}
          <RegMark pos="tl" />
          <RegMark pos="tr" />
          <RegMark pos="bl" />
          <RegMark pos="br" />

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
                <RadialGradient id="rwSongFlare" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
                  <Stop offset="55%" stopColor="#FF2D95" stopOpacity={0.55} />
                  <Stop offset="100%" stopColor="#00F0FF" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={70} cy={70} r={68} fill="url(#rwSongFlare)" />
            </Svg>
          </Animated.View>
        </View>

        {/* Title — chromatic aberration neon */}
        <View style={{ alignItems: 'center' }}>
          <NeonText
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: 14,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              textAlign: 'center',
            } as any}
            fringe={1.1}
            pinkColor="#FF2D95"
            cyanColor="#00F0FF"
            centerColor="#FFFFFF"
          >
            {track.name}
          </NeonText>
        </View>

        {/* Artist + duration on one ticker line */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 4,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontBody,
              fontSize: 11,
              color: '#B5A0E0',
              letterSpacing: 1.3,
              textTransform: 'uppercase',
              fontStyle: 'italic',
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {track.artist}
          </Text>
          {duration ? (
            <>
              <View
                style={{
                  width: 4,
                  height: 4,
                  backgroundColor: '#00F0FF',
                  transform: [{ rotate: '45deg' }],
                  shadowColor: '#00F0FF',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 3,
                }}
              />
              <Text
                style={{
                  fontFamily: tokens.fontBody,
                  fontSize: 11,
                  color: '#00F0FF',
                  letterSpacing: 1.5,
                  fontStyle: 'italic',
                }}
              >
                {duration}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

// CRT refresh sweep — a faint horizontal band creeping down the screen.
function CrtRefreshSweep({ driver }: { driver: Animated.Value }) {
  const translateY = driver.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '110%'],
  })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: '12%',
        transform: [{ translateY }],
        opacity: 0.5,
        backgroundColor: 'rgba(255,255,255,0.12)',
      }}
    />
  )
}

// Cyan L-bracket corner registration marks on the CRT screen.
function RegMark({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const style: any = { position: 'absolute', width: 10, height: 10 }
  const stroke = '#00F0FF'
  const sw = 1.2
  if (pos === 'tl') {
    style.top = 4
    style.left = 4
  } else if (pos === 'tr') {
    style.top = 4
    style.right = 4
  } else if (pos === 'bl') {
    style.bottom = 4
    style.left = 4
  } else {
    style.bottom = 4
    style.right = 4
  }
  return (
    <View pointerEvents="none" style={style}>
      <Svg width={10} height={10} viewBox="0 0 10 10">
        {pos === 'tl' && <Path d="M 0 5 L 0 0 L 5 0" stroke={stroke} strokeWidth={sw} fill="none" />}
        {pos === 'tr' && <Path d="M 10 5 L 10 0 L 5 0" stroke={stroke} strokeWidth={sw} fill="none" />}
        {pos === 'bl' && <Path d="M 0 5 L 0 10 L 5 10" stroke={stroke} strokeWidth={sw} fill="none" />}
        {pos === 'br' && <Path d="M 10 5 L 10 10 L 5 10" stroke={stroke} strokeWidth={sw} fill="none" />}
      </Svg>
    </View>
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
