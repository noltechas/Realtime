import React, { useMemo } from 'react'
import { Animated, Image, Pressable, Text, View, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path } from 'react-native-svg'
import type { KaraokeQueueRow, SingerConfig } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey, hexToRgba } from '../../../helpers'
import type { QueueRowProps } from '../../../types'
import {
  AMBER,
  CUT_PLATE,
  CUT_TIGHT,
  CRITICAL,
  HULL_WELL,
  ICE,
  MONO,
  MachinedPanel,
  NOMINAL,
  STEEL_HI,
  TEXT,
  TEXT_DIM,
  TEXT_FAINT,
  TONES,
  VIOLET,
  VOID,
  type Tone,
  useLinearLoop,
  usePressTravel,
} from './_ship'

// Space queue row — a rack unit in the flight plan.
//
// The row's STATE IS ITS SYSTEM BAR COLOUR, which is the theme's single
// consistent piece of grammar:
//   amber   → holding at position 1 (locked, on deck)
//   violet  → yours, editable
//   nominal → you're singing on it
//   steel   → hidden
//   ice     → a normal queued item
// Nothing else in the row changes colour, so a glance down the list reads as a
// status column rather than a rainbow.
//
// The previous version swept a magenta→cyan aurora gradient across the whole
// row every eight seconds, per row. Here the only motion is a single bright
// segment travelling down the system bar of the row that's on deck — one moving
// element in the entire list, on the one row that has earned attention.
export function SpaceQueueRow({
  item,
  position,
  voted,
  guestName,
  guestId,
  guests,
  onVote,
  onEdit,
}: QueueRowProps) {
  const { tokens } = useTheme()
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)

  const singers = useMemo<SingerConfig[]>(
    () =>
      (Array.isArray(item.singer_configs) ? item.singer_configs : []).map((config) => {
        // Resolve each singer's LIVE name + avatar from the canonical guest
        // record so profile edits propagate. Name-only singers pass through.
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

  const tone: Tone = isHidden
    ? 'steel'
    : isLocked
      ? 'amber'
      : inSong
        ? 'nominal'
        : isMine
          ? 'violet'
          : 'ice'

  const statusLabel = isHidden
    ? 'MASKED'
    : isLocked
      ? 'ON DECK'
      : inSong
        ? 'ASSIGNED'
        : isMine
          ? 'YOURS'
          : 'QUEUED'

  return (
    <MachinedPanel
      cuts={CUT_PLATE}
      tone={tone}
      fill="glass"
      systemBar
      bolts
      edgeStrength={isHidden ? 0.5 : 1}
      contentStyle={{ paddingVertical: 11, paddingLeft: 13, paddingRight: 11 }}
    >
      {/* The travelling segment exists only on the on-deck row — one moving
          element in the whole list, on the row that has earned it. */}
      {isLocked ? <BusTravel /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <PositionBay position={position} tone={tone} />

        {/* Art bay — square and recessed, matching the catalog cards. */}
        <View style={{ width: 46, height: 46, backgroundColor: HULL_WELL, overflow: 'hidden' }}>
          {isHidden ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="help" size={20} color={TEXT_FAINT} />
            </View>
          ) : item.track_art_url ? (
            <Image
              source={{ uri: item.track_art_url }}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="musical-notes" size={18} color={TEXT_FAINT} />
            </View>
          )}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: 1,
              borderColor: hexToRgba(TONES[tone], 0.4) ?? 'rgba(91,233,255,0.4)',
            }}
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: 13,
              letterSpacing: 1.3,
              textTransform: 'uppercase',
              color: isHidden ? TEXT_DIM : tokens.black,
            }}
          >
            {isHidden ? 'MASKED ENTRY' : item.track_name}
          </Text>
          {!isHidden ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: tokens.fontBody,
                fontSize: 12,
                marginTop: 1,
                color: TEXT_DIM,
              }}
            >
              {item.track_artist}
            </Text>
          ) : null}

          {/* Status legend — the row's state in words, in the telemetry face. */}
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: 1.5,
              marginTop: 3,
              color: TONES[tone],
              opacity: 0.9,
            }}
          >
            {statusLabel}
          </Text>

          {singers.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 5,
                marginTop: 6,
              }}
            >
              {singers.map((singer, index) => (
                <SingerTag
                  key={`${item.id}-${index}-${singer.name}`}
                  singer={singer}
                />
              ))}
            </View>
          ) : null}
        </View>

        {isMine ? (
          <EditKey onPress={() => onEdit(item)} />
        ) : (
          <VoteStack
            row={item}
            score={score}
            voted={voted}
            isLocked={isLocked}
            inSong={inSong}
            onVote={onVote}
          />
        )}
      </View>
    </MachinedPanel>
  )
}

// A bright segment running down the system bar of the on-deck row.
//
// A plain Animated.View rather than an SVG <Rect> on purpose: SVG attributes
// are not native-drivable, so animating a Rect's `y` would have to fall back to
// the JS driver and would then stutter under list scrolling — the one situation
// this row is guaranteed to be in.
function BusTravel() {
  const travel = useLinearLoop(2600)
  const translateY = travel.interpolate({
    inputRange: [0, 1],
    // Percentages keep this independent of the row's measured height, so the
    // segment needs no layout pass to start moving.
    outputRange: ['-40%', '340%'],
  })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 2,
        height: '30%',
        backgroundColor: '#FFE2AE',
        opacity: 0.9,
        transform: [{ translateY }],
      }}
    />
  )
}

