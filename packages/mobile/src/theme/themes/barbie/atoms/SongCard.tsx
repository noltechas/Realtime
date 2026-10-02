import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path } from 'react-native-svg'
import type { SongCardProps } from '../../../types'
import { hashKey } from '../../../helpers'
import { BUBBLE, Glint, MUTED, PINK, Press, SUN, TwinkleShape, WHITE, body, deckleRectPath, display, useMeasured } from './_barbie'

// Barbie song card: a SNAPSHOT from Barbie Land. The album art is printed on a
// white deckle-edged photo (the scalloped border of a vintage print), with the
// song written in the wide bottom margin the way you'd caption a holiday
// photo. Each snapshot sits at its own slight angle, a few have a sticker on
// the corner, and the sun's glint crosses the print with everything else.
//
// Touch: it squishes like the rest of the town.

const PAD = 8
const DECKLE = 4.2
const CAPTION = 60

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`
}

const HEART = 'M 0 -4 C -3 -11 -15 -10 -14 0 C -13 7 -4 11 0 15 C 4 11 13 7 14 0 C 15 -10 3 -11 0 -4 Z'

export function SongCard({ track, onPress }: SongCardProps) {
  const [size, onLayout] = useMeasured()
  const h = hashKey(track.track_id)
  const tilt = ((h % 100) / 100 - 0.5) * 3.2
  const sticker = h % 5 === 0 ? 'sun' : h % 5 === 2 ? 'heart' : null
  const duration = formatDuration(track.duration_ms)
  const w = size?.w ?? 0
  const art = w - PAD * 2
  const H = PAD + art + CAPTION

  return (
    <Press onPress={onPress} outerStyle={{ flex: 1 }} style={{ flex: 1 }}>
      <View onLayout={onLayout} style={{ width: '100%', transform: [{ rotate: `${tilt.toFixed(2)}deg` }] }}>
        {w ? (
          <View style={{ width: w, height: H }}>
            <Svg width={w} height={H + 6} style={{ position: 'absolute', left: 0, top: 0 }}>
              {/* a soft pink shadow under the print, then the print */}
              <Path d={deckleRectPath(w - 2, H - 2, DECKLE, 2, 5)} fill="rgba(176,17,94,0.16)" />
              <Path d={deckleRectPath(w, H, DECKLE)} fill={WHITE} />
            </Svg>
            <View style={{ position: 'absolute', left: PAD, top: PAD, width: art, height: art, borderRadius: 2, overflow: 'hidden', backgroundColor: '#FFE3F0' }}>
              {track.art_url ? (
                <Image source={{ uri: track.art_url }} style={StyleSheet.absoluteFill} />
              ) : (
                <LinearGradient colors={[BUBBLE, PINK]} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="musical-notes" size={34} color={WHITE} />
                </LinearGradient>
              )}
              {/* the print's sheen, warm from the top */}
              <LinearGradient colors={['rgba(255,240,200,0.18)', 'rgba(255,240,200,0)']} locations={[0, 0.5]} style={StyleSheet.absoluteFill} />
              <Glint width={art} height={art} strength={0.55} />
            </View>
            <View style={{ position: 'absolute', left: PAD + 1, right: PAD, top: PAD + art + 5, height: CAPTION - 10 }}>
              <Text numberOfLines={2} style={display(13.5, PINK, { lineHeight: 17 })}>
                {track.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
                <Text numberOfLines={1} style={[body(11, MUTED, 600), { flex: 1 }]}>
                  {track.artist}
                </Text>
                {duration ? <Text style={body(10.5, PINK, 700, { marginLeft: 4 })}>{duration}</Text> : null}
              </View>
            </View>
            {sticker === 'sun' ? (
              <View pointerEvents="none" style={{ position: 'absolute', right: -7, top: -8, transform: [{ rotate: '14deg' }] }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' }}>
                  <TwinkleShape size={24} color={SUN} />
                </View>
              </View>
            ) : sticker === 'heart' ? (
              <View pointerEvents="none" style={{ position: 'absolute', right: -6, top: -7, transform: [{ rotate: '-12deg' }] }}>
                <Svg width={30} height={28} viewBox="-18 -14 36 33">
                  <Path d={HEART} fill={WHITE} transform="scale(1.25)" />
                  <Path d={HEART} fill={PINK} />
                  <Path d="M -9 -3 C -8 -7 -4 -7 -3 -5" stroke={WHITE} strokeWidth={2.2} strokeLinecap="round" fill="none" />
                </Svg>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ aspectRatio: 0.74 }} />
        )}
      </View>
    </Press>
  )
}
