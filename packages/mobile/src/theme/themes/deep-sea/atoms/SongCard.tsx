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

// Deep-sea song card — rounded translucent navy panel with a cyan border
// (heavier on the bottom edge to imply sinking weight) and a circular art
// well lit by a purple inner glow. Title text gets a dark shadow so it
// reads cleanly against the busy caustics backdrop the screen renders
// behind us. Press scales down slightly (no slide — dark theme).
export function SongCard({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: 'rgba(6,18,44,0.85)',
        borderWidth: 1,
        borderColor: 'rgba(0,255,200,0.5)',
        borderBottomWidth: 3,
        borderRadius: 16,
        padding: 10,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <View
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(0,255,200,0.2)',
          backgroundColor: 'rgba(180,77,255,0.1)',
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
            <NoteGlyph color={tokens.accentB} />
          </View>
        )}
      </View>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '800',
          fontSize: 14,
          color: '#FFFFFF',
          textShadowColor: 'rgba(0,0,0,0.8)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }}
        numberOfLines={2}
      >
        {track.name}
      </Text>
      <Text
        style={{
          fontFamily: tokens.fontBody,
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
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
            color: tokens.accentA,
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