// Position readout — a machined bay with the slot number in the telemetry face.
function PositionBay({ position, tone }: { position: number; tone: Tone }) {
  return (
    <View style={{ width: 34, alignItems: 'center' }}>
      <Svg width={34} height={34} style={{ position: 'absolute' }}>
        <Path
          d={`M 5 0.5 L 33.5 0.5 L 33.5 28.5 L 28.5 33.5 L 0.5 33.5 L 0.5 5 Z`}
          fill="rgba(7,12,19,0.9)"
          stroke={TONES[tone]}
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      </Svg>
      <View style={{ height: 34, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 15,
            color: TONES[tone],
            includeFontPadding: false,
          }}
        >
          {position}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: MONO,
          fontSize: 7,
          letterSpacing: 1,
          color: TEXT_FAINT,
          marginTop: 2,
        }}
      >
        POS
      </Text>
    </View>
  )
}

// Singer tag — a micro plate whose leading edge carries the singer's colour.
// The singer colour lives ONLY here; it never leaks into the row's own tone,
// which stays reserved for queue state.
function SingerTag({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const tint = singer.color || ICE
  const initial = (singer.name || '?').charAt(0).toUpperCase()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: hexToRgba(tint, 0.12) ?? 'rgba(91,233,255,0.12)',
        borderWidth: 1,
        borderColor: hexToRgba(tint, 0.5) ?? 'rgba(91,233,255,0.5)',
        paddingRight: 7,
        paddingVertical: 1,
      }}
    >
      <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: tint }} />
      <View
        style={{
          width: 15,
          height: 15,
          marginLeft: 5,
          marginRight: 5,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tint,
        }}
      >
        {singer.profilePicture ? (
          <Image
            source={{ uri: singer.profilePicture }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text style={{ color: VOID, fontFamily: MONO, fontSize: 9 }}>{initial}</Text>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: TEXT,
          fontFamily: tokens.fontDisplay,
          fontSize: 10,
          letterSpacing: 0.9,
          maxWidth: 92,
        }}
      >
        {singer.name || 'Singer'}
      </Text>
    </View>
  )
}

function VoteStack({
  row,
  score,
  voted,
  isLocked,
  inSong,
  onVote,
}: {
  row: KaraokeQueueRow
  score: number
  voted?: 1 | -1
  isLocked: boolean
  inSong: boolean
  onVote: (row: KaraokeQueueRow, value: 1 | -1) => void
}) {
  if (isLocked) {
    return (
      <View style={{ width: 40, alignItems: 'center', gap: 3 }}>
        <Ionicons name="lock-closed" size={15} color={AMBER} />
        <Text style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: AMBER }}>
          HOLD
        </Text>
      </View>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={{ width: 40, alignItems: 'center' }}>
        <ScoreReadout score={score} />
      </View>
    )
  }

  if (voted) {
    return (
      <View style={{ width: 40, alignItems: 'center', gap: 3 }}>
        {score !== 0 ? <ScoreReadout score={score} /> : null}
        <Ionicons
          name={voted > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
          size={16}
          color={voted > 0 ? NOMINAL : CRITICAL}
        />
        <Text
          style={{
            fontFamily: MONO,
            fontSize: 8,
            letterSpacing: 0.8,
            color: voted > 0 ? NOMINAL : CRITICAL,
          }}
        >
          {voted > 0 ? 'BOOST' : 'DAMP'}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ width: 40, alignItems: 'center', gap: 4 }}>
      <VoteKey direction="up" onPress={() => onVote(row, 1)} />
      {score !== 0 ? <ScoreReadout score={score} /> : <View style={{ height: 14 }} />}
      <VoteKey direction="down" onPress={() => onVote(row, -1)} />
    </View>
  )
}

function VoteKey({ direction, onPress }: { direction: 'up' | 'down'; onPress: () => void }) {
  const { transform, onPressIn, onPressOut } = usePressTravel(0.6)
  const up = direction === 'up'
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={6}>
      <MachinedPanel
        cuts={CUT_TIGHT}
        tone={up ? 'nominal' : 'critical'}
        fill="raised"
        edgeStrength={0.9}
        style={{ transform } as ViewStyle}
        contentStyle={{
          width: 34,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={up ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={up ? NOMINAL : CRITICAL}
        />
      </MachinedPanel>
    </Pressable>
  )
}

function EditKey({ onPress }: { onPress: () => void }) {
  const { transform, onPressIn, onPressOut } = usePressTravel(0.6)
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={6}>
      <MachinedPanel
        cuts={CUT_TIGHT}
        tone="violet"
        fill="raised"
        style={{ transform } as ViewStyle}
        contentStyle={{
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="options-outline" size={18} color={VIOLET} />
      </MachinedPanel>
    </Pressable>
  )
}

function ScoreReadout({ score }: { score: number }) {
  const color = score > 0 ? NOMINAL : score < 0 ? CRITICAL : STEEL_HI
  return (
    <Text
      style={{
        fontFamily: MONO,
        fontSize: 13,
        color,
        includeFontPadding: false,
      }}
    >
      {score > 0 ? `+${score}` : score}
    </Text>
  )
}
