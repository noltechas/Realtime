import React from 'react'
import { Pressable, Text, View, Image } from 'react-native'
import { NEO_BRUTAL_MOBILE } from '../../../tokens'
import type { SongCardProps } from '../../../types'

// Neo-brutal song card. Lifted from the default branch of SongsScreen.
// Two-column grid card with a square art well, hard offset shadow, and a
// classic neo-brutal slide-into-shadow press feedback.
const t = NEO_BRUTAL_MOBILE

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SongCard({ track, onPress }: SongCardProps) {
  const duration = formatDuration(track.duration_ms)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        maxWidth: '50%',
        backgroundColor: t.white,
        borderWidth: t.cardBorderWidth,
        borderColor: t.black,
        borderRadius: t.radius,
        padding: 10,
        shadowColor: t.accentGlowColor,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
        ...(pressed
          ? {
              transform: [{ translateX: 2 }, { translateY: 2 }],
              shadowOpacity: 0,
              elevation: 0,
            }
          : null),
      })}
    >
      <View
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: t.radiusSmall,
          borderWidth: 2,
          borderColor: t.black,
          backgroundColor: t.creamDark,
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
            <NoteGlyph color={t.muted} />
          </View>
        )}
      </View>
      <Text
        style={{
          fontFamily: t.fontDisplay,
          fontWeight: '900',
          fontSize: 14,
          color: t.black,
          letterSpacing: -0.3,
        }}
        numberOfLines={2}
      >
        {track.name}
      </Text>
      <Text
        style={{
          fontFamily: t.fontBody,
          fontSize: 12,
          color: t.muted,
          marginTop: 2,
        }}
        numberOfLines={1}
      >
        {track.artist}
      </Text>
      {duration ? (
        <Text
          style={{
            fontFamily: t.fontDisplay,
            fontWeight: '700',
            fontSize: 11,
            color: t.faint,
            marginTop: 4,
          }}
        >
          {duration}
        </Text>
      ) : null}
    </Pressable>
  )
}

// Hand-built music note placeholder for missing artwork — pure View primitives.
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
