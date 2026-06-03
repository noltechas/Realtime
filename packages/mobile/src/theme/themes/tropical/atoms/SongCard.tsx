import React from 'react'
import { Pressable, Text, View, Image, type ViewStyle, type TextStyle } from 'react-native'
import { TROPICAL_MOBILE } from '../../../tokens'
import { hashKey } from '../../../helpers'
import type { SongCardProps } from '../../../types'
import { INK, PANEL, WOOD, SUN, LAGOON, SUNSET, HIBISCUS, PALM, SKY, BAMBOO_DK, press, BambooFrame } from './_tropical'

// Tropical song card — a bamboo-framed beach postcard. The album art is the
// scene; a carved wooden signpost tag pins the duration to the art, a little
// sun "postmark" stamps the release year, and the title rides a spot-colored
// banner at the bottom in Pacifico (each card gets its own stable spot color so
// a grid reads like a rack of holiday postcards). Gentle sink on press.
const t = TROPICAL_MOBILE

// Per-card spot colors — bright island hues that all take white Pacifico text.
const CARD_COLORS = [LAGOON, SUNSET, HIBISCUS, SUN, PALM, SKY]

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SongCard({ track, onPress }: SongCardProps) {
  const duration = formatDuration(track.duration_ms)
  const h = hashKey(track.track_id)
  const color = CARD_COLORS[h % CARD_COLORS.length]
  const titleColor = color === SUN ? INK : PANEL

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, aspectRatio: 0.74 }, pressed ? press() : null]}>
      <BambooFrame radius={16} pole={6} fill={PANEL} shadow={6} style={{ flex: 1 }}>
        {/* art well */}
        <View style={artWellStyle}>
          {track.art_url ? (
            <Image source={{ uri: track.art_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ width: '100%', height: '100%', backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <NoteGlyph color={PANEL} />
            </View>
          )}

          {/* carved wooden signpost — duration pinned top-right */}
          {duration ? (
            <View style={durTagStyle}>
              <View style={durHoleStyle} />
              <Text style={durTextStyle}>{duration}</Text>
            </View>
          ) : null}
        </View>

        {/* spot-color title banner */}
        <View style={[bannerStyle, { backgroundColor: color }]}>
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.16)' }} />
          <Text style={[titleStyle, { color: titleColor }]} numberOfLines={1}>
            {track.name}
          </Text>
          <Text style={[artistStyle, { color: titleColor === INK ? 'rgba(18,58,51,0.7)' : 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
      </BambooFrame>
    </Pressable>
  )
}

function NoteGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 40, height: 40 }}>
      <View style={{ position: 'absolute', right: 11, top: 0, width: 4, height: 31, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: 11, top: 0, width: 12, height: 6, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, bottom: 0, width: 17, height: 13, borderRadius: 999, backgroundColor: color }} />
    </View>
  )
}

const artWellStyle: ViewStyle = {
  flex: 1,
  overflow: 'hidden',
}

const bannerStyle: ViewStyle = {
  paddingHorizontal: 10,
  paddingTop: 7,
  paddingBottom: 9,
  overflow: 'hidden',
}

const titleStyle: TextStyle = {
  fontFamily: t.fontDisplay, // Florida Vibes (runs small — sized up)
  fontSize: 23,
  lineHeight: 28,
  letterSpacing: 0.2,
}

const artistStyle: TextStyle = {
  fontFamily: t.fontBody,
  fontWeight: '700',
  fontSize: 10.5,
  marginTop: 1,
  textTransform: 'uppercase',
  letterSpacing: 0.3,
}

// Wooden signpost duration tag, top-right of the art.
const durTagStyle: ViewStyle = {
  position: 'absolute',
  top: 7,
  right: 7,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  backgroundColor: WOOD,
  borderWidth: 1.5,
  borderColor: BAMBOO_DK,
  borderRadius: 6,
  paddingHorizontal: 7,
  paddingVertical: 3,
}

const durHoleStyle: ViewStyle = {
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: 'rgba(255,255,255,0.5)',
}

const durTextStyle: TextStyle = {
  color: '#FFF1D6',
  fontFamily: t.fontBody,
  fontWeight: '700',
  fontSize: 11,
}
