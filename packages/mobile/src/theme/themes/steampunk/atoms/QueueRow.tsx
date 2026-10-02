import React, { useMemo } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { KaraokeQueueRow, SingerConfig } from '@karaoke/shared'
import type { QueueRowProps } from '../../../types'
import {
  BRASS_HI,
  BRASS_LO,
  BrassPlate,
  CAST,
  ENAMEL,
  ENAMEL_HI,
  INK,
  JewelLamp,
  LAMP,
  PARCHMENT,
  PARCHMENT_DIM,
  Plaque,
  Porthole,
  Press,
  RED,
  VERDIGRIS,
  caps,
  display,
  italic,
  mix,
} from './_engine'

// Steampunk queue row: an engine nameplate. The song is seen through a small
// porthole with its place in the queue stamped on a brass tag; each singer is
// a jewel lamp in their own colour. The song on deck is lit: its lamp burns
// and its enamel warms. A surprise song is behind smoked glass, sealed.
// Votes are two brass keys: up for more steam, down for less.
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
  const note = isHidden ? 'Sealed orders' : isLocked ? 'Next on the engine' : inSong ? "You're singing" : isMine ? 'Your song' : null

  return (
    <Plaque
      border={11}
      enamel={isLocked ? [mix(ENAMEL_HI, '#6A5020', 0.35), mix(ENAMEL, '#3A2C10', 0.3), '#0C1511'] : undefined}
      contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 2, paddingLeft: 2, paddingRight: 4 }}
    >
      <View style={{ width: 62, height: 62 }}>
        <Porthole size={62}>
          {isHidden ? (
            <View style={{ flex: 1, alignSelf: 'stretch', backgroundColor: '#1A1511', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={display(20, 'rgba(241,228,198,0.3)')}>?</Text>
            </View>
          ) : item.track_art_url ? (
            <Image source={{ uri: item.track_art_url }} style={{ width: '100%', height: '100%' }} />
          ) : null}
        </Porthole>
        <BrassPlate radius={4} style={{ position: 'absolute', left: -4, bottom: -4 }} contentStyle={{ paddingHorizontal: 5, paddingVertical: 0 }}>
          <Text style={display(12, INK, { lineHeight: 16 })}>{position}</Text>
        </BrassPlate>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[display(16.5, undefined, { lineHeight: 21 }), CAST]}>
          {isHidden ? 'Sealed Orders' : item.track_name}
        </Text>
        {!isHidden ? (
          <Text numberOfLines={1} style={italic(12.5, PARCHMENT_DIM, { marginTop: 0 })}>
            {item.track_artist}
          </Text>
        ) : null}
        {note ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
            {isLocked ? <JewelLamp color={LAMP} size={10} /> : null}
            <Text style={caps(8.5, isLocked ? LAMP : inSong ? VERDIGRIS : PARCHMENT_DIM, { letterSpacing: 1.6 })}>{note}</Text>
          </View>
        ) : null}
        {singers.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 5 }}>
            {singers.map((s, i) => (
              <View key={`${item.id}-${i}-${s.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {s.profilePicture ? (
                  <View style={{ width: 18, height: 18, borderRadius: 9, overflow: 'hidden', borderWidth: 1.5, borderColor: s.color || BRASS_HI }}>
                    <Image source={{ uri: s.profilePicture }} style={{ width: '100%', height: '100%' }} />
                  </View>
                ) : (
                  <JewelLamp color={s.color || LAMP} size={15} />
                )}
                <Text numberOfLines={1} style={display(12.5, PARCHMENT, { maxWidth: 96 })}>
                  {s.name || 'Singer'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {isMine ? (
        <Press onPress={() => onEdit(item)} hitSlop={6}>
          <BrassPlate radius={20} contentStyle={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="create-outline" size={18} color={INK} />
          </BrassPlate>
        </Press>
      ) : (
        <Votes row={item} score={score} voted={voted} isLocked={isLocked} inSong={inSong} onVote={onVote} />
      )}
    </Plaque>
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
        <Ionicons name="lock-closed" size={15} color={LAMP} />
        <Text style={caps(7.5, LAMP, { letterSpacing: 1.2 })}>Next</Text>
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
      <View style={{ width: 54, alignItems: 'center', gap: 3 }}>
        {score !== 0 ? <Score score={score} /> : null}
        <Ionicons name={up ? 'arrow-up-circle' : 'arrow-down-circle'} size={18} color={up ? BRASS_HI : PARCHMENT_DIM} />
        <Text style={caps(7, up ? LAMP : PARCHMENT_DIM, { letterSpacing: 1 })}>{up ? 'More steam' : 'Less steam'}</Text>
      </View>
    )
  }
  return (
    <View style={{ width: 42, alignItems: 'center', gap: 4 }}>
      <VoteKey up onPress={() => onVote(row, 1)} />
      {score !== 0 ? <Score score={score} /> : <View style={{ height: 6 }} />}
      <VoteKey up={false} onPress={() => onVote(row, -1)} />
    </View>
  )
}

function VoteKey({ up, onPress }: { up: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityLabel={up ? 'Vote up' : 'Vote down'}>
      {({ pressed }) => (
        <BrassPlate radius={13} style={{ transform: [{ translateY: pressed ? 1 : 0 }], opacity: up ? 1 : 0.85 }} contentStyle={{ width: 34, height: 26, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={up ? 'chevron-up' : 'chevron-down'} size={15} color={up ? INK : BRASS_LO} />
        </BrassPlate>
      )}
    </Pressable>
  )
}

function Score({ score }: { score: number }) {
  return <Text style={display(15, score > 0 ? LAMP : score < 0 ? RED : PARCHMENT_DIM)}>{score > 0 ? `+${score}` : score}</Text>
}
