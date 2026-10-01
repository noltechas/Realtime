import React, { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Path } from 'react-native-svg'
import type { KaraokeQueueRow, SingerConfig } from '@karaoke/shared'
import type { QueueRowProps } from '../../../types'
import {
  ASH,
  BLOOD,
  BONE,
  CANDLE,
  Candle,
  GlassWindow,
  PEWTER,
  Press,
  SPECTRE,
  SingerRoundel,
  Stone,
  WaxSeal,
  fraktur,
  gothic,
  serif,
  smallCaps,
  toRoman,
  useStorm,
} from './_gothic'

// Gothic queue row: a LEDGER STONE: the carved slabs set into a cathedral floor
// with a name cut into them. Its place in the queue is a Roman numeral in a
// quatrefoil roundel, the art is glazed into a small lancet, and each singer is
// a saint in a little rose window of their own colour.
//
// The row that is ON DECK carries a lit candle standing on its upper edge and is
// washed in its warm light: the one flame in the list, on the one row that has
// earned it. Votes are "blessed" and "cursed".
export function QueueRow({ item, position, voted, guestName, guestId, guests, onVote, onEdit }: QueueRowProps) {
  const flash = useStorm()
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

  const note = isHidden ? 'Sealed' : isLocked ? 'On deck' : inSong ? 'You sing this' : isMine ? 'Yours' : null

  return (
    <View style={{ paddingTop: isLocked ? 18 : 0 }}>
      <Stone
        tone={isLocked ? 'lit' : 'stone'}
        cusp={13}
        seed={`row-${item.id}`}
        glow={isLocked ? CANDLE : undefined}
        contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingLeft: 12, paddingRight: 12 }}
      >
        <Numeral position={position} lit={isLocked} />

        <View style={{ width: 38, height: 50 }}>
          {isHidden ? (
            <View style={{ width: 38, height: 50, alignItems: 'center', justifyContent: 'center' }}>
              <WaxSeal size={36} sigil="skull" />
            </View>
          ) : (
            <GlassWindow width={38} height={50} uri={item.track_art_url} radius={1} quarry={11} flash={flash} fallback={<Ionicons name="musical-notes" size={16} color={CANDLE} />} />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={gothic(16, isHidden ? PEWTER : BONE, 700)}>
            {isHidden ? 'A Sealed Hymn' : item.track_name}
          </Text>
          {!isHidden ? (
            <Text numberOfLines={1} style={serif(13, PEWTER, 'italic', { marginTop: 0 })}>
              {item.track_artist}
            </Text>
          ) : null}
          {note ? <Text style={smallCaps(8.5, isLocked ? CANDLE : inSong ? SPECTRE : PEWTER, { marginTop: 3 })}>{note}</Text> : null}
          {singers.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {singers.map((s, i) => (
                <View key={`${item.id}-${i}-${s.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <SingerRoundel color={s.color || CANDLE} picture={s.profilePicture} initial={(s.name || '?').charAt(0).toUpperCase()} size={20} />
                  <Text numberOfLines={1} style={gothic(12, BONE, 600, { maxWidth: 96 })}>
                    {s.name || 'Singer'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {isMine ? (
          <Press onPress={() => onEdit(item)} hitSlop={6}>
            <Stone tone="crypt" cusp={8} groove={false} shadow={false} seed={`edit-${item.id}`} contentStyle={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="create-outline" size={18} color={CANDLE} />
            </Stone>
          </Press>
        ) : (
          <Votes row={item} score={score} voted={voted} isLocked={isLocked} inSong={inSong} onVote={onVote} />
        )}
      </Stone>
      {/* The on-deck candle, standing on the ledger's top edge. */}
      {isLocked ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: -6, right: 22 }}>
          <Candle width={9} height={22} seed={3} halo={1.4} />
        </View>
      ) : null}
    </View>
  )
}

/** The position, as a Roman numeral in a carved quatrefoil roundel. */
function Numeral({ position, lit }: { position: number; lit: boolean }) {
  const roman = toRoman(position)
  const S = 40
  const c = S / 2
  const r = 7.6
  return (
    <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={S} height={S} style={{ position: 'absolute' }}>
        {[0, 90, 180, 270].map((a) => (
          <Circle
            key={a}
            cx={c + Math.cos((a * Math.PI) / 180) * r}
            cy={c + Math.sin((a * Math.PI) / 180) * r}
            r={r + 3.4}
            fill={lit ? '#2E2016' : '#0E0C12'}
            stroke={lit ? 'rgba(227,176,75,0.55)' : 'rgba(175,195,234,0.22)'}
            strokeWidth={1}
          />
        ))}
        <Circle cx={c} cy={c} r={r + 2.8} fill={lit ? '#2E2016' : '#0E0C12'} />
        <Path d={`M ${c - 9} ${c + 12} L ${c + 9} ${c + 12}`} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
      </Svg>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        style={serif(roman.length > 3 ? 11 : 14, lit ? CANDLE : BONE, 'bold', { letterSpacing: 0.5, maxWidth: 30, textAlign: 'center' })}
      >
        {roman}
      </Text>
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
      <View style={{ width: 42, alignItems: 'center', gap: 1 }}>
        <Ionicons name="lock-closed" size={15} color={CANDLE} />
        <Text style={fraktur(15, CANDLE, { lineHeight: 18 })}>Next</Text>
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
      <View style={{ width: 46, alignItems: 'center', gap: 2 }}>
        {score !== 0 ? <Score score={score} /> : null}
        <Ionicons name={up ? 'arrow-up-circle' : 'arrow-down-circle'} size={17} color={up ? CANDLE : BLOOD} />
        <Text style={smallCaps(7.5, up ? CANDLE : BLOOD)}>{up ? 'Blessed' : 'Cursed'}</Text>
      </View>
    )
  }
  return (
    <View style={{ width: 42, alignItems: 'center', gap: 4 }}>
      <VoteKey up onPress={() => onVote(row, 1)} />
      {score !== 0 ? <Score score={score} /> : <View style={{ height: 14 }} />}
      <VoteKey up={false} onPress={() => onVote(row, -1)} />
    </View>
  )
}

/** A small iron-framed stone key with a spear-tipped chevron. */
function VoteKey({ up, onPress }: { up: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {({ pressed }) => (
        <View
          style={{
            width: 34,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? '#1A1620' : '#0E0C12',
            borderWidth: 1,
            borderColor: up ? 'rgba(227,176,75,0.4)' : 'rgba(195,32,58,0.45)',
          }}
        >
          <Ionicons name={up ? 'chevron-up' : 'chevron-down'} size={15} color={up ? CANDLE : '#E0566A'} />
        </View>
      )}
    </Pressable>
  )
}

function Score({ score }: { score: number }) {
  const color = score > 0 ? CANDLE : score < 0 ? '#E0566A' : ASH
  return <Text style={serif(14, color, 'bold')}>{score > 0 ? `+${score}` : score}</Text>
}
