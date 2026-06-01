import React, { useMemo } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  type TextStyle,
  type ViewStyle,
  type ImageStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type {
  KaraokeQueueRow,
  SingerConfig,
  ThemeTokens,
} from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import type { QueueRowProps } from '../../../types'

// Deep-sea queue row — translucent navy capsule with a cyan border that's
// heavier on the bottom edge (suggests sinking weight). Track number prints
// in glowing cyan; album art is rounded into a porthole bordered in
// purple. All score/vote chrome reads on dark surfaces.
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        backgroundColor: 'rgba(6,18,44,0.85)',
        borderWidth: 1,
        borderColor: 'rgba(0,255,200,0.5)',
        borderBottomWidth: 3,
        borderRadius: tokens.radius,
      }}
    >
      <Text style={positionStyle(tokens)}>{position}</Text>
      <View>
        {isHidden ? (
          <View style={hiddenArtStyle(tokens)}>
            <Text style={hiddenArtGlyphStyle(tokens)}>?</Text>
          </View>
        ) : item.track_art_url ? (
          <Image source={{ uri: item.track_art_url }} style={artStyle(tokens)} />
        ) : (
          <View style={[artStyle(tokens) as ViewStyle, { backgroundColor: tokens.creamDark }]} />
        )}
      </View>
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

function EditButton({ onPress }: { onPress: () => void }) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [editBtnStyle(tokens), pressed ? { opacity: 0.85 } : null]}
    >
      <Ionicons name="create-outline" size={22} color={tokens.accentB} />
    </Pressable>
  )
}

function SingerPill({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  return (
    <View style={singerPillStyle(tokens)}>
      <View style={[singerDotStyle(), { backgroundColor: singer.color || tokens.vividYellow }]}>
        {singer.profilePicture ? (
          <Image
            source={{ uri: singer.profilePicture }}
            style={{ width: '100%', height: '100%' }}
          />
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
        <Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.6)" />
        <Text style={lockLabelStyle(tokens)}>{'Next Up\nLocked'}</Text>
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
          <Ionicons name="checkmark" size={11} color={tokens.accentA} />
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
            pressed ? { opacity: 0.85 } : null,
          ]}
          accessibilityLabel="Upvote"
        >
          <Ionicons name="chevron-up" size={18} color={tokens.accentA} />
        </Pressable>
        <Pressable
          onPress={() => onVote(row, -1)}
          style={({ pressed }) => [
            voteBtnStyle(tokens, 'down'),
            pressed ? { opacity: 0.85 } : null,
          ]}
          accessibilityLabel="Downvote"
        >
          <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>
    </View>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const { tokens } = useTheme()
  const positive = score > 0
  const color = positive ? tokens.accentA : score < 0 ? 'rgba(255,255,255,0.5)' : tokens.white
  return (
    <Text
      style={[
        scoreStyle(tokens),
        { color },
        positive ? { textShadowColor: tokens.accentGlowColor, textShadowRadius: 8 } : {},
      ]}
    >
      {score}
    </Text>
  )
}

// ─── style builders ─────────────────────────────────────────────────────────

function positionStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 22,
    color: t.accentA,
    minWidth: 22,
    textAlign: 'center',
    textShadowColor: t.accentGlowColor,
    textShadowRadius: 6,
  }
}
function artStyle(t: ThemeTokens): ImageStyle {
  return {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: t.accentB,
  }
}
function hiddenArtStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: t.accentB,
    backgroundColor: 'rgba(180,77,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: t.accentB,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  }
}
function hiddenArtGlyphStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.accentB,
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
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  }
}
function artistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontWeight: '500',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  }
}
const singerPillsStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 8,
}
function singerPillStyle(_t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingLeft: 3,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,255,200,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,200,0.3)',
    borderRadius: 16,
  }
}
function singerDotStyle(): ViewStyle {
  return {
    width: 16,
    height: 16,
    borderRadius: 99,
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
    color: t.accentA,
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
  const bg = dir === 'up' ? 'rgba(0,255,200,0.15)' : 'rgba(255,255,255,0.05)'
  return {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dir === 'up' ? t.accentA : 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bg,
    ...(dir === 'up'
      ? {
          shadowColor: t.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
        }
      : {}),
  }
}
function votedPillStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,255,200,0.15)',
    borderWidth: 1,
    borderColor: t.accentA,
    borderRadius: 12,
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  }
}
function votedPillLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.accentA,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: t.radius,
    marginLeft: 4,
  }
}
function lockLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: 'rgba(255,255,255,0.5)',
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.accentB,
    backgroundColor: 'rgba(180,77,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
    shadowColor: t.accentB,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  }
}
