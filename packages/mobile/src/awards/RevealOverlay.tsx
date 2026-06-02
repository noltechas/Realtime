import React, { useEffect, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  Image,
  Animated,
  Easing,
  ScrollView,
} from 'react-native'
import type { AwardsRevealStep } from '@karaoke/shared'
import { AWARDS_PALETTE as P } from './palette'
import { AwardIcon } from './AwardIcon'

// Full-screen reveal overlay — the companion's simplified, synced view of the
// host's stage reveal. Phases: opening → (per award) finalist ×N → lineup →
// winner → finale. The rich cinematic version (scrolling set lists, winner
// grow) runs on the desktop Stage; phones show this lighter lockstep view.

export function RevealOverlay({
  step,
  onDismiss,
}: {
  step: AwardsRevealStep | null
  onDismiss: () => void
}) {
  const visible = !!step

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#020206',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '20%',
            width: 480,
            height: 480,
            borderRadius: 240,
            backgroundColor: '#140C24',
            opacity: 0.8,
          }}
        />
        {step ? <PhaseContent step={step} /> : null}
      </View>
    </Modal>
  )
}

function PhaseContent({ step }: { step: AwardsRevealStep }) {
  if (step.phase === 'opening') return <Opening step={step} />
  if (step.phase === 'overview') return <Overview step={step} />
  if (step.phase === 'intro') return <Intro step={step} />
  if (step.phase === 'finalist') return <Finalist step={step} />
  if (step.phase === 'lineup') return <Lineup step={step} />
  if (step.phase === 'winner') return <Winner step={step} />
  if (step.phase === 'finale') return <Finale step={step} />
  return null
}

function Opening({ step }: { step: AwardsRevealStep }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: P.fontDisplay,
          fontWeight: '900',
          fontSize: 48,
          color: '#fff',
          letterSpacing: -1,
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        Tonight's Awards
      </Text>
      <Text style={{ color: P.whiteMuted, fontSize: 16, textAlign: 'center' }}>
        {step.totalAwards ?? 0} categor{(step.totalAwards ?? 0) === 1 ? 'y' : 'ies'} to reveal
      </Text>
    </View>
  )
}

