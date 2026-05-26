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

// Full-screen Oscars-style reveal overlay. Mirrors the 5-phase sequence in
// docs/js/render/awards.js → renderRevealOverlay() (opening, nominees,
// drumroll, winner, finale). The host broadcasts the current step over a
// Supabase channel; every companion shows the same UI in lockstep.

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
  if (step.phase === 'nominees') return <Nominees step={step} />
  if (step.phase === 'drumroll') return <Drumroll step={step} />
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

function Nominees({ step }: { step: AwardsRevealStep }) {
  const award = step.award
  const isPerf = award?.subject_type === 'performance' || award?.subject_type === 'group'
  const maxCount = isPerf ? 5 : 8
  const allCands = step.candidates || []
  const cands = allCands.slice(0, maxCount)
  if (!award) return null
  return (
    <ScrollView
      contentContainerStyle={{ alignItems: 'center', paddingVertical: 24 }}
      style={{ maxHeight: '100%' }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: P.violet,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        <AwardIcon
          iconId={award.icon_id}
          iconDataUrl={award.icon_data_url}
          color="#fff"
          size={40}
        />
      </View>
      <Text
        style={{
          color: P.whiteFaint,
          fontSize: 11,
          letterSpacing: 2,
          fontWeight: '700',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Award {(step.awardIndex ?? 0) + 1} of {step.totalAwards ?? 0}
      </Text>
      <Text
        style={{
          fontFamily: P.fontDisplay,
          fontWeight: '900',
          fontSize: 32,
          color: '#fff',
          textAlign: 'center',
          letterSpacing: -0.5,
          marginBottom: 18,
          paddingHorizontal: 16,
        }}
      >
        {award.title}
      </Text>
      <Text
        style={{
          color: P.whiteFaint,
          fontSize: 11,
          letterSpacing: 2,
          fontWeight: '700',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Nominees
      </Text>
      <View style={{ alignSelf: 'stretch', paddingHorizontal: 8 }}>
        {cands.length === 0 ? (
          <Text style={{ color: P.whiteFaint, fontSize: 13, textAlign: 'center' }}>
            No candidates
          </Text>
        ) : isPerf ? (
          cands.map((c, i) => <NomineeRich key={c.key + i} c={c} index={i} />)
        ) : (
          cands.map((c, i) => <NomineeSimple key={c.key + i} c={c} index={i} />)
        )}
        {allCands.length > maxCount ? (
          <Text
            style={{
              color: P.whiteFaint,
              fontSize: 13,
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            +{allCands.length - maxCount} more
          </Text>
        ) : null}
      </View>
    </ScrollView>
  )
}

function NomineeRich({
  c,
  index,
}: {
  c: NonNullable<AwardsRevealStep['candidates']>[number]
  index: number
}) {
  const visible = useFadeIn(index * 100)
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        opacity: visible,
      }}
    >
      {c.avatarUrl ? (
        <Image
          source={{ uri: c.avatarUrl }}
          style={{ width: 56, height: 56, borderRadius: 10 }}
        />
      ) : (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            backgroundColor: P.violet,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>
            {(c.label || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: '#fff',
            fontFamily: P.fontDisplay,
            fontWeight: '800',
            fontSize: 15,
          }}
          numberOfLines={1}
        >
          {c.label}
        </Text>
        {c.singers && c.singers.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            {c.singers.slice(0, 4).map((s, si) => (
              <View
                key={si}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: s.color || P.violet,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: -4,
                  borderWidth: 1.5,
                  borderColor: '#020206',
                }}
              >
                {s.profilePicture ? (
                  <Image
                    source={{ uri: s.profilePicture }}
                    style={{ width: 22, height: 22, borderRadius: 11 }}
                  />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                    {(s.name || '?').charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
            ))}
            <Text
              style={{ marginLeft: 8, color: P.whiteMuted, fontSize: 12 }}
              numberOfLines={1}
            >
              {c.singers.map((s) => s.name).join(', ')}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  )
}

function NomineeSimple({
  c,
  index,
}: {
  c: NonNullable<AwardsRevealStep['candidates']>[number]
  index: number
}) {
  const visible = useFadeIn(index * 80)
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 8,
        opacity: visible,
      }}
    >
      {c.avatarUrl ? (
        <Image source={{ uri: c.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
      ) : (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: P.violet,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>
            {(c.label || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
        {c.label}
      </Text>
    </Animated.View>
  )
}

function Drumroll({ step }: { step: AwardsRevealStep }) {
  if (!step.award) return null
  const dots = [0, 1, 2, 3, 4]
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: P.violet,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <AwardIcon
          iconId={step.award.icon_id}
          iconDataUrl={step.award.icon_data_url}
          color="#fff"
          size={56}
        />
      </View>
      <Text
        style={{
          fontFamily: P.fontDisplay,
          fontWeight: '900',
          fontSize: 30,
          color: '#fff',
          textAlign: 'center',
          marginBottom: 18,
          paddingHorizontal: 16,
        }}
      >
        {step.award.title}
      </Text>
      <Text
        style={{
          color: P.whiteMuted,
          fontSize: 18,
          fontWeight: '600',
          letterSpacing: 1,
          marginBottom: 22,
        }}
      >
        And the winner is…
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {dots.map((d) => (
          <BouncingDot key={d} delay={d * 120} />
        ))}
      </View>
    </View>
  )
}

function BouncingDot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 350,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [v, delay])
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -10] })
  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: P.violet,
        transform: [{ translateY }],
      }}
    />
  )
}

function Winner({ step }: { step: AwardsRevealStep }) {
  const award = step.award
  if (!award) return null
  const winners = step.winners || []
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
                fontSize: winners.length === 1 ? 32 : 24,
                color: '#fff',
                textAlign: 'center',
              }}
            >
              {winners.map((w) => w.label).join(' · ')}
            </Text>
            {winners.length === 1 && winners[0].subtitle ? (
              <Text
                style={{
                  color: P.whiteMuted,
                  marginTop: 4,
                  fontSize: 14,
                  textAlign: 'center',
                }}
              >
                {winners[0].subtitle}
              </Text>
            ) : winners.length > 1 ? (
              <Text style={{ color: P.whiteMuted, marginTop: 4, fontSize: 14 }}>
                Tied with {step.voteCount ?? 0} vote
                {(step.voteCount ?? 0) === 1 ? '' : 's'} each
              </Text>
            ) : null}
            {winners.length === 1 ? (
              <Text
                style={{
                  color: P.amberLight,
                  marginTop: 10,
                  fontWeight: '800',
                  fontSize: 14,
                  letterSpacing: 1,
                }}
              >
                {step.voteCount ?? 0} vote{(step.voteCount ?? 0) === 1 ? '' : 's'}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
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

