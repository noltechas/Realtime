import React, { useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  Image,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SingerConfig } from '@karaoke/shared'
import { NEO_BRUTAL_MOBILE } from '../../../tokens'
import type { QueueRowProps } from '../../../types'

// Neo-brutal queue row. Lifted from the default branch of QueueScreen's
// QueueRow component plus its per-element style builders. The card is the
// classic neo-brutal slab: 3px black border, 4px offset shadow, hard radius.
// Vote buttons are 32px black-bordered squares; the lock badge sits where the
// vote column would be when this row is at position 1.
const t = NEO_BRUTAL_MOBILE

const OFFSET_SHADOW = {
  shadowColor: t.accentGlowColor,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
}

const OFFSET_SHADOW_SM = {
  shadowColor: t.accentGlowColor,
  shadowOffset: { width: 2, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 2,
}

const PRESSED_STYLE: ViewStyle = {
  transform: [{ translateX: 2 }, { translateY: 2 }],
  shadowOpacity: 0,
  elevation: 0,
}

export function QueueRow({
  item,
  position,
  voted,
  guestName,
  guestId,
  guests,
  onVote,
  onEdit,
}: QueueRowProps) {
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)
  const singers = useMemo<SingerConfig[]>(
    () =>
      (Array.isArray(item.singer_configs) ? item.singer_configs : []).map(
        (sc) => {
          // Resolve the singer's LIVE name + avatar from the canonical guest
          // record (so profile edits propagate). Name-only singers pass through.
          const g = sc.guestId ? guests.get(sc.guestId) : undefined
          return g
            ? { ...sc, name: g.name, profilePicture: g.profile_picture ?? undefined }
            : sc
        },
      ),
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
    <View style={rowStyle}>
      <Text style={positionStyle}>{position}</Text>
      <View>
        {isHidden ? (
          <View style={hiddenArtStyle}>
            <Text style={hiddenArtGlyphStyle}>?</Text>
          </View>
        ) : item.track_art_url ? (
          <Image source={{ uri: item.track_art_url }} style={artStyle} />
        ) : (
          <View style={[artStyle as ViewStyle, { backgroundColor: t.creamDark }]} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={titleStyle} numberOfLines={1}>
          {isHidden ? 'HIDDEN SONG' : item.track_name}
        </Text>
        {isHidden ? null : (
          <Text style={artistStyle} numberOfLines={1}>
            {item.track_artist}
          </Text>
        )}
        {singers.length > 0 ? (
          <View style={singerPillsRowStyle}>
            {singers.map((singer, i) => (
              <SingerPill key={`${item.id}-${i}-${singer.name}`} singer={singer} />
            ))}
          </View>
        ) : null}
      </View>
      <View>
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
          />
        )}
      </View>
    </View>
  )
}

// ── Subcomponents ──────────────────────────────────────────────────────────
function EditButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [editBtnStyle, pressed ? PRESSED_STYLE : null]}
    >
      <Ionicons name="create-outline" size={22} color={t.black} />
    </Pressable>
  )
}