// Overview of every award (icon + name), shown before going one-by-one.
function Overview({ step }: { step: AwardsRevealStep }) {
  const awards = step.overview || []
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 24 }}>
      <Text
        style={{
          color: P.gold,
          fontSize: 12,
          letterSpacing: 4,
          fontWeight: '800',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}
      >
        Tonight's Categories
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {awards.map((a, i) => {
          const iconId = (a as any).iconId ?? (a as any).icon_id ?? null
          const iconDataUrl = (a as any).iconDataUrl ?? (a as any).icon_data_url ?? null
          return (
            <View key={(a as any).id ?? i} style={{ width: 116, alignItems: 'center', marginBottom: 22, paddingHorizontal: 4 }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: P.goldWash,
                  borderWidth: 1,
                  borderColor: P.goldEdge,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <AwardIcon iconId={iconId} iconDataUrl={iconDataUrl} color={P.gold} size={34} />
              </View>
              <Text
                style={{ fontFamily: P.fontSerif, color: P.cream, fontSize: 15, textAlign: 'center', lineHeight: 18 }}
                numberOfLines={3}
              >
                {a.title}
              </Text>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

// Per-award introduction: logo + title + Oscar-style citation (description).
function Intro({ step }: { step: AwardsRevealStep }) {
  const award = step.award
  if (!award) return null
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 24 }}>
      <Text
        style={{
          color: P.gold,
          fontSize: 12,
          letterSpacing: 4,
          fontWeight: '800',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        Award {(step.awardIndex ?? 0) + 1} of {step.totalAwards ?? 0}
      </Text>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: P.goldWash,
          borderWidth: 1.5,
          borderColor: P.goldEdge,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <AwardIcon iconId={award.icon_id} iconDataUrl={award.icon_data_url} color={P.gold} size={52} />
      </View>
      <Text
        style={{
          fontFamily: P.fontSerif,
          fontWeight: '700',
          fontSize: 34,
          color: P.cream,
          textAlign: 'center',
          paddingHorizontal: 16,
          marginBottom: 10,
        }}
      >
        {award.title}
      </Text>
      {award.description ? (
        <Text
          style={{
            fontFamily: P.fontSerif,
            fontStyle: 'italic',
            fontSize: 18,
            lineHeight: 26,
            color: P.creamMuted,
            textAlign: 'center',
            paddingHorizontal: 24,
          }}
        >
          {award.description}
        </Text>
      ) : null}
    </ScrollView>
  )
}

// One finalist spotlight (random order). For singer awards we list the songs
// they sang; for performances/groups we show the song + who was in it. Stats
// stay hidden here — they're revealed on the winner card.
function Finalist({ step }: { step: AwardsRevealStep }) {
  const award = step.award
  const f = step.finalist
  if (!award || !f) return null
  const isSinger = award.subject_type === 'singer'
  const c = f.candidate
  const songs = f.songs || []
  return (
    <ScrollView
      contentContainerStyle={{ alignItems: 'center', paddingVertical: 24 }}
      style={{ maxHeight: '100%' }}
    >
      <Text
        style={{
          color: P.amberLight,
          fontSize: 12,
          letterSpacing: 3,
          fontWeight: '800',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Finalist {f.order + 1} of {f.count}
      </Text>
      <Text
        style={{
          color: P.whiteFaint,
          fontSize: 11,
          letterSpacing: 2,
          fontWeight: '700',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        {award.title}
      </Text>

      {c.avatarUrl ? (
        <Image
          source={{ uri: c.avatarUrl }}
          style={{ width: 130, height: 130, borderRadius: isSinger ? 65 : 18, marginBottom: 14 }}
        />
      ) : (
        <View
          style={{
            width: 130,
            height: 130,
            borderRadius: isSinger ? 65 : 18,
            backgroundColor: P.violet,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 52, fontWeight: '900' }}>
            {(c.label || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text
        style={{
          fontFamily: P.fontDisplay,
          fontWeight: '900',
          fontSize: 30,
          color: '#fff',
          textAlign: 'center',
          letterSpacing: -0.5,
          paddingHorizontal: 16,
        }}
      >
        {isSinger ? c.label : c.trackName || c.label}
      </Text>

      {isSinger ? (
        <View style={{ alignSelf: 'stretch', paddingHorizontal: 8, marginTop: 18 }}>
          <Text
            style={{
              color: P.whiteFaint,
              fontSize: 11,
              letterSpacing: 2,
              fontWeight: '700',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {songs.length ? 'Songs they sang' : 'Took the mic tonight'}
          </Text>
          {songs.map((s, i) => (
            <SongRow key={i} song={s} index={i} />
          ))}
        </View>
      ) : c.singers && c.singers.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {c.singers.slice(0, 5).map((s, si) => (
            <View
              key={si}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: s.color || P.violet,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: -6,
                borderWidth: 1.5,
                borderColor: '#020206',
              }}
            >
              {s.profilePicture ? (
                <Image source={{ uri: s.profilePicture }} style={{ width: 30, height: 30, borderRadius: 15 }} />
              ) : (
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>
                  {(s.name || '?').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          ))}
          <Text style={{ marginLeft: 14, color: P.whiteMuted, fontSize: 13 }} numberOfLines={2}>
            {c.singers.map((s) => s.name).join(', ')}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  )
}

function SongRow({
  song,
  index,
}: {
  song: { trackName: string; trackArtist: string; artUrl: string | null }
  index: number
}) {
  const visible = useFadeIn(index * 90)
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        opacity: visible,
      }}
    >
      {song.artUrl ? (
        <Image source={{ uri: song.artUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            backgroundColor: P.violet,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18 }}>♪</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
          {song.trackName}
        </Text>
        <Text style={{ color: P.whiteMuted, fontSize: 12 }} numberOfLines={1}>
          {song.trackArtist}
        </Text>
      </View>
    </Animated.View>
  )
}

// All ≤3 finalists shown together before the winner is revealed.
function Lineup({ step }: { step: AwardsRevealStep }) {
  const award = step.award
  const lineup = step.lineup || []
  const isSinger = award?.subject_type === 'singer'
  return (
    <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
      <Text
        style={{
          color: P.amberLight,
          fontSize: 12,
          letterSpacing: 3,
          fontWeight: '800',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {lineup.length === 1 ? 'Your finalist' : 'Your finalists'}
      </Text>
      {award ? (
        <Text
          style={{
            color: P.whiteFaint,
            fontSize: 11,
            letterSpacing: 2,
            fontWeight: '700',
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          {award.title}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
        {lineup.map((c) => (
          <View
            key={c.subjectKey}
            style={{
              width: 110,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: 12,
              alignItems: 'center',
            }}
          >
            {c.avatarUrl ? (
              <Image source={{ uri: c.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8 }} />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: P.violet,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>
                  {(c.label || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' }} numberOfLines={2}>
              {isSinger ? c.label : c.trackName || c.label}
            </Text>
            {!isSinger && c.singers && c.singers.length ? (
              <Text style={{ color: P.gold, fontWeight: '600', fontSize: 11, textAlign: 'center', marginTop: 4 }} numberOfLines={2}>
                {c.singers.map((s) => s.name).join(', ')}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  )
}

function Winner({ step }: { step: AwardsRevealStep }) {
  const award = step.award
  if (!award) return null
  const winners = step.winners || []
  const isSinger = award.subject_type === 'singer'
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 16 }}>
      <Confetti />
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: P.violet,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          shadowColor: P.violet,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.6,
          shadowRadius: 28,
          elevation: 12,
        }}
      >
        <AwardIcon
          iconId={award.icon_id}
          iconDataUrl={award.icon_data_url}
          color="#fff"
          size={56}
        />
      </View>
      <Text
        style={{
          color: P.amberLight,
          fontSize: 11,
          letterSpacing: 2,
          fontWeight: '800',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        Winner · {award.title}
      </Text>

      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 20,
          padding: 22,
          alignItems: 'center',
          maxWidth: 480,
          alignSelf: 'stretch',
        }}
      >
        {winners.length === 0 ? (
          <>
            <Text
              style={{
                fontFamily: P.fontDisplay,
                fontSize: 32,
                fontWeight: '900',
                color: '#fff',
                textAlign: 'center',
              }}
            >
              No winner this round
            </Text>
            <Text style={{ color: P.whiteMuted, marginTop: 6, fontSize: 14 }}>
              No votes were cast
            </Text>
          </>
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginBottom: 14,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {flattenWinnerAvatars(winners).map((a, i) => (
                <View
                  key={i}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: P.violet,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {a.uri ? (
                    <Image
                      source={{ uri: a.uri }}
                      style={{ width: 56, height: 56, borderRadius: 28 }}
                    />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>
                      {a.initial}
                    </Text>
                  )}
                </View>
              ))}
            </View>
            <Text
              style={{
                fontFamily: P.fontDisplay,
                fontWeight: '900',
                fontSize: 32,
                color: '#fff',
                textAlign: 'center',
              }}
            >
              {isSinger ? winners[0].label : (winners[0].trackName || winners[0].label)}
            </Text>
            {/* Performance/group → performer names (not the song artist). */}
            {!isSinger && winners[0].singers && winners[0].singers.length ? (
              <Text
                style={{
                  color: P.gold,
                  marginTop: 4,
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                {winners[0].singers.map((s) => s.name).join(', ')}
              </Text>
            ) : null}
            {step.winnerStats ? (
              <View style={{ flexDirection: 'row', gap: 22, marginTop: 18 }}>
                <Stat num={step.winnerStats.score} cap="total score" />
                <Stat
                  num={step.winnerStats.firstPlaceVotes}
                  cap={`1st-place vote${step.winnerStats.firstPlaceVotes === 1 ? '' : 's'}`}
                />
                <Stat
                  num={step.winnerStats.totalVotes}
                  cap={`total vote${step.winnerStats.totalVotes === 1 ? '' : 's'}`}
                />
              </View>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  )
}

// A single winner stat (big amber number + uppercase caption).
function Stat({ num, cap }: { num: number; cap: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: P.amberLight, fontWeight: '900', fontSize: 34, fontFamily: P.fontDisplay }}>
        {num}
      </Text>
      <Text
        style={{
          color: P.whiteFaint,
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          fontWeight: '700',
          marginTop: 2,
          textAlign: 'center',
          maxWidth: 80,
        }}
      >
        {cap}
      </Text>
    </View>
  )
}

function flattenWinnerAvatars(
  winners: NonNullable<AwardsRevealStep['winners']>,
): Array<{ uri: string | null; initial: string }> {
  const out: Array<{ uri: string | null; initial: string }> = []
  winners.forEach((w) => {
    if (w.singers && w.singers.length > 1) {
      w.singers.forEach((s) => {
        out.push({
          uri: s.profilePicture ?? null,
          initial: (s.name || '?').charAt(0).toUpperCase(),
        })
      })
    } else {
      out.push({
        uri: w.avatarUrl ?? null,
        initial: (w.label || '?').charAt(0).toUpperCase(),
      })
    }
  })
  return out
}

function Finale({ step }: { step: AwardsRevealStep }) {
  const summary = step.finaleSummary || []
  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 24 }}>
      <Text
        style={{
          fontFamily: P.fontDisplay,
          fontWeight: '900',
          fontSize: 40,
          color: '#fff',
          textAlign: 'center',
          letterSpacing: -1,
          marginBottom: 28,
        }}
      >
        That's a Wrap!
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -6,
        }}
      >
        {summary.map((s, i) => (
          <View key={i} style={{ width: '50%', padding: 6 }}>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: 14,
                alignItems: 'center',
                minHeight: 160,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: P.violet,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <AwardIcon
                  iconId={s.award.icon_id}
                  iconDataUrl={s.award.icon_data_url}
                  color="#fff"
                  size={28}
                />
              </View>
              <Text
                style={{
                  color: P.whiteMuted,
                  fontSize: 11,
                  letterSpacing: 1.5,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  marginBottom: 4,
                }}
                numberOfLines={2}
              >
                {s.award.title}
              </Text>
              <Text
                style={{
                  fontFamily: P.fontDisplay,
                  fontWeight: '800',
                  fontSize: 14,
                  color: '#fff',
                  textAlign: 'center',
                }}
                numberOfLines={2}
              >
                {s.winners.length ? s.winners.map((w) => w.label).join(' · ') : 'No winner'}
              </Text>
              {s.winners.length === 1 && s.winners[0].subtitle ? (
                <Text
                  style={{
                    color: P.whiteFaint,
                    fontSize: 11,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                >
                  {s.winners[0].subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function Confetti() {
  // 30 falling colored squares — light enough on RN that we don't need a
  // canvas. Each piece picks a random starting x, color, and fall duration.
  const pieces = useRef(
    Array.from({ length: 30 }, () => ({
      left: Math.random(),
      color: ['#fde68a', '#f59e0b', '#ec4899', '#a78bfa', '#22d3ee', '#34d399'][
        Math.floor(Math.random() * 6)
      ],
      duration: 2500 + Math.random() * 1800,
      delay: Math.random() * 1500,
      rotate: Math.floor(Math.random() * 360),
    })),
  ).current
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '100%',
      }}
    >
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} {...p} />
      ))}
    </View>
  )
}

function ConfettiPiece({
  left,
  color,
  duration,
  delay,
  rotate,
}: {
  left: number
  color: string
  duration: number
  delay: number
  rotate: number
}) {
  const y = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [y, duration, delay])
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [-40, 800] })
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: `${left * 100}%`,
        width: 8,
        height: 14,
        backgroundColor: color,
        opacity: 0.85,
        transform: [{ translateY }, { rotate: `${rotate}deg` }],
      }}
    />
  )
}

function useFadeIn(delay: number): Animated.Value {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [v, delay])
  return v
}

