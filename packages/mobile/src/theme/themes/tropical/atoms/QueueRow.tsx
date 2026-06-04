import React, { useMemo } from 'react'
import { View, Text, Pressable, Image, type ViewStyle, type TextStyle, type ImageStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SingerConfig } from '@karaoke/shared'
import { TROPICAL_MOBILE } from '../../../tokens'
import { hashKey } from '../../../helpers'
import type { QueueRowProps } from '../../../types'
import {
  INK,
  PALM_DK,
  PANEL,
  SAND,
  LAGOON,
  SUNSET,
  HIBISCUS,
  SUN,
  PALM,
  BAMBOO,
  WOOD,
  softShadow,
  press,
  BambooFrame,
  PlankGrain,
} from './_tropical'

// Tropical queue row — a postcard pinned to the board. The rank floats in a
// sunshine disc; the art sits in a bamboo-keyline well; the title is inked in
// one of five island spot colors with the artist beneath. Votes are smooth
// lagoon-up / sunset-down pills; the locked next-up song gets a hibiscus
// "ON DECK" wave badge; a cast vote leaves a tilted wooden stamp.
const t = TROPICAL_MOBILE

const TITLE_SCHEMES: Array<{ title: string; artist: string }> = [
  { title: '#0E8F89', artist: '#1F5C8C' }, // lagoon + deep blue
  { title: '#1E7FD0', artist: '#B0531F' }, // cobalt + burnt orange
  { title: '#C72E6E', artist: '#0E7A5F' }, // hibiscus + deep teal
  { title: '#0E9E4A', artist: '#9A4B12' }, // palm + cocoa
  { title: '#E0561F', artist: '#2C6E8C' }, // sunset + sea blue
]

export function QueueRow({ item, position, voted, guestName, guestId, guests, onVote, onEdit }: QueueRowProps) {
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
  const scheme = TITLE_SCHEMES[hashKey(item.id) % TITLE_SCHEMES.length]

  return (
    <BambooFrame flexFill={false} radius={18} pole={5} shadow={6} innerStyle={rowInnerStyle}>
      {/* faint wood-grain lines across the sand card */}
      <PlankGrain />
      {/* sunshine rank disc */}
      <View style={posDiscStyle}>
        <Text style={positionStyle}>{position}</Text>
      </View>

      {isHidden ? (
        <View style={hiddenArtStyle}>
          <Text style={hiddenArtGlyphStyle}>?</Text>
        </View>
      ) : item.track_art_url ? (
        <View style={artWellStyle}>
          <Image source={{ uri: item.track_art_url }} style={artImgStyle} />
        </View>
      ) : (
        <View style={[artWellStyle, { backgroundColor: SAND }]} />
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[titleStyle, { color: isHidden ? PALM_DK : scheme.title }]} numberOfLines={1}>
          {isHidden ? 'Island Mystery' : item.track_name}
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
    </BambooFrame>
  )
}

function VoteButton({ dir, color, onPress }: { dir: 'up' | 'down'; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={dir === 'up' ? 'Upvote' : 'Downvote'}
      style={({ pressed }) => [voteBtnBase, { backgroundColor: color }, pressed ? press() : null]}
    >
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 13, borderTopRightRadius: 13, backgroundColor: 'rgba(255,255,255,0.22)' }} />
      <Ionicons name={dir === 'up' ? 'chevron-up' : 'chevron-down'} size={23} color={PANEL} />
    </Pressable>
  )
}

function EditButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="Edit song" style={({ pressed }) => [editBtnStyle, pressed ? press() : null]}>
      <Ionicons name="create-outline" size={20} color={PALM_DK} />
    </Pressable>
  )
}

