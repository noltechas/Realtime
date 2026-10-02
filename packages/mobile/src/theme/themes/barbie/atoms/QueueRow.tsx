import React, { useMemo } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type { KaraokeQueueRow, SingerConfig } from '@karaoke/shared'
import type { QueueRowProps } from '../../../types'
import {
  BUBBLE,
  CANDY,
  Cloud,
  Gloss,
  LILAC,
  MUTED,
  PINK,
  PLUM,
  Press,
  SUN,
  Sun,
  SunBadge,
  SingerSun,
  Twinkle,
  WHITE,
  body,
  caps,
  display,
} from './_barbie'

// Barbie queue row: a glossy white card with your PLACE IN THE SUN: the queue
// position is a little scalloped sun, the album art a round print with a white
// rim, and each singer a sun badge in their own colour. The row that's on deck
// is lit Barbie pink with a real sun rising behind its number. A surprise song
// is the sun behind a cloud. Votes are hearts: love it, or not for me.
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

  const ink = isLocked ? WHITE : PLUM
  const sub = isLocked ? '#FFE3F0' : MUTED
  const note = isHidden ? 'Surprise' : isLocked ? 'Up next' : inSong ? "You're singing" : isMine ? 'Yours' : null

  return (
    <Gloss
      tone={isLocked ? 'pink' : 'white'}
      radius={24}
      contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingLeft: 10, paddingRight: 12 }}
    >
      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        {isLocked ? (
          <View style={{ position: 'absolute', left: -14, top: -14 }}>
            <Sun size={72} halo={false} />
          </View>
        ) : null}
        {isLocked ? <Text style={display(20, PINK, { lineHeight: 26, paddingRight: 0 })}>{position}</Text> : <SunBadge n={position} size={42} />}
      </View>

      <View style={{ width: 46, height: 46 }}>
        {isHidden ? (
          <View style={{ width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: '#BFE8F5', borderWidth: 2, borderColor: WHITE }}>
            <View style={{ position: 'absolute', left: 8, top: 4 }}>
              <Sun size={30} halo={false} spin={false} />
            </View>
            <View style={{ position: 'absolute', left: -6, top: 16 }}>
              <Cloud width={58} seed={0.42} />
            </View>
          </View>
        ) : (
          <View style={{ width: 46, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 2.5, borderColor: WHITE, backgroundColor: CANDY }}>
            {item.track_art_url ? (
              <Image source={{ uri: item.track_art_url }} style={StyleSheet.absoluteFill} />
            ) : (
              <LinearGradient colors={[BUBBLE, PINK]} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="musical-notes" size={18} color={WHITE} />
              </LinearGradient>
            )}
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={display(15.5, isLocked ? WHITE : PINK, { lineHeight: 21, textShadowColor: isLocked ? 'rgba(122,16,78,0.5)' : 'transparent', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 0 })}>
          {isHidden ? 'Surprise Song' : item.track_name}
        </Text>
        {!isHidden ? (
          <Text numberOfLines={1} style={body(12, sub, 600, { marginTop: -1 })}>
            {item.track_artist}
          </Text>
        ) : null}
        {note ? (
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 1.5, borderRadius: 999, backgroundColor: isLocked ? SUN : inSong ? PINK : '#FFE3F0' }}>
              <Text style={caps(8.5, isLocked ? PLUM : inSong ? WHITE : PINK)}>{note}</Text>
            </View>
          </View>
        ) : null}
        {singers.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {singers.map((s, i) => (
              <View key={`${item.id}-${i}-${s.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SingerSun color={s.color || PINK} picture={s.profilePicture} initial={(s.name || '?').charAt(0).toUpperCase()} size={22} />
                <Text numberOfLines={1} style={body(11.5, ink, 700, { maxWidth: 96 })}>
                  {s.name || 'Singer'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {isMine ? (
        <Press onPress={() => onEdit(item)} hitSlop={6}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: PINK, borderWidth: 2.5, borderColor: WHITE, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="pencil" size={16} color={WHITE} />
          </View>
        </Press>
      ) : (
        <Votes row={item} score={score} voted={voted} isLocked={isLocked} inSong={inSong} onVote={onVote} />
      )}
      {isLocked ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: 10, top: 6 }}>
          <Twinkle size={14} color={SUN} period={2800} />
        </View>
      ) : null}
    </Gloss>
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
      <View style={{ width: 44, alignItems: 'center', gap: 2 }}>
        <Ionicons name="lock-closed" size={15} color={WHITE} />
        <Text style={caps(8, WHITE)}>Next</Text>
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
      <View style={{ width: 46, alignItems: 'center', gap: 1 }}>
        {score !== 0 ? <Score score={score} /> : null}
        <Ionicons name={up ? 'heart' : 'heart-dislike'} size={18} color={up ? PINK : LILAC} />
        <Text style={caps(7.5, up ? PINK : MUTED)}>{up ? 'Loved' : 'Pass'}</Text>
      </View>
    )
  }
  return (
    <View style={{ width: 42, alignItems: 'center', gap: 3 }}>
      <VoteKey up onPress={() => onVote(row, 1)} />
      {score !== 0 ? <Score score={score} /> : <View style={{ height: 6 }} />}
      <VoteKey up={false} onPress={() => onVote(row, -1)} />
    </View>
  )
}

/** A little glossy round button: a heart to love it, a broken one for not. */
function VoteKey({ up, onPress }: { up: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {({ pressed }) => (
        <View
          style={{
            width: 32,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? (up ? '#FFD3E8' : '#EEE2FF') : up ? '#FFF0F7' : '#F6F0FF',
            borderWidth: 1.5,
            borderColor: up ? CANDY : '#DCCBF5',
            transform: [{ scale: pressed ? 0.92 : 1 }],
          }}
        >
          <Ionicons name={up ? 'heart' : 'heart-dislike-outline'} size={15} color={up ? PINK : '#9C7BD0'} />
        </View>
      )}
    </Pressable>
  )
}

function Score({ score }: { score: number }) {
  const color = score > 0 ? PINK : score < 0 ? '#9C7BD0' : MUTED
  return <Text style={display(14, color, { lineHeight: 18, paddingRight: 0 })}>{score > 0 ? `+${score}` : score}</Text>
}
