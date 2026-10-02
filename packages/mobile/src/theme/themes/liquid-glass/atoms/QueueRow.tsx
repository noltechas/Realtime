import React, { useMemo } from 'react'
import { Image, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { KaraokeQueueRow, SingerConfig } from '@karaoke/shared'
import type { QueueRowProps } from '../../../types'
import { CYAN, FAINT, Glass, GlassGroup, INK, NIGHT, Press, RED, SOFT, WHITE, YELLOW, sf } from './_glass'

// Liquid Glass queue row: a pane of glass holding the song: its place in line,
// its art, title, artist and singers (each a little disc in their colour). The
// song on deck carries a yellow "Up next" capsule; a surprise song's art is
// behind frosted glass. Votes are two round glass buttons that melt together.
// Nothing is laid over the art: the place number has its own column.
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

  return (
    <Glass radius={26} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingLeft: 8, paddingRight: 11 }}>
      <Text style={sf(15, '700', FAINT, { width: 20, textAlign: 'center', letterSpacing: 0, marginRight: -4 })}>{position}</Text>
      <View style={{ width: 62, height: 62, borderRadius: 15, overflow: 'hidden', backgroundColor: NIGHT }}>
        {!isHidden && item.track_art_url ? <Image source={{ uri: item.track_art_url }} style={{ width: '100%', height: '100%' }} /> : null}
        {isHidden ? (
          <Glass radius={15} shadow={false} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={sf(26, '700', WHITE)}>?</Text>
          </Glass>
        ) : null}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        {isLocked ? (
          <View style={{ alignSelf: 'flex-start', backgroundColor: YELLOW, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 }}>
            <Text style={sf(11, '700', INK, { letterSpacing: 0.2 })}>Up next</Text>
          </View>
        ) : null}
        <Text numberOfLines={1} style={sf(17, '700', WHITE)}>
          {isHidden ? 'A surprise song' : item.track_name}
        </Text>
        <Text numberOfLines={1} style={sf(14, '500', SOFT, { marginTop: 1 })}>
          {isHidden ? 'Revealed when it plays' : item.track_artist}
        </Text>
        {singers.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            {singers.map((s, i) => (
              <View key={`${item.id}-${i}-${s.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: s.color || CYAN, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' }}>
                  {s.profilePicture ? <Image source={{ uri: s.profilePicture }} style={{ width: '100%', height: '100%' }} /> : null}
                </View>
                <Text numberOfLines={1} style={sf(13, '600', WHITE, { maxWidth: 104 })}>
                  {s.name || 'Singer'}
                </Text>
              </View>
            ))}
            {inSong ? <Text style={sf(13, '600', CYAN)}>You</Text> : null}
          </View>
        ) : null}
      </View>

      {isMine ? (
        <Press onPress={() => onEdit(item)} hitSlop={6} accessibilityLabel="Edit your song">
          <Glass radius={21} interactive shadow={false} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="create-outline" size={19} color={WHITE} />
          </Glass>
        </Press>
      ) : (
        <Votes row={item} score={score} voted={voted} isLocked={isLocked} inSong={inSong} onVote={onVote} />
      )}
    </Glass>
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
      <View style={{ width: 42, alignItems: 'center' }}>
        <Ionicons name="lock-closed" size={17} color={SOFT} />
      </View>
    )
  }
  if (inSong) {
    return score !== 0 ? <Score score={score} /> : null
  }
  return (
    // The score sits beside the pair, and the pair (29 + 4 + 29) is exactly the
    // art's 62, so a row with votes is never taller than one without.
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {score !== 0 ? <Score score={score} /> : null}
      <GlassGroup spacing={6} style={{ alignItems: 'center', gap: 4 }}>
        <VoteButton up chosen={voted === 1} dim={voted === -1} onPress={() => onVote(row, 1)} />
        <VoteButton up={false} chosen={voted === -1} dim={voted === 1} onPress={() => onVote(row, -1)} />
      </GlassGroup>
    </View>
  )
}

function VoteButton({ up, chosen, dim, onPress }: { up: boolean; chosen: boolean; dim: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} disabled={chosen || dim} hitSlop={{ top: 2, bottom: 2, left: 10, right: 10 }} accessibilityLabel={up ? 'Vote up' : 'Vote down'}>
      <Glass radius={14.5} interactive shadow={false} tint={chosen ? (up ? 'rgba(48,209,88,0.55)' : 'rgba(255,69,58,0.5)') : undefined} style={{ width: 29, height: 29, alignItems: 'center', justifyContent: 'center', opacity: dim ? 0.4 : 1 }}>
        <Ionicons name={up ? 'chevron-up' : 'chevron-down'} size={16} color={WHITE} />
      </Glass>
    </Press>
  )
}

function Score({ score }: { score: number }) {
  return <Text style={sf(13, '700', score > 0 ? WHITE : RED, { minWidth: 22, textAlign: 'right' })}>{score > 0 ? `+${score}` : score}</Text>
}

