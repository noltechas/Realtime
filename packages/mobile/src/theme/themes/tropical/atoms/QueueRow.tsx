import React, { useMemo } from 'react'
import { Image, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path } from 'react-native-svg'
import type { SingerConfig } from '@karaoke/shared'
import type { QueueRowProps } from '../../../types'
import {
  CARVED,
  CORAL,
  CREAM,
  GUAVA,
  LAGOON,
  PAINTED,
  PAPER,
  Press,
  RAMP_WALNUT,
  SUN,
  Timber,
  WoodMedallion,
  alpha,
  glow,
  lift,
  sans,
  script,
  shade,
  tiki,
  tikiSafe,
  tint,
} from './_tropical'

// Tropical queue row — every song is its own carved teak plank (seeded grain, so
// the board changes plank to plank), read left to right like a sign:
//
//   rank      a real carved medallion — beveled wooden coin, painted sunshine
//             for the #1 spot, bare teak for the rest
//   art       pinned to the plank on a white paper matte, casting its own shadow
//   title     painted cream in the tiki block caps (the stage-lyrics voice),
//             artist stamped small beneath it
//   singers   glossy lei beads threaded with name tags
//   votes     two wooden paddle buttons with painted lagoon/coral chevrons and
//             the score carved between them
//
// The locked next-up song swaps its paddles for a guava-painted ON DECK shingle
// and warms the whole plank with a sunny glow.

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
  const isLocked = !!item.locked && position === 1
  const inSong = useMemo(() => {
    if (guestId && singers.some((s) => s.guestId === guestId)) return true
    const gn = (guestName || '').toLowerCase()
    return !!gn && singers.some((s) => (s.name || '').toLowerCase() === gn)
  }, [singers, guestName, guestId])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden

  return (
    <View style={[{ borderRadius: 17 }, isLocked ? glow('#FFB84D', 3) : lift(2)]}>
      <Timber radius={17} seed={item.id} groove style={{ paddingVertical: 11, paddingLeft: 10, paddingRight: 10 }}>
        <View style={rowStyle}>
          <WoodMedallion size={42} paint={position === 1 ? SUN : undefined}>
            <Text style={rankTextStyle(position === 1)}>{position}</Text>
          </WoodMedallion>

          {/* art on its paper matte */}
          {isHidden ? (
            <View style={matteStyle}>
              <LinearGradient
                colors={[tint(LAGOON, 0.2), shade(LAGOON, 0.25)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[artStyle, { alignItems: 'center', justifyContent: 'center' }]}
              >
                <Text style={script(15, CREAM, PAINTED)}>?</Text>
              </LinearGradient>
            </View>
          ) : (
            <View style={matteStyle}>
              {item.track_art_url ? (
                <Image source={{ uri: item.track_art_url }} style={artStyle} />
              ) : (
                <View style={[artStyle as ViewStyle, { backgroundColor: alpha(LAGOON, 0.3) }]} />
              )}
            </View>
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={titleStyle} numberOfLines={1}>
              {tikiSafe(isHidden ? 'Island Mystery' : item.track_name)}
            </Text>
            <Text style={artistStyle} numberOfLines={1}>
              {isHidden ? 'Revealed on stage' : item.track_artist}
            </Text>
            {singers.length > 0 ? (
              <View style={singerRowStyle}>
                {singers.map((singer, i) => (
                  <LeiTag key={`${item.id}-${i}-${singer.name ?? ''}`} singer={singer} />
                ))}
              </View>
            ) : null}
          </View>

          {isLocked ? (
            <OnDeckShingle />
          ) : isMine ? (
            <PaddleButton kind="edit" onPress={() => onEdit(item)} />
          ) : inSong ? (
            score !== 0 ? (
              <CarvedScore score={score} />
            ) : null
          ) : voted ? (
            <VotedColumn score={score} up={voted > 0} />
          ) : (
            <VoteColumn score={score} onUp={() => onVote(item, 1)} onDown={() => onVote(item, -1)} />
          )}
        </View>
      </Timber>
    </View>
  )
}

// ── Singers as lei beads ───────────────────────────────────────────────────

function LeiTag({ singer }: { singer: SingerConfig }) {
  const color = singer.color || LAGOON
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  return (
    <View style={leiTagStyle}>
      <View style={[beadStyle, { backgroundColor: color }]}>
        {singer.profilePicture ? (
          // Photos stay clean — no gloss/rim overlays on someone's face.
          <Image source={{ uri: singer.profilePicture }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <>
            <Text style={sans(9.5, 'bold', '#FFFFFF')}>{initial}</Text>
            {/* bead gloss — initial beads only */}
            <View pointerEvents="none" style={beadGlossStyle} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 999, borderWidth: 1, borderColor: alpha(shade(color, 0.4), 0.6) }]} />
          </>
        )}
      </View>
      <Text style={sans(11, 'bold', '#4A2A10')} numberOfLines={1}>
        {singer.name || 'Singer'}
      </Text>
    </View>
  )
}

// ── Right-hand controls ────────────────────────────────────────────────────

