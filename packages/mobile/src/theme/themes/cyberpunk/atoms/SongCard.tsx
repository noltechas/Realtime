import React from 'react'
import { View, Text, Image, Pressable, Animated } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { SongCardProps } from '../../../types'
import { CRTOverlay, GlitchBars, useGlitch, jitterStyle } from './Crt'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Cheap stable seed from the track id so each card's TV-snow field is
// different but consistent across re-renders.
function seedFrom(id: string | undefined): number {
  let h = 2166136261
  const s = id || 'x'
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) || 1
}

// Cyberpunk song card — sharp-cornered void-black panel with a 1px neon
// accent border, soft outer glow, and a thumbnail well bordered in the same
// dim accent. The art well is filmed as an early-2000s CRT screen: fine
// scanlines, drifting TV-snow, a rolling refresh band, and rare RGB "tear"
// glitch bursts that also shake the well. Title prints in the SD-glitch
// display caps; artist in the Glitch body face. Press dims (no slide).
export function CyberpunkSongCard({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)
  const glitch = useGlitch({ minMs: 6000, maxMs: 17000 })
  const seed = seedFrom(track.track_id)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: tokens.white,
        borderWidth: tokens.cardBorderWidth,
        borderColor: tokens.dimBorder,
        borderRadius: 0,
        padding: 10,
        shadowColor: tokens.accentGlowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Animated.View
        style={[
          {
            width: '100%',
            aspectRatio: 1,
            borderRadius: 0,
            borderWidth: 1,
            borderColor: tokens.dimBorder,
            backgroundColor: tokens.creamDark,
            overflow: 'hidden',
            marginBottom: 8,
          },
          jitterStyle(glitch, 3),
        ]}
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
            <NoteGlyph color={tokens.muted} />
          </View>
        )}
        <CRTOverlay coverage={240} snowCount={42} seed={seed} tint={tokens.accentA} />
        <GlitchBars g={glitch} />
      </Animated.View>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '900',
          // SD Glitch reads small for its px — bumped up vs other themes.
          fontSize: 17,
          lineHeight: 19,
          color: tokens.black,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
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
          marginTop: 2,
        }}
        numberOfLines={1}
      >
        {track.artist}
      </Text>
      {duration ? (
        <Text
          style={{
            // Glitch (body) face, not SD Glitch — the SD Glitch display font
            // has no digits or ':' glyph, so a duration set in it would render
            // entirely in the system fallback.
            fontFamily: tokens.fontBody,
            fontWeight: '700',
            fontSize: 11,
            color: tokens.faint,
            marginTop: 4,
            letterSpacing: 1,
          }}
        >
          {duration}
        </Text>
      ) : null}
    </Pressable>
  )
}

function NoteGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 28, height: 28 }}>
      <View
        style={{
          position: 'absolute',
          right: 8,
          top: 0,
          width: 3,
          height: 22,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 8,
          top: 0,
          width: 8,
          height: 4,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 12,
          height: 9,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  )
}