function SingerPill({ singer }: { singer: SingerConfig }) {
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  return (
    <View style={singerPillStyle}>
      <View style={[singerDotStyle, { backgroundColor: singer.color || SUN }]}>
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

function ScorePill({ score }: { score: number }) {
  const color = score > 0 ? PALM : score < 0 ? SUNSET : INK
  return (
    <View style={scorePillStyle}>
      <Text style={[scoreStyle, { color }]}>{score > 0 ? `+${score}` : score}</Text>
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
      <View style={onDeckStyle}>
        <Ionicons name="lock-closed" size={13} color={PANEL} />
        <Text style={onDeckLabelStyle}>ON{'\n'}DECK</Text>
      </View>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={voteColStyle}>
        <ScorePill score={score} />
      </View>
    )
  }

  if (voted) {
    return (
      <View style={voteColStyle}>
        {score !== 0 ? <ScorePill score={score} /> : null}
        <View style={votedStampStyle}>
          <Ionicons name="checkmark" size={11} color="#FFF1D6" />
          <Text style={votedStampLabelStyle}>{voted > 0 ? 'VOTED' : 'NOPE'}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={voteColStyle}>
      {score !== 0 ? <ScorePill score={score} /> : null}
      <View style={voteButtonsStyle}>
        <VoteButton dir="up" color={LAGOON} onPress={() => onVote(row, 1)} />
        <VoteButton dir="down" color={SUNSET} onPress={() => onVote(row, -1)} />
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const rowInnerStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 11,
  padding: 11,
}

const posDiscStyle: ViewStyle = {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: SUN,
  borderWidth: 2,
  borderColor: 'rgba(255,255,255,0.85)',
  alignItems: 'center',
  justifyContent: 'center',
  ...softShadow(3),
}

const positionStyle: TextStyle = {
  fontFamily: t.fontBody,
  fontWeight: '800',
  fontSize: 15,
  color: PALM_DK,
}

const artWellStyle: ViewStyle = {
  width: 50,
  height: 50,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: BAMBOO,
  overflow: 'hidden',
}

const artImgStyle: ImageStyle = { width: '100%', height: '100%' }

const hiddenArtStyle: ViewStyle = {
  width: 50,
  height: 50,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: BAMBOO,
  backgroundColor: WOOD,
  alignItems: 'center',
  justifyContent: 'center',
}

const hiddenArtGlyphStyle: TextStyle = {
  color: SUN,
  fontFamily: t.fontDisplay,
  fontSize: 32,
}

const titleStyle: TextStyle = {
  fontFamily: t.fontBody, // secondary (The Last Trunks) — fonts flipped on this card
  fontSize: 18,
  letterSpacing: 0.3,
}

const artistStyle: TextStyle = {
  fontFamily: t.fontDisplay, // primary (Florida Vibes script) — fonts flipped on this card
  fontWeight: '400',
  fontSize: 17,
  marginTop: 1,
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
  backgroundColor: SAND,
  borderWidth: 1.5,
  borderColor: BAMBOO,
  borderRadius: 99,
}

const singerDotStyle: ViewStyle = {
  width: 16,
  height: 16,
  borderRadius: 99,
  borderWidth: 1.5,
  borderColor: 'rgba(255,255,255,0.85)',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

const singerInitialStyle: TextStyle = { color: PANEL, fontWeight: '800', fontSize: 9 }

const singerNameStyle: TextStyle = {
  color: INK,
  fontFamily: t.fontBody,
  fontWeight: '700',
  fontSize: 12,
  letterSpacing: 0.2,
}

const voteColStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginLeft: 2,
  alignSelf: 'center',
}

const scorePillStyle: ViewStyle = {
  paddingHorizontal: 9,
  paddingVertical: 2,
  borderRadius: 999,
  backgroundColor: SAND,
  borderWidth: 1.5,
  borderColor: BAMBOO,
}

const scoreStyle: TextStyle = {
  fontFamily: t.fontBody,
  fontWeight: '800',
  fontSize: 12,
  textAlign: 'center',
}

const voteButtonsStyle: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 7 }

const voteBtnBase: ViewStyle = {
  width: 38,
  height: 38,
  borderRadius: 13,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  ...softShadow(3),
}

const onDeckStyle: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderRadius: 14,
  backgroundColor: HIBISCUS,
  ...softShadow(5),
}

const onDeckLabelStyle: TextStyle = {
  color: PANEL,
  fontFamily: t.fontBody,
  fontWeight: '800',
  fontSize: 10,
  lineHeight: 11,
  letterSpacing: 0.6,
  textAlign: 'center',
}

const votedStampStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
  paddingHorizontal: 8,
  paddingVertical: 3,
  backgroundColor: WOOD,
  borderRadius: 8,
  transform: [{ rotate: '-6deg' }],
  ...softShadow(2),
}

const votedStampLabelStyle: TextStyle = {
  color: '#FFF1D6',
  fontFamily: t.fontBody,
  fontWeight: '800',
  fontSize: 10,
  letterSpacing: 0.5,
}

const editBtnStyle: ViewStyle = {
  width: 40,
  height: 40,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: BAMBOO,
  backgroundColor: SUN,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 2,
  alignSelf: 'center',
  ...softShadow(3),
}
