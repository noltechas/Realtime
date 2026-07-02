import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import {
  Plaque,
  CornerBrackets,
  GaugeDial,
  IRON_WELL,
  BRASS,
  AMBER,
  PARCH,
  PARCH_DIM,
  HAIRLINE_SOFT,
} from './_steam'
import type { SongCardProps } from '../../../types'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Steampunk SongCard — a mounted specimen plate from a Victorian collection:
//   • Iron instrument plate with hairline frame + corner screws.
//   • The album art is SQUARE and full-color (never sepia-washed — the music
//     is the specimen; the machine only holds it), mounted under four brass
//     corner brackets with a whisper of glass light across the top.
//   • Title in engraved Cinzel parchment, artist in IM Fell English below.
//   • The footer is an engraved rule with a tiny duration gauge — the needle
//     sits where the song's length falls on a six-minute dial.
// Custom equality: identity is fixed by track_id. The parent passes a fresh
// onPress closure each render — comparing it would defeat memoization and
// bring back the FlatList-filter freeze.
export const SteampunkSongCard = React.memo(
  SteampunkSongCardImpl,
  (prev, next) => prev.track.track_id === next.track.track_id,
)

function SteampunkSongCardImpl({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)
  // Needle position: 0..6 minutes mapped across the dial.
  const gaugeValue = Math.min(1, (track.duration_ms ?? 0) / 360000)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flex: 1, marginBottom: 14 },
        pressed ? { transform: [{ scale: 0.98 }], opacity: 0.92 } : null,
      ]}
    >
      <Plaque style={{ flex: 1, padding: 10 }} screws seed={track.track_id} radius={12}>
        {/* Mounted art */}
        <View style={{ width: '100%', aspectRatio: 1, marginTop: 4 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 6,
              overflow: 'hidden',
              backgroundColor: IRON_WELL,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.6)',
            }}
          >
            {track.art_url ? (
              <Image source={{ uri: track.art_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <NoteGlyph color={BRASS} />
              </View>
            )}
            {/* glass light across the top of the frame */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,246,224,0.12)', 'rgba(255,246,224,0)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '28%' }}
            />
          </View>
          <CornerBrackets length={13} thickness={2} inset={-2} />
        </View>

        {/* Engraved title + attribution */}
        <Text
          style={{
            marginTop: 11,
            fontFamily: tokens.fontDisplay,
            fontSize: 13,
            lineHeight: 18,
            color: PARCH,
            letterSpacing: 0.6,
          }}
          numberOfLines={2}
        >
          {track.name}
        </Text>
        <Text
          style={{
            marginTop: 3,
            fontFamily: tokens.fontBody,
            fontSize: 12,
            color: PARCH_DIM,
            letterSpacing: 0.2,
          }}
          numberOfLines={1}
        >
          {track.artist}
        </Text>

        {/* Footer: engraved rule + duration gauge */}
        {duration ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 10 }}>
            <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: HAIRLINE_SOFT }} />
            <GaugeDial size={15} value={gaugeValue} />
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontSize: 10,
                color: AMBER,
                letterSpacing: 1.4,
                includeFontPadding: false,
              }}
            >
              {duration}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 'auto' }} />
        )}
      </Plaque>
    </Pressable>
  )
}

function NoteGlyph({ color }: { color: string }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Path
        d="M 22 4 L 22 22 A 4 4 0 1 1 18 18 L 18 8 L 12 10 L 12 26 A 4 4 0 1 1 8 22 L 8 6 Z"
        fill={color}
        opacity={0.7}
      />
    </Svg>
  )
}
