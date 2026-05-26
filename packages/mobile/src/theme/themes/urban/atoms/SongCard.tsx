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

// Urban SongCard — parallelogram skew (skewX -8deg) on the outer card with a
// chunky toxic-green geometric "drop shadow" via right + bottom borders. All
// inner content (art image, track name, artist, duration) is counter-skewed
// with skewX +8deg so it reads upright; the art uses an extra scale(1.25)
// because the un-skewed image otherwise leaves diamond gaps at the corners of
// the skewed parent.
//
// Press feedback is a hard 4px Y-translate (push-down) — no slide on glow
// themes, no spring scale — to match the gritty, mechanical urban feel.
export function UrbanSongCard({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        marginBottom: 8,
        transform: [{ translateY: pressed ? 4 : 0 }],
      })}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.creamDark,
          borderWidth: 2,
          borderColor: tokens.dimBorder,
          borderRightWidth: 6,
          borderBottomWidth: 6,
          borderRightColor: tokens.accentA,
          borderBottomColor: tokens.accentA,
          transform: [{ skewX: '-8deg' }],
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            overflow: 'hidden',
            borderBottomWidth: 2,
            borderBottomColor: tokens.dimBorder,
          }}
        >
          {track.art_url ? (
            <Image
              source={{ uri: track.art_url }}
              style={{
                width: '100%',
                height: '100%',
                transform: [{ skewX: '8deg' }, { scale: 1.25 }],
              }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ transform: [{ skewX: '8deg' }] }}>
                <NoteGlyph color={tokens.muted} />
              </View>
            </View>
          )}
        </View>
        <View style={{ padding: 10, backgroundColor: tokens.creamDark }}>
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '900',
              fontSize: 14,
              color: tokens.black,
              letterSpacing: 1,
              textTransform: 'uppercase',
              transform: [{ skewX: '8deg' }],
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
              transform: [{ skewX: '8deg' }],
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
                transform: [{ skewX: '8deg' }],
              }}
            >
              {duration}
            </Text>
          ) : null}
        </View>
      </View>
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
