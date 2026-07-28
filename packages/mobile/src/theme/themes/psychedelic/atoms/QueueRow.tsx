import React, { useMemo } from 'react'
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { KaraokeQueueRow, SingerConfig } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import type { QueueRowProps } from '../../../types'
import {
  DYES,
  INK,
  INK_SOFT,
  MINT,
  Plate,
  WARM,
  partnerDye,
  phaseFor,
  pouredRadii,
  useLift,
  usePulse,
} from './_glass'

// ── Queue row — a DYE PLATE ─────────────────────────────────────────────────
//
// An opaque, saturated slab of colour with dark lettering on it: Fillmore poster
// construction, which is where this whole aesthetic comes from. Built from scratch
// on that premise twice over — first as a grey glass rack unit (legible, inert), then
// as translucent tinted glass (better, still fundamentally a dark card). Neither
// belonged in front of footage this loud. The plate does, because it stops competing
// with the background and starts being a printed thing sitting on top of it.
//
// Everything follows from "opaque and bright":
//
//   • TYPE IS INK, not white. Dark-on-saturated is both the highest contrast pairing
//     available and the period-correct one. Every colour in `DYES` is picked to carry
//     ink at body sizes — that constraint is why the palette's violet is lifted.
//   • COLOUR COMES IN FLAT FIELDS. Two hard-edged discs of palette mates cross the
//     plate (see `Plate`); no gradients, because a gradient reads as generated and a
//     crisp colour boundary reads as printed.
//   • THE PLATE BREATHES VISIBLY. The discs swing ±10% on staggered phases, so the
//     colour balance keeps shifting. An earlier pass animated at 3-5% and the motion
//     simply could not be seen — all cost, no effect.
//   • NO STATUS TAGS. "UP NEXT" / "YOU'RE SINGING" pills were noise on a card this
//     expressive; the on-deck row is already unmistakable because it's the only cream
//     plate in the stack, and it's the only one wearing the lock.
//
// The colour walks the palette by POSITION IN THE LIST, so the queue is a poured
// rainbow and no two neighbours ever match. Hashing the row id instead — the obvious
// choice — picks independently per row, and independent picks from six colours
// collide constantly: the first test queue drew green three rows running, which
// looked like a bug rather than a palette.

/** Diameter of the position bead. */
const DROP = 36

export function PsychedelicQueueRow({
  item,
  position,
  voted,
  guestName,
  guestId,
  guests,
  onVote,
  onEdit,
  index,
}: QueueRowProps) {
  const { tokens } = useTheme()
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)

  const singers = useMemo<SingerConfig[]>(
    () =>
      (Array.isArray(item.singer_configs) ? item.singer_configs : []).map((config) => {
        // Resolve each singer's LIVE name + avatar from the canonical guest record so
        // profile edits propagate. Name-only singers pass through.
        const guest = config.guestId ? guests.get(config.guestId) : undefined
        return guest
          ? { ...config, name: guest.name, profilePicture: guest.profile_picture ?? undefined }
          : config
      }),
    [item.singer_configs, guests],
  )

  const isLocked = !!item.locked && position === 1
  const inSong = useMemo(() => {
    if (guestId && singers.some((singer) => singer.guestId === guestId)) return true
    const name = (guestName || '').toLowerCase()
    return !!name && singers.some((singer) => (singer.name || '').toLowerCase() === name)
  }, [singers, guestName, guestId])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden

  // The on-deck row overrides to cream: "you are next" has to out-rank whatever
  // colour its slot happened to land on, and being the one pale plate in a stack of
  // saturated ones does that without needing a label.
  const dye = isLocked ? WARM : DYES[index % DYES.length]
  const mate = isLocked ? DYES[index % DYES.length] : partnerDye(dye)
  const radii = pouredRadii(item.id)

  // Out of step with the plate's colour fields on BOTH axes: a different period, and a
  // phase spread by list position so neighbouring rows can't coincide either.
  const beat = usePulse(4900, phaseFor(index, 4900, `${item.id}:bead`))
  const beadScale = beat.interpolate({ inputRange: [0, 1], outputRange: [0.91, 1.11] })

  return (
    <Plate
      dye={dye}
      partner={mate}
      seed={item.id}
      radii={radii}
      phaseIndex={index}
      period={isLocked ? 6100 : 7300}
      contentStyle={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingVertical: 13,
        paddingHorizontal: 13,
      }}
    >
      {/* Position bead — ink on the bright plate, so it reads as a punched hole. */}
      <Animated.View
        style={{
          width: DROP,
          height: DROP,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: beadScale }],
        }}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: DROP / 2, backgroundColor: INK },
          ]}
        />
        <Text style={{ fontFamily: tokens.fontDisplay, fontSize: 17, color: dye }}>
          {position}
        </Text>
      </Animated.View>

      {/* Art well — an ink-framed window cut into the plate. */}
      <View
        style={{
          width: 52,
          height: 52,
          ...pouredRadii(item.id, 15, 6),
          overflow: 'hidden',
          backgroundColor: INK,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isHidden ? (
          <Ionicons name="help" size={24} color={mate} />
        ) : item.track_art_url ? (
          <Image source={{ uri: item.track_art_url }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Ionicons name="musical-notes" size={22} color={mate} />
        )}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { ...pouredRadii(item.id, 15, 6), borderWidth: 2.5, borderColor: INK },
          ]}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: tokens.fontDisplay, fontSize: 19, color: INK }}
        >
          {isHidden ? 'Hidden song' : item.track_name}
        </Text>
        {!isHidden ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: tokens.fontBody,
              fontWeight: '700',
              fontSize: 13,
              color: INK_SOFT,
              marginTop: 1,
            }}
          >
            {item.track_artist}
          </Text>
        ) : null}

        {singers.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {singers.map((singer, at) => (
              <SingerChip
                key={`${item.id}-${at}-${singer.name}`}
                singer={singer}
                highlight={inSong}
                phase={phaseFor(index * 3 + at, 4550, item.id)}
              />
            ))}
          </View>
        ) : null}
      </View>

      {isMine ? (
        <InkKey icon="options-outline" onPress={() => onEdit(item)} />
      ) : (
        <VoteStack
          row={item}
          score={score}
          index={index}
          voted={voted}
          isLocked={isLocked}
          inSong={inSong}
          onVote={onVote}
        />
      )}
    </Plate>
  )
}

