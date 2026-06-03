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
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import { hashKey } from '../../../helpers'
import type { QueueRowProps } from '../../../types'
import { INK, PANEL, RED, YELLOW, BLUE, inkShadow, slam, Halftone, BurstBadge } from './_comic'

// Comic-Book queue row — one PANEL of the comic strip. The rank is a yellow
// starburst panel-number; the art is a square inked comic panel with a halftone
// print; vote controls are halftone-printed ink "stamps" (blue up / red down);
// the score pops in a little burst; the locked next-up song gets a red BOOM
// badge; and a downvoted/upvoted row gets a tilted "VOTED!" stamp. The song
// title + artist are inked in one of five complementary pop palettes, picked
// stably per row so the queue reads like a colourful strip of panels.
const t = COMIC_BOOK_MOBILE

// Five complementary title/artist palettes — all read on the white panel; the
// title is vivid + big, the artist a deeper complementary tone underneath.
const FONT_SCHEMES: Array<{ title: string; artist: string }> = [
  { title: '#FF1F4B', artist: '#1F5C8C' }, // pop red  + deep blue
  { title: '#1E7FD0', artist: '#B4530E' }, // cobalt   + burnt orange
  { title: '#7C4DFF', artist: '#0E7A5F' }, // violet   + deep teal
  { title: '#0E9E4A', artist: '#B01E7A' }, // green    + magenta
  { title: '#E85D04', artist: '#3A3A8C' }, // orange   + indigo
]

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
      (Array.isArray(item.singer_configs) ? item.singer_configs : []).map((sc) => {
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
  const scheme = FONT_SCHEMES[hashKey(item.id) % FONT_SCHEMES.length]

  return (
    <View style={rowStyle}>
      {/* Faint Ben-Day halftone printed across the white panel (clipped to the
          rounded card; sits behind all content). */}
      <View style={cardDotsStyle} pointerEvents="none">
        <Halftone color={INK} opacity={0.07} dot={2} gap={9} />
      </View>

      {/* Panel-number starburst */}
      <BurstBadge size={40} fill={YELLOW} kind="burst">
        <Text style={positionStyle}>{position}</Text>
      </BurstBadge>

      <View>
        {isHidden ? (
          <View style={hiddenArtStyle}>
            <Text style={hiddenArtGlyphStyle}>?</Text>
          </View>
        ) : item.track_art_url ? (
          <View style={artWellStyle}>
            <Image source={{ uri: item.track_art_url }} style={artImgStyle} />
            <Halftone color={INK} opacity={0.1} dot={1.8} gap={5} />
          </View>
        ) : (
          <View style={[artWellStyle, { backgroundColor: t.creamDark }]} />
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[titleStyle, { color: isHidden ? INK : scheme.title }]} numberOfLines={1}>
          {isHidden ? 'HIDDEN SONG' : item.track_name}
        </Text>
        {isHidden ? null : (
          <Text style={[artistStyle, { color: scheme.artist }]} numberOfLines={1}>
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
          <VoteColumn row={item} score={score} voted={voted} isLocked={isLocked} inSong={inSong} onVote={onVote} />
        )}
      </View>
    </View>
  )
}

// ── Subcomponents ──────────────────────────────────────────────────────────
// Halftone-printed ink "stamp" vote button — blue up / red down. The dots are
// clipped to the circle by a nested layer so the outer button can still cast
// its hard ink offset shadow; slams flush on press.
function VoteButton({ dir, color, onPress }: { dir: 'up' | 'down'; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={dir === 'up' ? 'Upvote' : 'Downvote'}
      style={({ pressed }) => [voteBtnBase, { backgroundColor: color }, pressed ? slam(2) : null]}
    >
      <View style={voteBtnClipStyle} pointerEvents="none">
        <Halftone color={INK} opacity={0.2} dot={1.7} gap={4.5} />
      </View>
      <Ionicons name={dir === 'up' ? 'chevron-up' : 'chevron-down'} size={23} color={PANEL} />
    </Pressable>
  )
}

function EditButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [editBtnStyle, pressed ? slam(2) : null]}
    >
      <View style={dotClip(20)} pointerEvents="none">
        <Halftone color={INK} opacity={0.16} dot={1.6} gap={5} />
      </View>
      <Ionicons name="create-outline" size={20} color={INK} />
    </Pressable>
  )
}

