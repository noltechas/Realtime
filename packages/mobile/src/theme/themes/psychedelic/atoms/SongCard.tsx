import React from 'react'
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import type { SongCardProps } from '../../../types'
import {
  DYES,
  INK,
  INK_SOFT,
  Plate,
  partnerDye,
  phaseFor,
  pouredRadii,
  useLift,
  usePulse,
} from './_glass'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSeconds = Math.round(ms / 1000)
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`
}

// ── Song card — a DYE PLATE ─────────────────────────────────────────────────
//
// The same opaque poster construction as the queue row (see `Plate`): a saturated
// colour field, a second flat field crossing it, a heavy ink keyline, ink lettering.
// The grid becomes a sheet of coloured tiles instead of a wall of dark glass panels,
// which is the point — the old card put album art in a grey well and asked the
// ARTWORK to supply all the colour, so any catalogue entry without art loaded was a
// near-black rectangle sitting on the footage.
//
// Two things are specific to this card:
//
//   • THE ART SITS IN AN INK WINDOW inset from the plate's edge, so a band of dye
//     frames it on all four sides. That band is what makes the colour read as the
//     card's own rather than as a border drawn around someone's album cover.
//   • THE DURATION IS A TICKET STUB — an ink pill overlapping the window's bottom
//     corner. One deliberately off-grid element stops a 2-column grid reading as a
//     spreadsheet.
//
// Colour walks the palette by grid POSITION, so neighbours never match, and four
// separate slow loops keep the tile alive: two colour discs, the art window, and the
// title and artist each on their own — nothing on this card ever moves in step with
// anything else on it.
export function PsychedelicSongCard({ track, onPress, index }: SongCardProps) {
  const { tokens } = useTheme()
  const { press, transform, onPressIn, onPressOut } = useLift(0.8)
  const duration = formatDuration(track.duration_ms)

  // Fall back to the track id when the screen doesn't pass a position — hashing
  // collides sometimes, which is exactly why `index` is preferred when available.
  const slot = index ?? hashKey(track.track_id)
  const dye = DYES[slot % DYES.length]
  const mate = partnerDye(dye)
  const radii = pouredRadii(track.track_id, 22, 10)
  const windowRadii = pouredRadii(track.track_id, 16, 7)

  // FOUR independent loops per tile — art window, title, artist, and the plate's own
  // colour discs — each on its own period and its own phase, so no two ever move
  // together. The title and artist are deliberately separate rather than one scaled
  // block: sharing a loop made the caption read as a single lump breathing, where two
  // loops read as two lines of type each doing its own thing.
  //
  // All the periods are long. They were roughly half this at first and the whole screen
  // felt agitated; at 4-7 seconds a full cycle the motion registers as drift.
  const swell = usePulse(6300, phaseFor(slot, 6300, `${track.track_id}:art`))
  const artScale = swell.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.03] })
  const titleBeat = usePulse(4700, phaseFor(slot, 4700, `${track.track_id}:title`))
  const artistBeat = usePulse(5500, phaseFor(slot + 1, 5500, `${track.track_id}:artist`))
  // Scaling a left-aligned block grows it about its own centre, so these stay small —
  // enough to read as alive, not enough to look like the text is wobbling.
  const titleScale = titleBeat.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1.04] })
  const artistScale = artistBeat.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.035] })
  // A press darkens the plate as well as shrinking it — on a card that is already
  // breathing, a scale change alone doesn't read as feedback.
  const pressDim = press.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] })

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ flex: 1, marginBottom: 14 }}
    >
      <Plate
        dye={dye}
        partner={mate}
        seed={track.track_id}
        radii={radii}
        // A song tile is roughly twice as tall as a queue row, so its discs scale up
        // to match — the same diameters would read as small dots here.
        bigDisc={168}
        smallDisc={112}
        // Not a multiple of the window's 6300ms or either caption loop.
        period={7700}
        phaseIndex={slot}
        style={{ flex: 1, transform }}
        contentStyle={{ padding: 11 }}
      >
        <Animated.View style={{ transform: [{ scale: artScale }] }}>
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              ...windowRadii,
              overflow: 'hidden',
              // A missing cover fills the window with the plate's second colour, not
              // with ink. The window is the largest element on the tile, so leaving it
              // black when there's no artwork turns the whole card into a dark square
              // with a coloured trim — which is precisely the failure of the card this
              // replaced. Ink only when there IS art to hold.
              backgroundColor: track.art_url ? INK : mate,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {track.art_url ? (
              <Image
                source={{ uri: track.art_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="musical-notes" size={46} color={INK} />
            )}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { ...windowRadii, borderWidth: 3, borderColor: INK },
              ]}
            />
          </View>

          {duration ? (
            <View
              style={{
                position: 'absolute',
                right: -3,
                bottom: -9,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: INK,
              }}
            >
              <Text
                style={{
                  fontFamily: tokens.fontBody,
                  fontWeight: '800',
                  fontSize: 11,
                  letterSpacing: 0.3,
                  color: '#FFFFFF',
                }}
              >
                {duration}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={{ marginTop: 14, transform: [{ scale: titleScale }] }}>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: 17,
              lineHeight: 21,
              color: INK,
            }}
          >
            {track.name}
          </Text>
        </Animated.View>
        <Animated.View style={{ marginTop: 2, transform: [{ scale: artistScale }] }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: tokens.fontBody,
              fontWeight: '700',
              fontSize: 13,
              color: INK_SOFT,
            }}
          >
            {track.artist}
          </Text>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: INK, opacity: pressDim, ...radii }]}
        />
      </Plate>
    </Pressable>
  )
}
