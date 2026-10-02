import React, { useMemo } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { KaraokeQueueRow, SingerConfig } from '@karaoke/shared'
import type { QueueRowProps } from '../../../types'
import {
  ArtLabel,
  BinaryMarks,
  DUST,
  ETCH,
  GOLD,
  GOLD_HI,
  GlassPanel,
  GoldenRecord,
  OIII,
  Press,
  STAR,
  Star,
  StaticLabel,
  body,
  mono,
} from './_record'

// Space queue row: an entry in the TRANSMISSION LOG. Its place in the queue is
// written twice, in monospace and beneath it in the record cover's binary;
// the song is a small golden record with its art as the label; each singer is
// a star in their own colour. The row that's on deck is lit: its hairline
// brightens, its record turns. A surprise song's label is radio static.
// Votes make a song brighter or dimmer.
export function QueueRow({ item, position, voted, guestName, guestId, guests, onVote, onEdit }: QueueRowProps) {
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)

  const singers = useMemo<SingerConfig[]>(
    () =>
      (Array.isArray(item.singer_configs) ? item.singer_configs : []).map((config) => {
        // Live name + avatar from the canonical guest record, so profile edits
        // propagate. Name-only singers pass through.
        const guest = config.guestId ? guests.get(config.guestId) : undefined
        return guest ? { ...config, name: guest.name, profilePicture: guest.profile_picture ?? undefined } : config
      }),
    [item.singer_configs, guests],
  )

  const isLocked = !!item.locked && position === 1
  const inSong = useMemo(() => {
    if (guestId && singers.some((s) => s.guestId === guestId)) return true
    const name = (guestName || '').toLowerCase()
    return !!name && singers.some((s) => (s.name || '').toLowerCase() === name)
  }, [singers, guestName, guestId])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden
  const note = isHidden ? 'Encrypted' : isLocked ? 'Next transmission' : inSong ? "You're singing" : isMine ? 'Yours' : null

  return (
    <GlassPanel lit={isLocked} radius={16} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 12, paddingRight: 12 }}>
      <View style={{ width: 30, alignItems: 'center', gap: 4 }}>
        <Text style={mono(16, isLocked ? GOLD_HI : STAR, { letterSpacing: 1 })}>{String(position).padStart(2, '0')}</Text>
        <BinaryMarks n={position} bits={4} height={6} gap={1.6} color={isLocked ? ETCH.strong : ETCH.mid} />
      </View>

      <GoldenRecord size={52} labelRatio={0.64} spin={isLocked} periodMs={6000}>
        {isHidden ? <StaticLabel /> : <ArtLabel uri={item.track_art_url} size={33} />}
      </GoldenRecord>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={body(14.5, STAR, 500, { textTransform: 'uppercase', letterSpacing: 1 })}>
          {isHidden ? 'Unknown signal' : item.track_name}
        </Text>
        {!isHidden ? (
          <Text numberOfLines={1} style={mono(9.5, DUST, { marginTop: 2, letterSpacing: 1.2, textTransform: 'none' })}>
            {item.track_artist}
          </Text>
        ) : null}
        {note ? <Text style={mono(8.5, isLocked ? GOLD : inSong ? OIII : DUST, { marginTop: 4 })}>{note}</Text> : null}
        {singers.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {singers.map((s, i) => (
              <View key={`${item.id}-${i}-${s.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                {s.profilePicture ? (
                  <View style={{ width: 18, height: 18, borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: s.color || GOLD }}>
                    <Image source={{ uri: s.profilePicture }} style={{ width: '100%', height: '100%' }} />
                  </View>
                ) : (
                  <Star size={18} color={s.color || GOLD} />
                )}
                <Text numberOfLines={1} style={body(12, STAR, 500, { maxWidth: 96 })}>
                  {s.name || 'Singer'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {isMine ? (
        <Press onPress={() => onEdit(item)} hitSlop={6} style={{ borderRadius: 20 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: ETCH.strong, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,196,106,0.06)' }}>
            <Ionicons name="create-outline" size={17} color={GOLD_HI} />
          </View>
        </Press>
      ) : (
        <Votes row={item} score={score} voted={voted} isLocked={isLocked} inSong={inSong} onVote={onVote} />
      )}
    </GlassPanel>
  )
}

function Votes({
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
      <View style={{ width: 44, alignItems: 'center', gap: 3 }}>
        <Ionicons name="lock-closed" size={14} color={GOLD} />
        <Text style={mono(8, GOLD)}>Next</Text>
      </View>
    )
  }
  if (inSong) {
    if (score === 0) return null
    return (
      <View style={{ width: 42, alignItems: 'center' }}>
        <Score score={score} />
      </View>
    )
  }
  if (voted) {
    const up = voted > 0
    return (
      <View style={{ width: 52, alignItems: 'center', gap: 3 }}>
        {score !== 0 ? <Score score={score} /> : null}
        <Ionicons name={up ? 'arrow-up-circle' : 'arrow-down-circle'} size={17} color={up ? GOLD_HI : DUST} />
        <Text style={mono(7.5, up ? GOLD : DUST, { letterSpacing: 1 })}>{up ? 'Brighter' : 'Dimmer'}</Text>
      </View>
    )
  }
  return (
    <View style={{ width: 42, alignItems: 'center', gap: 4 }}>
      <VoteKey up onPress={() => onVote(row, 1)} />
      {score !== 0 ? <Score score={score} /> : <View style={{ height: 8 }} />}
      <VoteKey up={false} onPress={() => onVote(row, -1)} />
    </View>
  )
}

function VoteKey({ up, onPress }: { up: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {({ pressed }) => (
        <View
          style={{
            width: 34,
            height: 26,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: up ? ETCH.strong : ETCH.faint,
            backgroundColor: pressed ? 'rgba(233,196,106,0.14)' : 'rgba(2,3,8,0.5)',
          }}
        >
          <Ionicons name={up ? 'chevron-up' : 'chevron-down'} size={15} color={up ? GOLD_HI : DUST} />
        </View>
      )}
    </Pressable>
  )
}

function Score({ score }: { score: number }) {
  const color = score > 0 ? GOLD_HI : score < 0 ? DUST : DUST
  return <Text style={mono(13, color, { letterSpacing: 0.5 })}>{score > 0 ? `+${score}` : score}</Text>
}
