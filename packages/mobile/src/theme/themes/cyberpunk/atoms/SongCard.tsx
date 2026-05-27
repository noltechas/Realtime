import React from 'react'
import { View, Text, Image, Pressable } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { SongCardProps } from '../../../types'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Cyberpunk song card — sharp-cornered void-black panel with a 1px neon
// accent border, soft outer glow, and a thumbnail well bordered in the same
// dim accent. Title prints in monospace caps + neon foreground; artist falls
// back to muted green. Press dims (no slide) — dark themes never slide into
// an offset shadow.
export function CyberpunkSongCard({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)

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
      <View
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: 0,
          borderWidth: 1,
          borderColor: tokens.dimBorder,
          backgroundColor: tokens.creamDark,
          overflow: 'hidden',
          marginBottom: 8,
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
            <NoteGlyph color={tokens.muted} />
          </View>
        )}
      </View>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '900',
          fontSize: 14,
          color: tokens.black,
          letterSpacing: 1,
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
            fontFamily: tokens.fontDisplay,
            fontWeight: '700',
            fontSize: 11,
            color: tokens.faint,
            marginTop: 4,
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