// Singer chip — ink-filled, so it stays readable whichever plate it lands on.
//
// Filling the chip with the SINGER's colour (which an earlier pass did) can't work
// here: singer colours are user-chosen and the plate colour walks the palette, so
// sooner or later a singer's magenta chip sits on a magenta plate and vanishes. Ink
// fill with the singer's colour as a disc keeps both the identity and the contrast.
function SingerChip({
  singer,
  highlight,
  phase,
}: {
  singer: SingerConfig
  highlight: boolean
  phase: number
}) {
  const { tokens } = useTheme()
  const tint = singer.color || MINT
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  const beat = usePulse(4550, phase)
  const scale = beat.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.05] })

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingLeft: 3,
        paddingRight: 10,
        paddingVertical: 2.5,
        borderRadius: 999,
        backgroundColor: INK,
        // A singer the local guest is performing with gets a bright rim — the one
        // remaining trace of the status tag that used to say so in words.
        borderWidth: highlight ? 1.5 : 0,
        borderColor: WARM,
        transform: [{ scale }],
      }}
    >
      <View
        style={{
          width: 19,
          height: 19,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {singer.profilePicture ? (
          <Image
            source={{ uri: singer.profilePicture }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text style={{ color: INK, fontFamily: tokens.fontDisplay, fontSize: 11 }}>
            {initial}
          </Text>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: '#FFFFFF',
          fontFamily: tokens.fontBody,
          fontWeight: '800',
          fontSize: 12,
          maxWidth: 92,
        }}
      >
        {singer.name || 'Singer'}
      </Text>
    </Animated.View>
  )
}

function VoteStack({
  row,
  score,
  index,
  voted,
  isLocked,
  inSong,
  onVote,
}: {
  row: KaraokeQueueRow
  score: number
  index: number
  voted?: 1 | -1
  isLocked: boolean
  inSong: boolean
  onVote: (row: KaraokeQueueRow, value: 1 | -1) => void
}) {
  if (isLocked) {
    return (
      <View style={{ width: 44, alignItems: 'center' }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: INK,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="lock-closed" size={17} color={WARM} />
        </View>
      </View>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={{ width: 44, alignItems: 'center' }}>
        <ScoreBead score={score} seed={row.id} index={index} />
      </View>
    )
  }

  if (voted) {
    return (
      <View style={{ width: 44, alignItems: 'center', gap: 3 }}>
        {score !== 0 ? <ScoreBead score={score} seed={row.id} index={index} /> : null}
        <Ionicons
          name={voted > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
          size={21}
          color={INK}
        />
      </View>
    )
  }

  return (
    <View style={{ width: 44, alignItems: 'center', gap: 4 }}>
      <InkKey icon="chevron-up" small onPress={() => onVote(row, 1)} />
      {score !== 0 ? <ScoreBead score={score} seed={row.id} index={index} /> : <View style={{ height: 21 }} />}
      <InkKey icon="chevron-down" small onPress={() => onVote(row, -1)} />
    </View>
  )
}

function InkKey({
  icon,
  onPress,
  small,
}: {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  small?: boolean
}) {
  const { transform, onPressIn, onPressOut } = useLift(0.8)
  const size = small ? 27 : 36
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={9}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: INK,
          transform,
        }}
      >
        <Ionicons name={icon} size={small ? 17 : 20} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  )
}

// The vote tally. Big, because it is the only number on the card a guest is competing
// over, and it used to be set at 16px where it read as a footnote.
//
// It breathes on its own 4100ms loop, out of step with the plate's colour fields AND
// with the position bead.
function ScoreBead({ score, seed, index }: { score: number; seed: string; index: number }) {
  const { tokens } = useTheme()
  const beat = usePulse(4100, phaseFor(index, 4100, `${seed}:score`))
  const scale = beat.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1.11] })
  return (
    <Animated.Text
      style={{
        fontFamily: tokens.fontDisplay,
        fontSize: 23,
        color: score > 0 ? INK : INK_SOFT,
        transform: [{ scale }],
      }}
    >
      {score > 0 ? `+${score}` : score}
    </Animated.Text>
  )
}
