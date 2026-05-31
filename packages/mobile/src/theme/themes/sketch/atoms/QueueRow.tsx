import React, { useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  Image,
  type TextStyle,
  type ViewStyle,
  type ImageStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SingerConfig, KaraokeQueueRow } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import type { QueueRowProps } from '../../../types'

// Sketch queue row — paper-card with hand-drawn rotation. Album art is matted,
// singer pills are post-it yellow, upvote/downvote buttons are tilted in
// opposite directions so the row feels like little stickers stacked together.
export function QueueRow({
  item,
  position,
  voted,
  guestName,
  guestId,
  onVote,
  onEdit,
}: QueueRowProps) {
  const { tokens } = useTheme()
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)
  const singers = useMemo<SingerConfig[]>(
    () => (Array.isArray(item.singer_configs) ? item.singer_configs : []),
    [item.singer_configs],
  )
  const isLocked = item.locked && position === 1
  const inSong = useMemo(() => {
    const gn = (guestName || '').toLowerCase()
    return singers.some((s) => (s.name || '').toLowerCase() === gn)
  }, [singers, guestName])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden

  const hash = hashKey(item.track_name) + position
  const angle = (hash % 2 === 0 ? 1 : -1) * (0.3 + (hash % 5) * 0.1)

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 2,
    transform: [{ rotate: `${angle}deg` }] as any,
  }

  // Counter-rotate the inner content so labels and art stay legible while the
  // surrounding card maintains its hand-placed feel.
  const unskew = [{ rotate: `${-angle}deg` }]

  return (
    <View style={rowStyle}>
      <Text style={positionStyle(tokens.fontDisplay, tokens.black)}>{position}</Text>
      <View style={{ transform: unskew as any }}>
        {isHidden ? (
          <View style={hiddenArtStyle}>
            <Text style={hiddenArtGlyphStyle(tokens.fontDisplay)}>?</Text>
          </View>
        ) : item.track_art_url ? (
          <Image source={{ uri: item.track_art_url }} style={artStyle} />
        ) : (
          <View style={[artStyle as ViewStyle, { backgroundColor: tokens.creamDark }]} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0, transform: unskew as any }}>
        <Text style={titleStyle(tokens.fontDisplay, tokens.black)} numberOfLines={1}>
          {isHidden ? 'HIDDEN SONG' : item.track_name}
        </Text>
        {isHidden ? null : (
          <Text style={artistStyle(tokens.fontBody, tokens.muted)} numberOfLines={1}>
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
      <View style={{ transform: unskew as any }}>
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
      style={({ pressed }) => [
        editBtnStyle,
        pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] as any, shadowOpacity: 0 } : null,
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
    <View style={singerPillStyle}>
      <View style={[singerDotStyle, { backgroundColor: singer.color || tokens.vividYellow }]}>
        {singer.profilePicture ? (
          <Image source={{ uri: singer.profilePicture }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text style={singerInitialStyle(tokens.black)}>{initial}</Text>
        )}
      </View>
      <Text style={singerNameStyle(tokens.fontDisplay, tokens.black)} numberOfLines={1}>
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
      <View style={lockBadgeStyle}>
        <Ionicons name="lock-closed" size={18} color={tokens.black} />
        <Text style={lockLabelStyle(tokens.fontDisplay, tokens.black)}>
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
          <Ionicons name="checkmark" size={11} color={tokens.black} />
          <Text style={votedPillLabelStyle(tokens.fontDisplay, tokens.black)}>
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
            voteBtnStyle('up'),
            pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] as any, shadowOpacity: 0 } : null,
          ]}
          accessibilityLabel="Upvote"
        >
          <Ionicons name="chevron-up" size={18} color={tokens.black} />
        </Pressable>
        <Pressable
          onPress={() => onVote(row, -1)}
          style={({ pressed }) => [
            voteBtnStyle('down'),
            pressed ? { transform: [{ translateX: 2 }, { translateY: 2 }] as any, shadowOpacity: 0 } : null,
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
  return <Text style={[scoreStyle(tokens.fontDisplay), { color }]}>{score}</Text>
}

// ─── styles ───────────────────────────────────────────────────────────────

function positionStyle(font: string, color: string): TextStyle {
  return {
    fontFamily: font,
    fontWeight: 'normal',
    fontSize: 24,
    color,
    opacity: 0.7,
    minWidth: 22,
    textAlign: 'center',
  }
}

const artStyle: ImageStyle = {
  width: 48,
  height: 48,
  borderRadius: 2,
  borderBottomLeftRadius: 5,
  borderTopRightRadius: 4,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.15)',
}

