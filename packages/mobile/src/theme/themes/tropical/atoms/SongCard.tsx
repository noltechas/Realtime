import React from 'react'
import { Animated, Image, Text, View, type TextStyle, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { hashKey } from '../../../helpers'
import type { SongCardProps } from '../../../types'
import {
  CREAM,
  ISLAND_SPOTS,
  PAPER,
  Press,
  RAMP_WALNUT,
  Timber,
  WALNUT_DK,
  alpha,
  lift,
  sans,
  shade,
  tiki,
  tikiSafe,
  tint,
} from './_tropical'

// Tropical song card — a beach postcard mounted on a carved teak board (seeded
// grain, routed groove, beveled edges — no two boards alike). The art sits on a
// white paper matte casting its own shadow; the runtime lives in a carved
// walnut chip on the art's corner.
//
// Below the art, the song is SIGNED the way a beach shack signs anything: two
// hand-nailed slats. The title rides a plank painted in one of six island spot
// colors (grain ghosting through the paint) in the tiki block caps — the same
// voice as the stage lyrics — and the artist hangs beneath it on a smaller
// walnut shingle. Each slat tilts a stable hair off-true in opposite
// directions, so a grid of cards reads like a wall of hand-made signs.
//
// Touch: the board sinks on the shared spring while the art zooms a hair the
// other way — glass-over-photo, the move the whole theme makes.

const RADIUS = 18
const FRAME = 9 // timber visible around the matte

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`
}

export function SongCard({ track, onPress }: SongCardProps) {
  const duration = formatDuration(track.duration_ms)
  const h = hashKey(track.track_id)
  const spot = ISLAND_SPOTS[h % ISLAND_SPOTS.length]
  const tilt = (h % 2 === 0 ? 1 : -1) * (0.7 + (h % 3) * 0.35)

  return (
    <Press onPress={onPress} scaleTo={0.96} style={[{ flex: 1, aspectRatio: 0.72, borderRadius: RADIUS }, lift(2)]}>
      {(progress) => (
        <Timber radius={RADIUS} seed={track.track_id} groove style={{ flex: 1, padding: FRAME }}>
          {/* paper matte + art */}
          <View style={matteStyle}>
            <View style={{ flex: 1, borderRadius: 7, overflow: 'hidden' }}>
              <Animated.View
                style={{
                  flex: 1,
                  transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }],
                }}
              >
                {track.art_url ? (
                  <Image source={{ uri: track.art_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={[tint(spot, 0.35), spot, shade(spot, 0.25)]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <NoteMark />
                  </LinearGradient>
                )}
              </Animated.View>

              {/* carved walnut runtime chip */}
              {duration ? (
                <View style={durChipStyle}>
                  <Text style={durTextStyle}>{duration}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* the sign: title slat + artist shingle, nailed up by hand */}
          <View style={{ flex: 1, justifyContent: 'center', marginTop: FRAME - 4 }}>
            <View style={[{ borderRadius: 8, transform: [{ rotate: `${tilt}deg` }] }, lift(1)]}>
              <Timber
                radius={8}
                paint={spot}
                seed={`slat-${track.track_id}`}
                knot={false}
                style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 8 }}
              >
                <Text style={titleStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.66}>
                  {tikiSafe(track.name)}
                </Text>
              </Timber>
            </View>

            <View
              style={[
                { alignSelf: 'center', maxWidth: '92%', borderRadius: 6, marginTop: -3, transform: [{ rotate: `${-tilt * 1.15}deg` }] },
                lift(1),
              ]}
            >
              <Timber
                radius={6}
                ramp={RAMP_WALNUT}
                seed={`shingle-${track.track_id}`}
                knot={false}
                style={{ paddingVertical: 3.5, paddingHorizontal: 10 }}
              >
                <Text style={artistStyle} numberOfLines={1}>
                  {track.artist}
                </Text>
              </Timber>
            </View>
          </View>
        </Timber>
      )}
    </Press>
  )
}

/** A clean eighth-note for artless tracks — drawn, not assembled from Views. */
function NoteMark() {
  return (
    <View style={{ width: 44, height: 44 }}>
      <View style={{ position: 'absolute', right: 12, top: 0, width: 4.5, height: 33, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.85)' }} />
      <View style={{ position: 'absolute', right: 3, top: 0, width: 14, height: 7, borderTopRightRadius: 8, borderBottomRightRadius: 8, backgroundColor: 'rgba(255,255,255,0.85)', transform: [{ rotate: '14deg' }] }} />
      <View style={{ position: 'absolute', left: 4, bottom: 2, width: 19, height: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)', transform: [{ rotate: '-16deg' }] }} />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const matteStyle: ViewStyle = {
  aspectRatio: 1,
  borderRadius: 9,
  backgroundColor: PAPER,
  padding: 3,
  // the matte sits IN the routed frame, so it casts down onto the plank
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
  elevation: 3,
}

// Tiki block caps — the stage-lyrics voice — painted white on the colored slat.
const titleStyle: TextStyle = tiki(14, '#FFFFFF', {
  textAlign: 'center',
  letterSpacing: 0.8,
  textShadowColor: 'rgba(20,8,2,0.5)',
  textShadowOffset: { width: 0, height: 1.3 },
  textShadowRadius: 1,
})

const artistStyle: TextStyle = sans(9.5, 'bold', CREAM, {
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  textShadowColor: 'rgba(20,8,2,0.5)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 1,
})

const durChipStyle: ViewStyle = {
  position: 'absolute',
  top: 6,
  right: 6,
  backgroundColor: alpha(WALNUT_DK, 0.88),
  borderWidth: 1,
  borderColor: 'rgba(255,226,170,0.35)',
  borderRadius: 7,
  paddingHorizontal: 6.5,
  paddingVertical: 2.5,
}

const durTextStyle: TextStyle = sans(10, 'bold', CREAM, { letterSpacing: 0.4 })