function SingerPill({ singer }: { singer: SingerConfig }) {
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  return (
    <View style={singerPillStyle}>
      <View style={dotClip(99)} pointerEvents="none">
        <Halftone color={INK} opacity={0.12} dot={1.4} gap={5} />
      </View>
      <View style={[singerDotStyle, { backgroundColor: singer.color || YELLOW }]}>
        {singer.profilePicture ? (
          <Image source={{ uri: singer.profilePicture }} style={{ width: '100%', height: '100%' }} />
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

function ScoreBurst({ score }: { score: number }) {
  const color = score > 0 ? t.mintGreen : score < 0 ? RED : INK
  return (
    <BurstBadge size={34} fill={PANEL} kind="star">
      <Text style={[scoreStyle, { color }]}>{score > 0 ? `+${score}` : score}</Text>
    </BurstBadge>
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
      <BurstBadge size={72} fill={RED} kind="boom" rotate={6}>
        <Ionicons name="lock-closed" size={15} color={PANEL} />
        <Text style={lockLabelStyle}>NEXT{'\n'}UP!</Text>
      </BurstBadge>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={voteColStyle}>
        <ScoreBurst score={score} />
      </View>
    )
  }

  if (voted) {
    return (
      <View style={voteColStyle}>
        {score !== 0 ? <ScoreBurst score={score} /> : null}
        <View style={votedStampStyle}>
          <View style={dotClip(6)} pointerEvents="none">
            <Halftone color={INK} opacity={0.14} dot={1.5} gap={5} />
          </View>
          <Ionicons name="checkmark" size={11} color={INK} />
          <Text style={votedStampLabelStyle}>{voted > 0 ? 'VOTED!' : 'NOPE!'}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={voteColStyle}>
      {score !== 0 ? <ScoreBurst score={score} /> : null}
      <View style={voteButtonsStyle}>
        <VoteButton dir="up" color={BLUE} onPress={() => onVote(row, 1)} />
        <VoteButton dir="down" color={RED} onPress={() => onVote(row, -1)} />
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
// Absolute, clipped overlay used to print a halftone dot field inside an
// element that ALSO casts an offset shadow (can't put overflow:hidden on the
// element itself, or the shadow gets clipped — so the dots live in this nested
// clip layer behind the content).
function dotClip(radius: number): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius,
    overflow: 'hidden',
  }
}

const rowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 11,
  padding: 13,
  backgroundColor: PANEL,
  borderWidth: 3,
  borderColor: INK,
  borderRadius: 8,
  ...inkShadow(4),
}

const cardDotsStyle: ViewStyle = dotClip(6)

const positionStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontSize: 16,
  color: INK,
}

// Square, sharp-cornered comic panel (no rounded corners) with a heavy ink
// keyline; the halftone print laid over the art sells the printed-comic look.
const artWellStyle: ViewStyle = {
  width: 50,
  height: 50,
  borderRadius: 0,
  borderWidth: 3,
  borderColor: INK,
  overflow: 'hidden',
}

const artImgStyle: ImageStyle = { width: '100%', height: '100%' }

const hiddenArtStyle: ViewStyle = {
  width: 50,
  height: 50,
  borderRadius: 0,
  borderWidth: 3,
  borderColor: INK,
  backgroundColor: INK,
  alignItems: 'center',
  justifyContent: 'center',
}

const hiddenArtGlyphStyle: TextStyle = {
  color: YELLOW,
  fontFamily: t.fontDisplay,
  fontSize: 24,
  lineHeight: 28,
}

const titleStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontSize: 18,
  color: INK,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
}

const artistStyle: TextStyle = {
  fontFamily: t.fontBody,
  fontWeight: '800',
  fontSize: 10.5,
  color: t.muted,
  marginTop: 1,
  textTransform: 'uppercase',
  letterSpacing: 0.2,
}

const singerPillsRowStyle: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }

const singerPillStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  paddingHorizontal: 8,
  paddingLeft: 3,
  paddingVertical: 2,
  backgroundColor: t.cream,
  borderWidth: 2,
  borderColor: INK,
  borderRadius: 99,
}

const singerDotStyle: ViewStyle = {
  width: 16,
  height: 16,
  borderRadius: 99,
  borderWidth: 1.5,
  borderColor: INK,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

const singerInitialStyle: TextStyle = { color: INK, fontWeight: '800', fontSize: 9 }

const singerNameStyle: TextStyle = {
  color: INK,
  fontFamily: t.fontDisplay,
  fontSize: 12,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
}

const voteColStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginLeft: 2,
  alignSelf: 'center',
}

const scoreStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontSize: 12,
  textAlign: 'center',
}

const voteButtonsStyle: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 7 }

const voteBtnBase: ViewStyle = {
  width: 38,
  height: 38,
  borderRadius: 19,
  borderWidth: 3,
  borderColor: INK,
  alignItems: 'center',
  justifyContent: 'center',
  ...inkShadow(2.5),
}

const voteBtnClipStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 19,
  overflow: 'hidden',
}

const votedStampStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
  paddingHorizontal: 8,
  paddingVertical: 3,
  backgroundColor: YELLOW,
  borderWidth: 2.5,
  borderColor: INK,
  borderRadius: 6,
  transform: [{ rotate: '-7deg' }],
  ...inkShadow(2),
}

const votedStampLabelStyle: TextStyle = {
  color: INK,
  fontFamily: t.fontDisplay,
  fontSize: 10,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
}

const lockLabelStyle: TextStyle = {
  color: PANEL,
  fontFamily: t.fontDisplay,
  fontSize: 10,
  lineHeight: 11,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  textAlign: 'center',
  marginTop: 1,
}

const editBtnStyle: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 20,
  borderWidth: 2.5,
  borderColor: INK,
  backgroundColor: YELLOW,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 2,
  alignSelf: 'center',
  ...inkShadow(2),
}