function Chevron({ dir, color }: { dir: 'up' | 'down'; color: string }) {
  return (
    <Svg width={17} height={11} viewBox="0 0 17 11">
      <Path
        d={dir === 'up' ? 'M2 9 8.5 2.5 15 9' : 'M2 2 8.5 8.5 15 2'}
        stroke={color}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

/** A small wooden paddle button with a painted face. */
function PaddleButton({
  kind,
  onPress,
}: {
  kind: 'up' | 'down' | 'edit'
  onPress: () => void
}) {
  const paint = kind === 'up' ? LAGOON : kind === 'down' ? CORAL : undefined
  return (
    <Press
      onPress={onPress}
      hitSlop={5}
      scaleTo={0.88}
      accessibilityLabel={kind === 'up' ? 'Upvote' : kind === 'down' ? 'Downvote' : 'Edit song'}
      style={[{ borderRadius: 11 }, lift(1)]}
    >
      <Timber
        radius={11}
        paint={paint}
        ramp={RAMP_WALNUT}
        seed={`paddle-${kind}`}
        knot={false}
        style={{ width: 38, height: 32, alignItems: 'center', justifyContent: 'center' }}
      >
        {kind === 'edit' ? <PencilMark /> : <Chevron dir={kind} color={CREAM} />}
      </Timber>
    </Press>
  )
}

function PencilMark() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M4 20l1-4.2L15.4 5.4a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19 4 20Z"
        stroke={CREAM}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

function CarvedScore({ score }: { score: number }) {
  return (
    <View style={carvedScoreStyle}>
      <Text style={[sans(12.5, 'bold'), CARVED]}>{score > 0 ? `+${score}` : score}</Text>
    </View>
  )
}

function VoteColumn({ score, onUp, onDown }: { score: number; onUp: () => void; onDown: () => void }) {
  return (
    <View style={voteColStyle}>
      <PaddleButton kind="up" onPress={onUp} />
      <Text style={[sans(12.5, 'bold', CREAM), PAINTED, { textAlign: 'center' }]}>
        {score > 0 ? `+${score}` : score}
      </Text>
      <PaddleButton kind="down" onPress={onDown} />
    </View>
  )
}

function VotedColumn({ score, up }: { score: number; up: boolean }) {
  return (
    <View style={[voteColStyle, { gap: 4 }]}>
      <Text style={[sans(13, 'bold', CREAM), PAINTED, { textAlign: 'center' }]}>
        {score > 0 ? `+${score}` : score}
      </Text>
      {/* the stamp your vote left on the wood */}
      <View style={[votedStampStyle, { borderColor: up ? tint(LAGOON, 0.25) : tint(CORAL, 0.25) }]}>
        <Text style={tiki(9.5, up ? tint(LAGOON, 0.45) : tint(CORAL, 0.4))}>{up ? 'Voted' : 'Nope'}</Text>
      </View>
    </View>
  )
}

function OnDeckShingle() {
  return (
    <View style={[{ borderRadius: 11, alignSelf: 'center' }, glow(GUAVA, 2)]}>
      <Timber
        radius={11}
        paint={GUAVA}
        seed="ondeck"
        knot={false}
        style={{ width: 58, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 1 }}
      >
        <MicMark />
        <Text style={[tiki(10.5, '#FFFFFF'), { textAlign: 'center', textShadowColor: 'rgba(30,4,14,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }]}>
          {'On\nDeck'}
        </Text>
      </Timber>
    </View>
  )
}

function MicMark() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M12 4.5a2.8 2.8 0 0 1 2.8 2.8v3.9a2.8 2.8 0 0 1-5.6 0V7.3A2.8 2.8 0 0 1 12 4.5Z M6.6 11a5.4 5.4 0 0 0 10.8 0 M12 16.4V20"
        stroke="#FFFFFF"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const rowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
}

function rankTextStyle(lead: boolean): TextStyle {
  return {
    ...sans(14, 'bold', lead ? '#5A3A00' : CREAM),
    ...(lead
      ? { textShadowColor: 'rgba(255,255,255,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }
      : { textShadowColor: 'rgba(30,14,2,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }),
    textAlign: 'center',
  }
}

const matteStyle: ViewStyle = {
  backgroundColor: PAPER,
  borderRadius: 10,
  padding: 2.5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
  elevation: 3,
}

const artStyle = {
  width: 47,
  height: 47,
  borderRadius: 8,
  overflow: 'hidden' as const,
}

// Block-caps title in the tiki face — same voice as the stage lyrics and the
// react-cell labels. Feed it through tikiSafe (its cmap has no apostrophes).
const titleStyle: TextStyle = tiki(15.5, CREAM, {
  ...PAINTED,
  letterSpacing: 0.9,
})

const artistStyle: TextStyle = sans(11, 'bold', 'rgba(255,240,214,0.8)', {
  marginTop: 1,
  letterSpacing: 0.3,
  textShadowColor: 'rgba(30,14,2,0.4)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 1,
})

const singerRowStyle: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 }

const leiTagStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  paddingLeft: 2.5,
  paddingRight: 8,
  paddingVertical: 2.5,
  borderRadius: 999,
  backgroundColor: 'rgba(255,246,224,0.95)',
  borderWidth: 1,
  borderColor: 'rgba(74,42,16,0.4)',
}

const beadStyle: ViewStyle = {
  width: 17,
  height: 17,
  borderRadius: 999,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

const beadGlossStyle: ViewStyle = {
  position: 'absolute',
  top: 1.4,
  left: 2.6,
  width: 10,
  height: 5.5,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.5)',
}

const voteColStyle: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  alignSelf: 'center',
}

const carvedScoreStyle: ViewStyle = {
  alignSelf: 'center',
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 9,
  backgroundColor: 'rgba(255,236,200,0.85)',
  borderWidth: 1,
  borderColor: 'rgba(74,42,16,0.45)',
}

const votedStampStyle: ViewStyle = {
  paddingHorizontal: 7,
  paddingVertical: 3,
  borderRadius: 7,
  borderWidth: 1.5,
  transform: [{ rotate: '-5deg' }],
}