const hiddenArtStyle: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 2,
  borderBottomLeftRadius: 5,
  borderTopRightRadius: 4,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.15)',
  backgroundColor: '#f7f4ec',
  alignItems: 'center',
  justifyContent: 'center',
}

function hiddenArtGlyphStyle(font: string): TextStyle {
  return {
    color: 'rgba(0,0,0,0.3)',
    fontFamily: font,
    fontSize: 24,
    fontWeight: 'normal',
    lineHeight: 28,
  }
}

function titleStyle(font: string, color: string): TextStyle {
  return {
    fontFamily: font,
    fontWeight: '800',
    fontSize: 14,
    color,
  }
}

function artistStyle(font: string, color: string): TextStyle {
  return {
    fontFamily: font,
    fontWeight: '500',
    fontSize: 12,
    color,
    marginTop: 1,
  }
}

const singerPillsStyle: ViewStyle = {
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
  backgroundColor: '#FEF9DA',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.15)',
  borderRadius: 2,
  borderBottomLeftRadius: 3,
  borderTopRightRadius: 4,
  transform: [{ rotate: '1deg' }] as any,
}

const singerDotStyle: ViewStyle = {
  width: 16,
  height: 16,
  borderRadius: 99,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

function singerInitialStyle(color: string): TextStyle {
  return {
    color,
    fontWeight: '800',
    fontSize: 10,
  }
}

function singerNameStyle(font: string, color: string): TextStyle {
  return {
    color,
    fontFamily: font,
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

function scoreStyle(font: string): TextStyle {
  return {
    fontFamily: font,
    fontWeight: '900',
    fontSize: 16,
    minWidth: 28,
    textAlign: 'center',
    // Handwritten display fonts have tall ascenders; lineHeight 18 used to
    // clip the top of the digit. 24 gives the glyph room without changing
    // the visual baseline meaningfully.
    lineHeight: 24,
    paddingTop: 2,
  }
}

const voteButtonsStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}

function voteBtnStyle(dir: 'up' | 'down'): ViewStyle {
  return {
    width: 32,
    height: 32,
    borderRadius: 2,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dir === 'up' ? '#FEF9DA' : '#fceceb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    transform: [{ rotate: dir === 'up' ? '-2deg' : '2deg' }] as any,
  }
}

const votedPillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 3,
  backgroundColor: '#FEF9DA',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.15)',
  borderRadius: 2,
  borderBottomRightRadius: 6,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 3,
  transform: [{ rotate: '-1.5deg' }] as any,
}

function votedPillLabelStyle(font: string, color: string): TextStyle {
  return {
    color,
    fontFamily: font,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }
}

const lockBadgeStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  paddingHorizontal: 8,
  paddingVertical: 6,
  backgroundColor: '#FEF9DA',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.15)',
  borderRadius: 2,
  borderBottomRightRadius: 8,
  marginLeft: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  transform: [{ rotate: '2deg' }] as any,
}

function lockLabelStyle(font: string, color: string): TextStyle {
  return {
    color,
    fontFamily: font,
    fontWeight: '800',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  }
}

const editBtnStyle: ViewStyle = {
  width: 40,
  height: 40,
  borderTopLeftRadius: 2,
  borderTopRightRadius: 7,
  borderBottomLeftRadius: 6,
  borderBottomRightRadius: 3,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.18)',
  backgroundColor: '#FEF9DA',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 4,
  alignSelf: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 1, height: 2 },
  shadowOpacity: 0.14,
  shadowRadius: 3,
  transform: [{ rotate: '-2deg' }] as any,
}