function SingerPill({ singer }: { singer: SingerConfig }) {
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  return (
    <View style={singerPillStyle}>
      <View style={[singerDotStyle, { backgroundColor: singer.color || t.vividYellow }]}>
        {singer.profilePicture ? (
          <Image
            source={{ uri: singer.profilePicture }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text style={singerInitialStyle}>{initial}</Text>
        )}
      </View>
      <Text style={singerNameStyle} numberOfLines={1}>
        {singer.name || 'Singer'}
      </Text>
    </View>
  )
}

function VoteColumn({
  row,
  score,
  voted,
  isLocked,
  inSong,
  onVote,
}: {
  row: QueueRowProps['item']
  score: number
  voted?: QueueRowProps['voted']
  isLocked: boolean
  inSong: boolean
  onVote: QueueRowProps['onVote']
}) {
  if (isLocked) {
    return (
      <View style={lockBadgeStyle}>
        <Ionicons name="lock-closed" size={18} color={t.black} />
        <Text style={lockLabelStyle}>
          Next Up{'\n'}Locked
        </Text>
      </View>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={voteColStyle}>
        <ScoreLabel score={score} />
      </View>
    )
  }

  if (voted) {
    return (
      <View style={voteColStyle}>
        {score !== 0 ? <ScoreLabel score={score} /> : null}
        <View style={votedPillStyle}>
          <Ionicons name="checkmark" size={11} color={t.black} />
          <Text style={votedPillLabelStyle}>
            {voted > 0 ? 'Voted Up' : 'Voted Down'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={voteColStyle}>
      {score !== 0 ? <ScoreLabel score={score} /> : null}
      <View style={voteButtonsStyle}>
        <Pressable
          onPress={() => onVote(row, 1)}
          style={({ pressed }) => [voteBtnStyleUp, pressed ? PRESSED_STYLE : null]}
          accessibilityLabel="Upvote"
        >
          <Ionicons name="chevron-up" size={18} color={t.black} />
        </Pressable>
        <Pressable
          onPress={() => onVote(row, -1)}
          style={({ pressed }) => [voteBtnStyleDown, pressed ? PRESSED_STYLE : null]}
          accessibilityLabel="Downvote"
        >
          <Ionicons name="chevron-down" size={18} color={t.white} />
        </Pressable>
      </View>
    </View>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const color = score > 0 ? t.mintGreen : score < 0 ? t.hotRed : t.black
  return <Text style={[scoreStyle, { color }]}>{score}</Text>
}

// ── Styles ─────────────────────────────────────────────────────────────────
const rowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  padding: 14,
  backgroundColor: t.white,
  borderWidth: t.cardBorderWidth,
  borderColor: t.black,
  borderRadius: t.radius,
  ...OFFSET_SHADOW,
}

const positionStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontWeight: '800',
  fontSize: 18,
  color: t.faint,
  minWidth: 22,
  textAlign: 'center',
}

const artStyle: ImageStyle = {
  width: 48,
  height: 48,
  borderRadius: 6,
  borderWidth: 2,
  borderColor: t.black,
}

const hiddenArtStyle: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 6,
  borderWidth: 3,
  borderColor: t.black,
  backgroundColor: t.black,
  alignItems: 'center',
  justifyContent: 'center',
  ...OFFSET_SHADOW_SM,
}

const hiddenArtGlyphStyle: TextStyle = {
  color: t.vividYellow,
  fontFamily: t.fontDisplay,
  fontSize: 24,
  fontWeight: '900',
  lineHeight: 28,
}

const titleStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontWeight: '800',
  fontSize: 14,
  color: t.black,
}

const artistStyle: TextStyle = {
  fontFamily: t.fontBody,
  fontWeight: '500',
  fontSize: 12,
  color: t.muted,
  marginTop: 1,
}

const singerPillsRowStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 8,
}

const singerPillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  paddingHorizontal: 8,
  paddingLeft: 3,
  paddingVertical: 2,
  backgroundColor: t.cream,
  borderWidth: 2,
  borderColor: t.black,
  borderRadius: 99,
}

const singerDotStyle: ViewStyle = {
  width: 16,
  height: 16,
  borderRadius: 99,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

const singerInitialStyle: TextStyle = {
  color: t.black,
  fontWeight: '800',
  fontSize: 10,
}

const singerNameStyle: TextStyle = {
  color: t.black,
  fontFamily: t.fontDisplay,
  fontWeight: '700',
  fontSize: 11,
}

const voteColStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginLeft: 4,
  alignSelf: 'center',
}

const scoreStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontWeight: '900',
  fontSize: 16,
  minWidth: 28,
  textAlign: 'center',
  lineHeight: 18,
}

const voteButtonsStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}

const voteBtnBase: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 6,
  borderWidth: 2.5,
  borderColor: t.black,
  alignItems: 'center',
  justifyContent: 'center',
  ...OFFSET_SHADOW_SM,
}

const voteBtnStyleUp: ViewStyle = {
  ...voteBtnBase,
  backgroundColor: t.vividYellow,
}

const voteBtnStyleDown: ViewStyle = {
  ...voteBtnBase,
  backgroundColor: t.hotRed,
}

const votedPillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 3,
  backgroundColor: t.vividYellow,
  borderWidth: 2,
  borderColor: t.black,
  borderRadius: 99,
  ...OFFSET_SHADOW_SM,
}

const votedPillLabelStyle: TextStyle = {
  color: t.black,
  fontFamily: t.fontDisplay,
  fontWeight: '800',
  fontSize: 9,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
}

const lockBadgeStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  paddingHorizontal: 8,
  paddingVertical: 6,
  backgroundColor: t.vividYellow,
  borderWidth: 2.5,
  borderColor: t.black,
  borderRadius: 6,
  marginLeft: 4,
  ...OFFSET_SHADOW_SM,
}

const lockLabelStyle: TextStyle = {
  color: t.black,
  fontFamily: t.fontDisplay,
  fontWeight: '800',
  fontSize: 9,
  lineHeight: 11,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  textAlign: 'center',
}

const editBtnStyle: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 6,
  borderWidth: 2.5,
  borderColor: t.black,
  backgroundColor: t.vividYellow,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 4,
  alignSelf: 'center',
  ...OFFSET_SHADOW_SM,
}
