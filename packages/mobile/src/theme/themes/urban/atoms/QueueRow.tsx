import React, { useMemo } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  type KaraokeQueueRow,
  type SingerConfig,
  type ThemeTokens,
} from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hexToRgba } from '../../../helpers'
import type { QueueRowProps } from '../../../types'

// Urban QueueRow — skewed parallelogram card (skewX -8deg) with a heavy
// toxic-green geometric drop shadow via right + bottom borders. Inner contents
// (position number, art, song name/artist, singer pills, vote column) are
// wrapped in a counter-skew (skewX +8deg) so glyphs read upright.
//
// Singer pills, vote buttons, locked badges, and voted pills all share the
// urban "small parallelogram" treatment — every element echoes the card's
// skew so the row feels like a single sheared block rather than upright
// chips on a tilted background.
export function UrbanQueueRow({
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
    <View
      style={{
        backgroundColor: tokens.creamDark,
        borderWidth: 2,
        borderColor: tokens.dimBorder,
        borderRightWidth: 6,
        borderBottomWidth: 6,
        borderRightColor: tokens.accentA,
        borderBottomColor: tokens.accentA,
        transform: [{ skewX: '-8deg' }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          transform: [{ skewX: '8deg' }],
        }}
      >
        <Text style={positionStyle(tokens)}>{position}</Text>
        {isHidden ? (
          <View style={hiddenArtStyle(tokens)}>
            <Text style={hiddenArtGlyphStyle(tokens)}>?</Text>
          </View>
        ) : item.track_art_url ? (
          <Image source={{ uri: item.track_art_url }} style={artStyle(tokens)} />
        ) : (
          <View style={[artStyle(tokens) as ViewStyle, { backgroundColor: tokens.appBg }]} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={titleStyle(tokens)} numberOfLines={1}>
            {isHidden ? 'HIDDEN SONG' : item.track_name}
          </Text>
          {isHidden ? null : (
            <Text style={artistStyle(tokens)} numberOfLines={1}>
              {item.track_artist}
            </Text>
          )}
          {singers.length > 0 ? (
            <View style={singerPillsStyle}>
              {singers.map((singer, i) => (
                <SingerPill key={`${item.id}-${i}-${singer.name}`} singer={singer} />
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
          />
        )}
      </View>
    </View>
  )
}

// ─── Inner atoms ────────────────────────────────────────────────────────────

function EditButton({ onPress }: { onPress: () => void }) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [
        editBtnStyle(tokens),
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <Ionicons name="create-outline" size={22} color={tokens.black} />
    </Pressable>
  )
}

function SingerPill({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  return (
    <View style={singerPillStyle(tokens)}>
      <View style={[singerDotStyle(tokens), { backgroundColor: singer.color || tokens.vividYellow }]}>
        {singer.profilePicture ? (
          <Image source={{ uri: singer.profilePicture }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text style={singerInitialStyle(tokens)}>{initial}</Text>
        )}
      </View>
      <Text style={singerNameStyle(tokens)} numberOfLines={1}>
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
  row: KaraokeQueueRow
  score: number
  voted?: 1 | -1
  isLocked: boolean
  inSong: boolean
  onVote: (row: KaraokeQueueRow, value: 1 | -1) => void
}) {
  const { tokens } = useTheme()
  if (isLocked) {
    return (
      <View style={lockBadgeStyle(tokens)}>
        <Ionicons name="lock-closed" size={18} color={tokens.black} />
        <Text style={lockLabelStyle(tokens)}>Next Up{'\n'}Locked</Text>
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
        <View style={votedPillStyle(tokens)}>
          <Ionicons name="checkmark" size={11} color={tokens.black} />
          <Text style={votedPillLabelStyle(tokens)}>
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
          style={({ pressed }) => [
            voteBtnStyle(tokens, 'up'),
            pressed ? { opacity: 0.8 } : null,
          ]}
          accessibilityLabel="Upvote"
        >
          <Ionicons name="chevron-up" size={18} color={tokens.black} />
        </Pressable>
        <Pressable
          onPress={() => onVote(row, -1)}
          style={({ pressed }) => [
            voteBtnStyle(tokens, 'down'),
            pressed ? { opacity: 0.8 } : null,
          ]}
          accessibilityLabel="Downvote"
        >
          <Ionicons name="chevron-down" size={18} color={tokens.black} />
        </Pressable>
      </View>
    </View>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const { tokens } = useTheme()
  const color = score > 0 ? tokens.mintGreen : score < 0 ? tokens.hotRed : tokens.black
  return <Text style={[scoreStyle(tokens), { color }]}>{score}</Text>
}

// ─── per-element style builders ─────────────────────────────────────────────

function positionStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 18,
    color: t.accentA,
    minWidth: 22,
    textAlign: 'center',
  }
}
function artStyle(t: ThemeTokens): ImageStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: t.dimBorder,
  }
}
function hiddenArtStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: t.accentA,
    backgroundColor: t.appBg,
    alignItems: 'center',
    justifyContent: 'center',
  }
}
function hiddenArtGlyphStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.accentA,
    fontFamily: t.fontDisplay,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  }
}
function titleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 14,
    color: t.black,
  }
}
function artistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontWeight: '500',
    fontSize: 12,
    color: t.muted,
    marginTop: 1,
  }
}
const singerPillsStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 8,
}
function singerPillStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingLeft: 3,
    paddingVertical: 2,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: t.dimBorder,
    borderRadius: 0,
  }
}
function singerDotStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 16,
    height: 16,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }
}
function singerInitialStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.appBg,
    fontWeight: '800',
    fontSize: 10,
  }
}
function singerNameStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    fontFamily: t.fontDisplay,
    fontWeight: '700',
    fontSize: 11,
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
function scoreStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 16,
    minWidth: 28,
    textAlign: 'center',
    lineHeight: 18,
  }
}
const voteButtonsStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}
function voteBtnStyle(t: ThemeTokens, dir: 'up' | 'down'): ViewStyle {
  const tint =
    dir === 'up'
      ? hexToRgba(t.accentA, 0.18) ?? 'rgba(212,255,0,0.18)'
      : 'rgba(255,77,77,0.18)'
  return {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: dir === 'up' ? t.accentA : t.hotRed,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tint,
  }
}
function votedPillStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: hexToRgba(t.accentA, 0.18) ?? 'rgba(212,255,0,0.18)',
    borderWidth: 1,
    borderColor: t.accentA,
    borderRadius: 0,
  }
}
function votedPillLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }
}
function lockBadgeStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,204,0,0.16)',
    borderWidth: 1,
    borderColor: t.vividYellow,
    borderRadius: 0,
    marginLeft: 4,
  }
}
function lockLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  }
}
function editBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: t.accentA,
    backgroundColor: hexToRgba(t.accentA, 0.16) ?? 'rgba(212,255,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
  }
}
