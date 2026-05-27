import React from 'react'
import { View, Text, Pressable, Image } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import { hashKey, sketchAngle } from '../../../helpers'
import type { SongCardProps } from '../../../types'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Sketch song card — a Polaroid/post-it pinned to the page. Each card gets
// hash-based crease lines and a small per-track rotation so the grid reads as
// a board of hand-placed cards rather than a uniform 2-up list. The art is
// matted in cream so the album cover sits in a frame.
export function SongCard({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)

  const str = track.name || track.artist || ''
  const hash = hashKey(str)
  const angle = sketchAngle(str)

  // Hash-based crease positions so each card has a unique paper texture
  const creaseTop1 = 20 + (hash % 7) * 8   // 20–68%
  const creaseTop2 = 55 + (hash % 5) * 6   // 55–79%
  const creaseAngle1 = ((hash % 3) - 1) * 0.6
  const creaseAngle2 = ((hash % 4) - 2) * 0.5

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        marginBottom: 12,
        transform: [
          { rotate: `${angle}deg` },
          { scale: pressed ? 0.96 : 1 },
        ],
      })}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#FDFBF7',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.1)',
          padding: 8,
          paddingBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 5,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 5,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Paper crease lines — hash-positioned so each card looks slightly
            worn in a different spot. */}
        <View
          style={{
            position: 'absolute',
            left: '8%',
            right: '5%',
            top: `${creaseTop1}%`,
            height: 1,
            backgroundColor: 'rgba(0,0,0,0.055)',
            transform: [{ rotate: `${creaseAngle1}deg` }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '3%',
            right: '12%',
            top: `${creaseTop2}%`,
            height: 1,
            backgroundColor: 'rgba(0,0,0,0.04)',
            transform: [{ rotate: `${creaseAngle2}deg` }],
          }}
        />
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            backgroundColor: tokens.creamDark,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.08)',
            overflow: 'hidden',
            borderTopLeftRadius: 1,
            borderTopRightRadius: 3,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 1,
          }}
        >
          {track.art_url ? (
            <Image
              source={{ uri: track.art_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <NoteGlyph color={tokens.muted} />
            </View>
          )}
        </View>
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontWeight: '700',
            fontSize: 15,
            color: tokens.black,
            marginTop: 12,
            textAlign: 'center',
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
            textAlign: 'center',
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
              textAlign: 'center',
            }}
          >
            {duration}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

function NoteGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 28, height: 28 }}>
      <View style={{ position: 'absolute', right: 8, top: 0, width: 3, height: 22, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: 8, top: 0, width: 8, height: 4, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, bottom: 0, width: 12, height: 9, borderRadius: 999, backgroundColor: color }} />
    </View>
  )
}
