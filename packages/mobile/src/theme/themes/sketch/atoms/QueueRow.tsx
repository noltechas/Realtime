import React, { useMemo } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { KaraokeQueueRow, SingerConfig } from '@karaoke/shared'
import type { QueueRowProps } from '../../../types'
import {
  BLUE,
  FORM,
  GRAPHITE,
  GRAPHITE_SOFT,
  IMG,
  INK,
  LETTER_B,
  Mark,
  PencilBox,
  Press,
  RED,
  RingAround,
  SHEET,
  TapeStrip,
  TapedPrint,
  letter,
  note,
  printed,
  wobble,
} from './_pencil'

// Sketch queue row: a strip of the animator's EXPOSURE SHEET. Printed teal
// rules and column heads (FR., REF., ACTION, VOTE); the song's place written
// in pencil in the frame column (ringed in red when it's next up), its art
// taped up as reference, the title lettered in ink, and each singer
// underlined in their own coloured pencil. A secret song has masking tape
// over its title. Votes are two pencilled boxes.
const RULE = 'rgba(79,138,132,0.55)'

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
  const status = isLocked ? 'next up!' : inSong ? "you're singing" : isMine ? 'your song' : null

  return (
    <View style={styles.strip}>
      {/* FR.: the frame column, its number pencilled in */}
      <View style={[styles.col, { width: 46, alignItems: 'center' }]}>
        <Text style={styles.head}>Fr.</Text>
        <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
          {isLocked ? <RingAround color={RED} variant={position} padX={9} padY={6} /> : null}
          <Text style={note(32, isLocked ? RED : GRAPHITE, { textAlign: 'center' })}>{position}</Text>
        </View>
      </View>
      <View style={styles.vrule} />

      {/* REF.: the art, taped up */}
      <View style={[styles.col, { width: 70, alignItems: 'center' }]}>
        <Text style={[styles.head, { alignSelf: 'flex-start', marginLeft: 6 }]}>Ref.</Text>
        <TapedPrint uri={isHidden ? null : item.track_art_url} size={52} seed={item.id} tape="top" border={3} style={{ marginTop: 8 }}>
          {isHidden ? (
            <View style={{ flex: 1, backgroundColor: '#F3EFE6', alignItems: 'center', justifyContent: 'center' }}>
              <Mark src={IMG.scribble} color={GRAPHITE} width={36} height={10} style={{ opacity: 0.8 }} />
              <Text style={letter(20, RED, { lineHeight: 22 })}>?</Text>
            </View>
          ) : null}
        </TapedPrint>
      </View>
      <View style={styles.vrule} />

      {/* ACTION: the scene itself */}
      <View style={[styles.col, { flex: 1, paddingLeft: 10, paddingRight: 6 }]}>
        <Text style={styles.head}>Action</Text>
        {isHidden ? (
          <TapeStrip height={32} style={{ marginTop: 5, marginLeft: -6, marginRight: 8, transform: [{ rotate: `${wobble(item.id, 3) * 1.6}deg` }] }}>
            <Text style={note(21, GRAPHITE)}>a secret scene</Text>
          </TapeStrip>
        ) : (
          <>
            <Text numberOfLines={1} style={letter(16.5, INK, { marginTop: 3, lineHeight: 21 })}>
              {item.track_name}
            </Text>
            <Text numberOfLines={1} style={note(19, GRAPHITE_SOFT)}>
              {item.track_artist}
            </Text>
          </>
        )}
        {singers.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, marginTop: 5 }}>
            {singers.map((s, i) => (
              <View key={`${item.id}-${i}-${s.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {s.profilePicture ? (
                  <View style={{ width: 18, height: 18, borderRadius: 9, overflow: 'hidden' }}>
                    <Image source={{ uri: s.profilePicture }} style={{ width: '100%', height: '100%' }} />
                  </View>
                ) : null}
                <View>
                  <Text numberOfLines={1} style={letter(13, INK, { maxWidth: 100, lineHeight: 17 }, LETTER_B)}>
                    {s.name || 'Singer'}
                  </Text>
                  <Mark src={IMG.under[i % 2]} color={s.color || RED} width={Math.min(100, Math.max(26, (s.name || 'Singer').length * 7.4))} height={7} style={{ marginTop: -3 }} />
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {status ? <Text style={note(18, isLocked ? RED : BLUE, { marginTop: 3 })}>{status}</Text> : null}
      </View>
      <View style={styles.vrule} />

      {/* VOTE */}
      <View style={[styles.col, { width: 58, alignItems: 'center' }]}>
        <Text style={styles.head}>Vote</Text>
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 4 }}>
          {isMine ? (
            <Press onPress={() => onEdit(item)} hitSlop={6} accessibilityLabel="Edit your song">
              <PencilBox border={11} fill={SHEET} contentStyle={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="create-outline" size={18} color={INK} />
              </PencilBox>
            </Press>
          ) : (
            <Votes row={item} score={score} voted={voted} isLocked={isLocked} inSong={inSong} onVote={onVote} />
          )}
        </View>
      </View>
    </View>
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
      <View style={{ alignItems: 'center', gap: 1 }}>
        <Ionicons name="lock-closed-outline" size={17} color={GRAPHITE} />
        <Text style={note(17, RED)}>held</Text>
      </View>
    )
  }
  if (inSong) {
    return score !== 0 ? <Score score={score} /> : null
  }
  if (voted) {
    const up = voted > 0
    return (
      <View style={{ alignItems: 'center', gap: 2 }}>
        {score !== 0 ? <Score score={score} /> : null}
        <View style={{ paddingHorizontal: 3 }}>
          <RingAround color={RED} variant={up ? 1 : 2} padX={7} padY={5} />
          <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={17} color={INK} />
        </View>
        <Text style={note(16, GRAPHITE_SOFT)}>{up ? 'voted up' : 'voted down'}</Text>
      </View>
    )
  }
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <VoteBox up onPress={() => onVote(row, 1)} />
      {score !== 0 ? <Score score={score} /> : <View style={{ height: 4 }} />}
      <VoteBox up={false} onPress={() => onVote(row, -1)} />
    </View>
  )
}

function VoteBox({ up, onPress }: { up: boolean; onPress: () => void }) {
  return (
    <Press onPress={onPress} hitSlop={6} accessibilityLabel={up ? 'Vote up' : 'Vote down'}>
      <PencilBox border={10} color={up ? GRAPHITE : GRAPHITE_SOFT} fill={SHEET} contentStyle={{ width: 26, height: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={up ? 'chevron-up' : 'chevron-down'} size={16} color={up ? INK : GRAPHITE_SOFT} />
      </PencilBox>
    </Press>
  )
}

function Score({ score }: { score: number }) {
  return <Text style={note(24, score > 0 ? INK : RED)}>{score > 0 ? `+${score}` : score}</Text>
}

const styles = StyleSheet.create({
  // a strip of the exposure sheet, laid on the desk
  strip: {
    flexDirection: 'row',
    minHeight: 104,
    backgroundColor: SHEET,
    borderWidth: 1.2,
    borderColor: RULE,
    shadowColor: '#2A2218',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  col: {
    paddingTop: 5,
    paddingBottom: 8,
  },
  vrule: {
    width: 1,
    backgroundColor: RULE,
  },
  head: {
    ...printed(7.5, FORM),
    opacity: 0.85,
  },
})
