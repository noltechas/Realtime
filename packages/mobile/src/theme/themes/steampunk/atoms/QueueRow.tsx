import React, { useMemo, useRef } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { type KaraokeQueueRow, type SingerConfig } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hexToRgba } from '../../../helpers'
import {
  Plaque,
  BRASS_FACE,
  BRASS_INK,
  IRON_WELL,
  BRASS,
  BRASS_BRIGHT,
  AMBER,
  COPPER,
  PARCH,
  PARCH_DIM,
  VERDIGRIS,
  OXBLOOD,
  HAIRLINE,
  HAIRLINE_SOFT,
} from './_steam'
import type { QueueRowProps } from '../../../types'

// Steampunk QueueRow — one line of the evening's manifest, machined:
//   • An iron instrument plate with hairline frame + corner screws.
//   • The position is an engraved brass bezel ring — position 1 is polished
//     brass (the next specimen up); later positions are quiet iron rings.
//   • Square art under a thin brass frame; hidden songs show a "?" well.
//   • Singers are punch tags: dark chips with the singer's color as a thin
//     enamel bar on the leading edge — color as an accent, never a fill.
//   • Vote controls are machined valve buttons: brass raises the pressure,
//     iron vents it; pressing puffs a small burst of steam.
export function SteampunkQueueRow({
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
      (Array.isArray(item.singer_configs) ? item.singer_configs : []).map((sc) => {
        // Resolve the singer's LIVE name + avatar from the canonical guest
        // record (so profile edits propagate). Name-only singers pass through.
        const g = sc.guestId ? guests.get(sc.guestId) : undefined
        return g ? { ...sc, name: g.name, profilePicture: g.profile_picture ?? undefined } : sc
      }),
    [item.singer_configs, guests],
  )
  const isLocked = item.locked && position === 1
  const inSong = useMemo(() => {
    if (guestId && singers.some((s) => s.guestId === guestId)) return true
    const gn = (guestName || '').toLowerCase()
    return !!gn && singers.some((s) => (s.name || '').toLowerCase() === gn)
  }, [singers, guestName, guestId])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden

  return (
    <Plaque screws seed={item.id ?? position} radius={12}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
        <PositionRing n={position} fontDisplay={tokens.fontDisplay} />

        {isHidden ? (
          <View style={hiddenArtStyle}>
            <Text style={{ color: AMBER, fontFamily: tokens.fontDisplay, fontSize: 20, includeFontPadding: false }}>?</Text>
          </View>
        ) : item.track_art_url ? (
          <View style={artFrameStyle}>
            <Image source={{ uri: item.track_art_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,246,224,0.10)', 'rgba(255,246,224,0)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%' }}
            />
          </View>
        ) : (
          <View style={[artFrameStyle, { backgroundColor: IRON_WELL }]} />
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={titleStyle(tokens.fontDisplay)} numberOfLines={1}>
            {isHidden ? 'Hidden Song' : item.track_name}
          </Text>
          {!isHidden && (
            <Text style={artistStyle(tokens.fontBody)} numberOfLines={1}>
              {item.track_artist}
            </Text>
          )}
          {singers.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {singers.map((singer, i) => (
                <PunchTag key={`${item.id}-${i}-${singer.name}`} singer={singer} fontBody={tokens.fontBody} fontDisplay={tokens.fontDisplay} />
              ))}
            </View>
          ) : null}
        </View>

        {isMine ? (
          <EditButton onPress={() => onEdit(item)} />
        ) : (
          <VoteColumn
            row={item}
            score={score}
            voted={voted}
            isLocked={isLocked}
            inSong={inSong}
            onVote={onVote}
            fontDisplay={tokens.fontDisplay}
          />
        )}
      </View>
    </Plaque>
  )
}

// Engraved bezel ring holding the queue position. Position 1 gets the
// polished-brass treatment; everything else waits in iron.
function PositionRing({ n, fontDisplay }: { n: number; fontDisplay: string }) {
  const isNext = n === 1
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: isNext ? BRASS_BRIGHT : HAIRLINE,
        backgroundColor: isNext ? 'rgba(200,151,62,0.16)' : 'rgba(0,0,0,0.3)',
        ...(isNext
          ? { shadowColor: AMBER, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 7 }
          : {}),
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: HAIRLINE_SOFT,
        }}
      />
      <Text
        style={{
          fontFamily: fontDisplay,
          fontSize: 13,
          color: isNext ? BRASS_BRIGHT : PARCH_DIM,
          includeFontPadding: false,
        }}
      >
        {n}
      </Text>
    </View>
  )
}

// Singer punch tag — the singer's color is a thin enamel bar, never a fill.
function PunchTag({
  singer,
  fontBody,
  fontDisplay,
}: {
  singer: SingerConfig
  fontBody: string
  fontDisplay: string
}) {
  const tint = singer.color || BRASS
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingRight: 8,
        paddingLeft: 6,
        paddingVertical: 3,
        backgroundColor: 'rgba(0,0,0,0.32)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: HAIRLINE_SOFT,
        borderLeftWidth: 3,
        borderLeftColor: tint,
        borderRadius: 4,
      }}
    >
      {singer.profilePicture ? (
        <Image
          source={{ uri: singer.profilePicture }}
          style={{ width: 16, height: 16, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: tint }}
        />
      ) : (
        <View
          style={{
            width: 15,
            height: 15,
            borderRadius: 8,
            backgroundColor: hexToRgba(tint, 0.25) ?? 'rgba(200,151,62,0.25)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: PARCH, fontFamily: fontDisplay, fontSize: 8, includeFontPadding: false }}>{initial}</Text>
        </View>
      )}
      <Text style={{ color: '#D9C49A', fontFamily: fontBody, fontSize: 11 }} numberOfLines={1}>
        {singer.name || 'Singer'}
      </Text>
    </View>
  )
}

function EditButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [
        {
          width: 36,
          height: 36,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: HAIRLINE,
          backgroundColor: 'rgba(200,151,62,0.10)',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          marginLeft: 4,
        },
        pressed ? { opacity: 0.7, transform: [{ translateY: 1 }] } : null,
      ]}
    >
      <Ionicons name="create-outline" size={18} color={AMBER} />
    </Pressable>
  )
}

function VoteColumn({
  row,
  score,
  voted,
  isLocked,
  inSong,
  onVote,
  fontDisplay,
}: {
  row: KaraokeQueueRow
  score: number
  voted?: 1 | -1
  isLocked: boolean
  inSong: boolean
  onVote: (row: KaraokeQueueRow, value: 1 | -1) => void
  fontDisplay: string
}) {
  if (isLocked) {
    return (
      <View style={lockBadgeStyle}>
        <Ionicons name="lock-closed" size={14} color={AMBER} />
        <Text style={lockLabelStyle(fontDisplay)}>Next{'\n'}Locked</Text>
      </View>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={voteColStyle}>
        <ScoreLabel score={score} fontDisplay={fontDisplay} />
      </View>
    )
  }

  if (voted) {
    return (
      <View style={voteColStyle}>
        {score !== 0 ? <ScoreLabel score={score} fontDisplay={fontDisplay} /> : null}
        <View style={votedPlateStyle(voted > 0)}>
          <Ionicons name="checkmark" size={10} color="#10130E" />
          <Text style={votedPlateLabelStyle(fontDisplay)}>{voted > 0 ? 'STOKED' : 'VENTED'}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={voteColStyle}>
      {score !== 0 ? <ScoreLabel score={score} fontDisplay={fontDisplay} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ValveButton dir="up" onPress={() => onVote(row, 1)} />
        <ValveButton dir="down" onPress={() => onVote(row, -1)} />
      </View>
    </View>
  )
}

// Machined valve button: brass to raise pressure, iron to vent it. A small
// steam puff escapes on press.
function ValveButton({ dir, onPress }: { dir: 'up' | 'down'; onPress: () => void }) {
  const isUp = dir === 'up'
  const press = useRef(new Animated.Value(0)).current
  const triggerPress = () => {
    press.setValue(0)
    Animated.timing(press, { toValue: 1, duration: 440, useNativeDriver: true }).start()
  }
  const steamScale = press.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.7] })
  const steamOpacity = press.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.55, 0] })

  return (
    <Pressable
      onPress={() => {
        triggerPress()
        onPress()
      }}
      accessibilityLabel={isUp ? 'Upvote' : 'Downvote'}
      style={({ pressed }) => [
        {
          width: 32,
          height: 32,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: isUp ? 'rgba(46,30,8,0.9)' : HAIRLINE,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: isUp ? undefined : 'rgba(0,0,0,0.3)',
        },
        pressed ? { opacity: 0.85, transform: [{ translateY: 1 }] } : null,
      ]}
    >
      {isUp ? (
        <LinearGradient
          colors={BRASS_FACE}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Ionicons name={isUp ? 'chevron-up' : 'chevron-down'} size={16} color={isUp ? BRASS_INK : PARCH_DIM} />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: 16,
          backgroundColor: '#F2E3BC',
          opacity: steamOpacity,
          transform: [{ scale: steamScale }],
        }}
      />
    </Pressable>
  )
}

function ScoreLabel({ score, fontDisplay }: { score: number; fontDisplay: string }) {
  const color = score > 0 ? AMBER : score < 0 ? COPPER : PARCH_DIM
  return (
    <Text
      style={{
        fontFamily: fontDisplay,
        fontSize: 15,
        minWidth: 28,
        textAlign: 'center',
        lineHeight: 19,
        letterSpacing: 0.8,
        color,
      }}
    >
      {score}
    </Text>
  )
}

const artFrameStyle: ViewStyle = {
  width: 52,
  height: 52,
  borderRadius: 6,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: HAIRLINE,
}
const hiddenArtStyle: ViewStyle = {
  width: 52,
  height: 52,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: HAIRLINE,
  backgroundColor: IRON_WELL,
  alignItems: 'center',
  justifyContent: 'center',
}
function titleStyle(fontDisplay: string): TextStyle {
  return {
    fontFamily: fontDisplay,
    fontSize: 13,
    color: PARCH,
    letterSpacing: 0.5,
  }
}
function artistStyle(fontBody: string): TextStyle {
  return {
    fontFamily: fontBody,
    fontSize: 12,
    color: PARCH_DIM,
    marginTop: 2,
  }
}
const voteColStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginLeft: 4,
  alignSelf: 'center',
}
function votedPlateStyle(up: boolean): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: up ? VERDIGRIS : OXBLOOD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
  }
}
function votedPlateLabelStyle(fontDisplay: string): TextStyle {
  return {
    color: '#10130E',
    fontFamily: fontDisplay,
    fontSize: 8.5,
    letterSpacing: 1.2,
  }
}
const lockBadgeStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  paddingHorizontal: 9,
  paddingVertical: 6,
  backgroundColor: 'rgba(232,169,59,0.12)',
  borderWidth: 1,
  borderColor: HAIRLINE,
  borderRadius: 7,
  marginLeft: 4,
}
function lockLabelStyle(fontDisplay: string): TextStyle {
  return {
    color: AMBER,
    fontFamily: fontDisplay,
    fontSize: 8.5,
    lineHeight: 11,
    textAlign: 'center',
    letterSpacing: 0.8,
  }
}
