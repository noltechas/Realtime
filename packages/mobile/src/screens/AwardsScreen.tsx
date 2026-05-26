import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Linking,
  Animated,
  Easing,
  FlatList,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, {
  Text as SvgText,
  Path as SvgPath,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg'
import {
  loadAwards,
  castAwardVote,
  createCustomAward,
  updateMyAward,
  deleteMyAward,
  buildAwardCandidates,
  awardCandidateBanned,
  matchCandidateByVote,
  resolveSubjectFromCandidate,
  subscribeToAwards,
  AWARDS_ICON_PAGE_SIZE,
  type AwardSubjectType,
  type AwardsBundle,
  type AwardCandidate,
  type AwardsRevealStep,
  type KaraokeAwardRow,
} from '@karaoke/shared'
import { useSession } from '../hooks/useSession'
import { supabase } from '../supabase/client'
import { AWARDS_PALETTE as P } from '../awards/palette'
import { AwardIcon } from '../awards/AwardIcon'
import {
  ensureAwardsManifest,
  getAwardsManifest,
  awardsFilteredIcons,
  shuffleAwardIcons,
  type AwardsIcon,
} from '../awards/manifest'
import { RevealOverlay } from '../awards/RevealOverlay'

type Sub = 'list' | 'detail' | 'create' | 'edit'

interface CreateDraft {
  title: string
  subjectType: AwardSubjectType
  iconId: string | null
  iconDataUrl: string | null
  visualMode: 'icon' | 'photo'
}

export function AwardsScreen() {
  const { session } = useSession()
  const insets = useSafeAreaInsets()
  const [bundle, setBundle] = useState<AwardsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState<Sub>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CreateDraft | null>(null)
  const [voteConfirm, setVoteConfirm] = useState<{
    awardId: string
    newLabel: string
    oldLabel: string
    subject: { guestId: string | null; queueRowId: string | null }
  } | null>(null)
  const [revealStep, setRevealStep] = useState<AwardsRevealStep | null>(null)
  // Set by castVoteOptimistic; AwardDetail listens for changes and plays an
  // entrance animation on the "Your Vote" card. Cleared automatically after
  // ~1.2s so re-opening the same detail screen later doesn't re-animate.
  const [recentlyVotedAwardId, setRecentlyVotedAwardId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) return
    try {
      const b = await loadAwards(supabase, session.sessionId, session.guestId)
      setBundle(b)
    } catch (err) {
      console.warn('[Awards] load failed:', err)
    }
  }, [session])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    const unsub = subscribeToAwards(supabase, session.sessionId, {
      onAwardsChange: () => void refresh(),
      onOwnVotesChange: () => void refresh(),
      onRevealStep: (step) => setRevealStep(step),
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [session, refresh])

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.appBg }}>
        <View style={{ padding: 24 }}>
          <Text style={{ color: P.whiteMuted }}>No active session.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const awards = bundle?.awards ?? []
  const history = bundle?.history ?? []
  const guests = bundle?.guests ?? []
  const votes = bundle?.votes ?? {}

  const goToList = () => {
    setSub('list')
    setActiveId(null)
    setDraft(null)
    setEditingId(null)
  }

  const openCreate = () => {
    const existing = awards.find((a) => a.created_by_guest_id === session.guestId)
    if (existing) {
      setSub('edit')
      setEditingId(existing.id)
      setDraft({
        title: existing.title,
        subjectType: existing.subject_type,
        iconId: existing.icon_id,
        iconDataUrl: existing.icon_data_url,
        visualMode: existing.icon_data_url ? 'photo' : 'icon',
      })
    } else {
      setSub('create')
      setEditingId(null)
      setDraft({
        title: '',
        subjectType: 'performance',
        iconId: null,
        iconDataUrl: null,
        visualMode: 'icon',
      })
    }
  }

  // Apply (or roll back) a vote in local state without waiting for the DB.
  // The detail screen re-renders immediately with the new "Your Vote" card,
  // and the entrance animation tied to `recentlyVotedAwardId` plays. Errors
  // restore the previous vote and surface an alert.
  const applyOptimisticVote = (
    awardId: string,
    nextVote: typeof votes[string] | null,
  ) => {
    setBundle((prev) => {
      if (!prev) return prev
      const newVotes = { ...prev.votes }
      if (nextVote) newVotes[awardId] = nextVote
      else delete newVotes[awardId]
      return { ...prev, votes: newVotes }
    })
  }

  const castVoteOptimistic = (
    award: KaraokeAwardRow,
    subj: { guestId: string | null; queueRowId: string | null },
  ) => {
    const prevVote = bundle?.votes[award.id] ?? null
    const nextVote = {
      award_id: award.id,
      voter_guest_id: session.guestId,
      subject_guest_id: subj.guestId,
      subject_queue_row_id: subj.queueRowId,
    }
    applyOptimisticVote(award.id, nextVote)
    setRecentlyVotedAwardId(award.id)
    // Auto-clear the animation flag so re-entering the screen later doesn't
    // re-trigger the entrance animation.
    setTimeout(() => {
      setRecentlyVotedAwardId((id) => (id === award.id ? null : id))
    }, 1200)
    castAwardVote(supabase, {
      awardId: award.id,
      guestId: session.guestId,
      subjectGuestId: subj.guestId,
      subjectQueueRowId: subj.queueRowId,
    }).catch((err: any) => {
      applyOptimisticVote(award.id, prevVote)
      Alert.alert('Vote failed', err?.message ?? 'Try again.')
    })
  }

  const onCandidatePress = (award: KaraokeAwardRow, c: AwardCandidate) => {
    if (award.finalized_at) return
    if (awardCandidateBanned(c, session.guestId, session.guestName)) return
    const candidates = buildAwardCandidates(award, history, guests)
    const existing = votes[award.id] || null
    const voted = matchCandidateByVote(award, existing, candidates)
    const subj = resolveSubjectFromCandidate(award, c)
    if (voted && voted.key !== c.key) {
      setVoteConfirm({
        awardId: award.id,
        newLabel: c.label,
        oldLabel: voted.label,
        subject: subj,
      })
      return
    }
    if (voted && voted.key === c.key) return
    castVoteOptimistic(award, subj)
  }

  const confirmVoteSwitch = () => {
    if (!voteConfirm) return
    const { awardId, subject } = voteConfirm
    const award = awards.find((a) => a.id === awardId)
    setVoteConfirm(null)
    if (!award) return
    castVoteOptimistic(award, subject)
  }

  const submitDraft = async () => {
    if (!draft) return
    const title = draft.title.trim()
    if (!title) {
      Alert.alert('Missing title', 'Give your award a name.')
      return
    }
    if (!draft.iconId && !draft.iconDataUrl) {
      Alert.alert('Pick a visual', 'Pick an icon or upload a photo.')
      return
    }
    try {
      if (sub === 'edit' && editingId) {
        await updateMyAward(supabase, editingId, {
          title,
          iconId: draft.iconId,
          iconDataUrl: draft.iconDataUrl,
        })
      } else {
        await createCustomAward(supabase, {
          sessionId: session.sessionId,
          guestId: session.guestId,
          title,
          subjectType: draft.subjectType,
          iconId: draft.iconId,
          iconDataUrl: draft.iconDataUrl,
        })
      }
      await refresh()
      goToList()
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Try again.')
    }
  }

  const deleteDraft = async () => {
    if (!editingId) return
    Alert.alert('Delete award?', 'This will remove the award for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMyAward(supabase, editingId)
            await refresh()
            goToList()
          } catch (err: any) {
            Alert.alert('Delete failed', err?.message ?? 'Try again.')
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.appBg }} edges={['top', 'left', 'right']}>
      <MeshBg />
      {loading && !bundle ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={P.gold} />
        </View>
      ) : sub === 'list' ? (
        <AwardsList
          awards={awards}
          votes={votes}
          ownGuestId={session.guestId}
          onCardPress={(id) => {
            setActiveId(id)
            setSub('detail')
          }}
          onCreatePress={openCreate}
          bottomPadding={insets.bottom + 110}
        />
      ) : sub === 'detail' && activeId ? (
        <AwardDetail
          award={awards.find((a) => a.id === activeId)!}
          history={history}
          guests={guests}
          votes={votes}
          guestId={session.guestId}
          guestName={session.guestName}
          onBack={goToList}
          onCandidatePress={onCandidatePress}
          bottomPadding={insets.bottom + 110}
          justVoted={recentlyVotedAwardId === activeId}
        />
      ) : draft ? (
        <AwardCreate
          isEdit={sub === 'edit'}
          draft={draft}
          setDraft={setDraft}
          onBack={goToList}
          onSubmit={submitDraft}
          onDelete={sub === 'edit' ? deleteDraft : undefined}
          bottomPadding={insets.bottom + 110}
        />
      ) : null}

      <VoteConfirmModal
        confirm={voteConfirm}
        onCancel={() => setVoteConfirm(null)}
        onConfirm={confirmVoteSwitch}
      />

      <RevealOverlay step={revealStep} onDismiss={() => setRevealStep(null)} />
    </SafeAreaView>
  )
}

// Gilded title rendered as SVG so it picks up a real linear gradient from
// champagne → classic gold → antique gold. textAnchor="middle" + x=w/2
// places the glyphs at the visual center of an over-sized viewBox, so the
// title never clips at the edge regardless of how wide the actual rendered
// glyphs end up being.
function GradientTitle({
  text,
  size = 56,
}: {
  text: string
  size?: number
}) {
  // 0.78 × size gives a generous-but-not-extreme buffer for Bodoni 72's
  // wider didone capitals. Anything we don't use just becomes empty padding
  // around the centered text.
  const w = Math.max(160, Math.round(text.length * size * 0.78))
  const h = Math.round(size * 1.25)
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <SvgLinearGradient id="awardsTitle" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fce8a4" />
          <Stop offset="0.45" stopColor="#d4af37" />
          <Stop offset="1" stopColor="#8c6d1f" />
        </SvgLinearGradient>
      </Defs>
      <SvgText
        x={w / 2}
        y={size * 0.92}
        textAnchor="middle"
        fill="url(#awardsTitle)"
        fontSize={size}
        fontWeight="400"
        fontFamily={P.fontSerif}
        letterSpacing={1}
      >
        {text}
      </SvgText>
    </Svg>
  )
}

// Theatre-spotlight gradient at the top of the screen — warm gold pool
// dispersing to the dark void below. Subtle but distinctive enough to set
// the "evening at the Academy" tone.
function MeshBg() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
    >
      <LinearGradient
        colors={['rgba(212,175,55,0.10)', 'rgba(140,109,31,0.04)', 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 540,
        }}
      />
    </View>
  )
}

// Decorative gold rule. Optional centerpiece — a diamond / star glyph — for
// section dividers. Used liberally throughout the screen to lend the formal
// program-booklet feel.
function GoldRule({
  glyph,
  flex = 1,
}: {
  glyph?: '◆' | '✦' | '✧' | null
  flex?: number
}) {
  return (
    <View
      style={{
        flex,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <LinearGradient
        colors={['transparent', P.goldEdge, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1, height: 1 }}
      />
      {glyph ? (
        <Text style={{ color: P.gold, fontSize: 10, letterSpacing: 1 }}>{glyph}</Text>
      ) : null}
      <LinearGradient
        colors={['transparent', P.goldEdge, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1, height: 1 }}
      />
    </View>
  )
}

// Corner bracket — four 1px gold lines forming an "L" used to dress the
// edges of cards and frames. Sized by `size`, placed at any corner via
// `corner`. Hard-coded thickness keeps it crisp at 1×, 2×, and 3× scales.
function CornerBracket({
  corner,
  size = 12,
  color = P.goldEdge,
}: {
  corner: 'tl' | 'tr' | 'bl' | 'br'
  size?: number
  color?: string
}) {
  const top = corner === 'tl' || corner === 'tr' ? 0 : undefined
  const bottom = corner === 'bl' || corner === 'br' ? 0 : undefined
  const left = corner === 'tl' || corner === 'bl' ? 0 : undefined
  const right = corner === 'tr' || corner === 'br' ? 0 : undefined
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top, bottom, left, right, width: size, height: size }}
    >
      <View
        style={{
          position: 'absolute',
          top: top !== undefined ? 0 : undefined,
          bottom: bottom !== undefined ? 0 : undefined,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: left !== undefined ? 0 : undefined,
          right: right !== undefined ? 0 : undefined,
          top: 0,
          bottom: 0,
          width: 1,
          backgroundColor: color,
        }}
      />
    </View>
  )
}

// -----------------------------------------------------------------------
// AwardsList — Oscars-style program: gilded title, decorative rules, gold-
// framed award rows. The page is structured like a printed program: title,
// epigraph, section dividers, formal list.
// -----------------------------------------------------------------------
function AwardsList({
  awards,
  votes,
  ownGuestId,
  onCardPress,
  onCreatePress,
  bottomPadding,
}: {
  awards: KaraokeAwardRow[]
  votes: AwardsBundle['votes']
  ownGuestId: string
  onCardPress: (id: string) => void
  onCreatePress: () => void
  bottomPadding: number
}) {
  const ownAward = awards.find((a) => a.created_by_guest_id === ownGuestId)
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 22,
        paddingBottom: bottomPadding,
        paddingTop: 18,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ProgramHeader />

      <CreateAwardCta owned={!!ownAward} ownTitle={ownAward?.title} onPress={onCreatePress} />

      {awards.length === 0 ? (
        <View
          style={{
            paddingVertical: 40,
            paddingHorizontal: 24,
            borderRadius: 14,
            backgroundColor: P.surface,
            borderWidth: 1,
            borderColor: P.goldHairline,
            alignItems: 'center',
            marginTop: 28,
          }}
        >
          <Text
            style={{
              color: P.creamMuted,
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 20,
              fontFamily: P.fontSerif,
            }}
          >
            The program will appear once the host opens the evening.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 18 }}>
          {awards.map((aw) => (
            <AwardCard
              key={aw.id}
              award={aw}
              voted={!!votes[aw.id]}
              finalized={!!aw.finalized_at}
              isOwn={aw.created_by_guest_id === ownGuestId}
              onPress={() => onCardPress(aw.id)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

// Title card at the top of the page. Decorative gold rule, gilded title in
// upright Bodoni, plain subtitle.
function ProgramHeader() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 22, paddingTop: 10 }}>
      <View style={{ alignSelf: 'stretch', marginBottom: 4 }}>
        <GoldRule glyph="✦" />
      </View>
      <GradientTitle text="Awards" size={64} />
      <View style={{ alignSelf: 'stretch', marginTop: 4 }}>
        <GoldRule glyph="✦" />
      </View>
      <Text
        style={{
          marginTop: 14,
          fontFamily: P.fontSerif,
          fontSize: 15,
          color: P.creamMuted,
          textAlign: 'center',
          letterSpacing: 0.3,
          lineHeight: 21,
          maxWidth: 320,
        }}
      >
        Vote anytime. Winners are revealed when the night ends.
      </Text>
    </View>
  )
}

// Create CTA — styled as a "Submit a nomination" plaque rather than a
// generic button. Dashed gold border when empty, solid gold filled when the
// guest already has a custom award.
function CreateAwardCta({
  owned,
  ownTitle,
  onPress,
}: {
  owned: boolean
  ownTitle?: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: owned ? 'solid' : 'dashed',
        borderColor: owned ? P.gold : P.goldHairline,
        backgroundColor: owned ? P.goldWash : 'transparent',
        transform: [{ scale: pressed ? 0.985 : 1 }],
        overflow: 'hidden',
      })}
    >
      {/* Faint gilded wash behind the content when owned */}
      {owned ? (
        <LinearGradient
          pointerEvents="none"
          colors={[P.goldWash, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: P.goldEdge,
          backgroundColor: owned ? P.gold : 'transparent',
        }}
      >
        <PlusOrPencil owned={owned} tinted={owned} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: P.cream,
            fontFamily: P.fontSerif,
            fontSize: 17,
            letterSpacing: 0.2,
          }}
          numberOfLines={1}
        >
          {owned ? ownTitle ?? 'Your nomination' : 'Submit a Nomination'}
        </Text>
        <Text
          style={{
            color: P.creamMuted,
            fontSize: 10,
            marginTop: 4,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: '600',
          }}
        >
          {owned ? 'Tap to edit · one per guest' : 'Add a category to the ballot'}
        </Text>
      </View>
      <Chevron color={P.gold} />
    </Pressable>
  )
}

// AwardCard — gilded program entry. Gold-framed medallion on the left,
// upright serif title in cream, small gold uppercase subject + "your
// nomination" mark. The whole row sits inside a card with a 1px gold-
// hairline border + corner brackets to evoke a printed certificate.
function AwardCard({
  award,
  voted,
  finalized,
  isOwn,
  onPress,
}: {
  award: KaraokeAwardRow
  voted: boolean
  finalized: boolean
  isOwn: boolean
  onPress: () => void
}) {
  const subjectLabel =
    award.subject_type === 'performance'
      ? 'Performance'
      : award.subject_type === 'singer'
        ? 'Singer'
        : 'Duo / Group'
  const borderColor = voted
    ? P.gold
    : finalized
      ? P.goldEdge
      : P.goldHairline
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingLeft: 14,
        paddingRight: 16,
        borderRadius: 12,
        backgroundColor: P.surface,
        borderWidth: 1,
        borderColor,
        marginBottom: 12,
        overflow: 'hidden',
        opacity: finalized ? 0.78 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {/* Subtle gilded wash overlaying the surface when voted */}
      {voted ? (
        <LinearGradient
          pointerEvents="none"
          colors={[P.goldWash, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Corner bracket flourishes — only on the voted state so they read as
          an "awarded" treatment, not visual noise on every card. */}
      {voted ? (
        <>
          <CornerBracket corner="tl" size={10} color={P.gold} />
          <CornerBracket corner="tr" size={10} color={P.gold} />
          <CornerBracket corner="bl" size={10} color={P.gold} />
          <CornerBracket corner="br" size={10} color={P.gold} />
        </>
      ) : null}

      <AwardMedallion award={award} voted={voted} finalized={finalized} />

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text
          style={{
            fontFamily: P.fontSerif,
            fontSize: 19,
            color: P.cream,
            letterSpacing: 0.2,
            lineHeight: 24,
          }}
          numberOfLines={2}
        >
          {award.title}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: P.gold,
              letterSpacing: 2.2,
              fontWeight: '700',
              textTransform: 'uppercase',
            }}
          >
            {subjectLabel}
          </Text>
          {isOwn ? <Dot /> : null}
          {isOwn ? (
            <Text
              style={{
                fontSize: 10,
                color: P.goldBright,
                letterSpacing: 2.2,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Yours
            </Text>
          ) : null}
        </View>
      </View>

      <StatusIndicator voted={voted} finalized={finalized} />
    </Pressable>
  )
}

function Dot() {
  return (
    <View
      style={{
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: P.goldEdge,
      }}
    />
  )
}

function StatusIndicator({ voted, finalized }: { voted: boolean; finalized: boolean }) {
  if (finalized) {
    return (
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: P.goldWash,
          borderWidth: 1,
          borderColor: P.goldHairline,
        }}
      >
        <Text
          style={{
            color: P.gold,
            fontWeight: '700',
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          Closed
        </Text>
      </View>
    )
  }
  if (voted) {
    // Voted = sealed envelope. Filled gold circle with a checkmark — the
    // visual hook the user gets a tiny "thank you for your ballot" cue from.
    return (
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: P.goldEdge,
        }}
      >
        <LinearGradient
          colors={[P.goldBright, P.goldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Check tint="#1a140a" />
      </View>
    )
  }
  return <Chevron color={P.gold} />
}

function Check({ tint = '#ffffff', size = 14 }: { tint?: string; size?: number }) {
  // Real SVG checkmark — composing two rotated Views post-rotate translates
  // in rotated space, which never quite forms the "✓" silhouette. A single
  // stroke path is cheaper and reads correctly at every size.
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <SvgPath
        d="M3.2 8.4 L6.6 11.6 L12.8 5"
        stroke={tint}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

function Chevron({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRightWidth: 1.5,
          borderTopWidth: 1.5,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginLeft: -2,
        }}
      />
    </View>
  )
}

// Gold-framed coin medallion. Outer gold ring, inner dark seal, icon in
// gold. Voted/finalized states swap to a filled gold face with the icon
// reversed out in deep black — like a struck coin.
function AwardMedallion({
  award,
  voted,
  finalized,
}: {
  award: KaraokeAwardRow
  voted: boolean
  finalized: boolean
}) {
  const struck = voted || finalized
  const iconColor = struck ? '#1a140a' : P.gold
  return (
    <View
      style={{
        width: 60,
        height: 60,
        borderRadius: 30,
        padding: 2,
        // Outer ring: gilded gradient. The inner View carves out the dark
        // seal so the 2px gap reads as a separate gold ring (like a coin
        // edge). Drop shadow grounds the medallion.
        shadowColor: struck ? P.gold : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: struck ? 0.5 : 0.35,
        shadowRadius: 10,
        elevation: 6,
      }}
    >
      <LinearGradient
        colors={
          struck
            ? [P.goldBright, P.gold, P.goldDeep]
            : [P.gold, P.goldDeep, P.gold]
        }
        locations={[0, 0.5, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 30,
        }}
      />
      <View
        style={{
          flex: 1,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: struck ? 'transparent' : P.surfaceDeep,
        }}
      >
        {struck ? (
          <LinearGradient
            colors={[P.goldBright, P.gold, P.goldDeep]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <AwardIcon
          iconId={award.icon_id}
          iconDataUrl={award.icon_data_url}
          color={iconColor}
          size={32}
          rounded={false}
        />
      </View>
    </View>
  )
}

// Hero medallion for the detail screen — same gilded-coin language as the
// list, scaled up to 120px so the award reads as a "trophy moment" when
// you open it. Uses three-stop gold gradient on both the ring and the face.
function DetailMedallion({ award }: { award: KaraokeAwardRow; finalized: boolean }) {
  return (
    <View
      style={{
        width: 120,
        height: 120,
        borderRadius: 60,
        padding: 3,
        shadowColor: P.gold,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
        elevation: 14,
      }}
    >
      <LinearGradient
        colors={[P.goldBright, P.gold, P.goldDeep]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 60,
        }}
      />
      <View
        style={{
          flex: 1,
          borderRadius: 57,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[P.goldBright, P.gold, P.goldDeep]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AwardIcon
          iconId={award.icon_id}
          iconDataUrl={award.icon_data_url}
          color="#1a140a"
          size={64}
          rounded={false}
        />
      </View>
    </View>
  )
}

function MetaPill({
  label,
  tone,
}: {
  label: string
  tone: 'gold' | 'goldFilled' | 'dim'
}) {
  const palette = {
    gold: { bg: P.goldWash, fg: P.gold, border: P.goldHairline },
    goldFilled: { bg: P.gold, fg: '#1a140a', border: P.gold },
    dim: { bg: 'transparent', fg: P.creamMuted, border: P.creamGhost },
  }[tone]
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <Text
        style={{
          color: palette.fg,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  )
}

function PlusOrPencil({ owned, tinted }: { owned: boolean; tinted?: boolean }) {
  // Composed from primitive Views — two glyphs we want crisp at every scale.
  // Tinted=true means the glyph sits on a filled gold disc (so it's drawn
  // in deep black); otherwise it sits on the dark canvas and the glyph is
  // gold.
  const c = tinted ? '#1a140a' : P.gold
  if (owned) {
    // Pencil — diagonal stick + tip square
    return (
      <View style={{ width: 16, height: 16, justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={{
            width: 14,
            height: 2.5,
            backgroundColor: c,
            transform: [{ rotate: '-45deg' }],
            borderRadius: 1,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 2,
            bottom: 2,
            width: 4,
            height: 4,
            backgroundColor: c,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    )
  }
  // Plus
  return (
    <View style={{ width: 16, height: 16, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: 12, height: 2, backgroundColor: c, position: 'absolute' }} />
      <View style={{ width: 2, height: 12, backgroundColor: c, position: 'absolute' }} />
    </View>
  )
}

// -----------------------------------------------------------------------
// AwardDetail — vote screen with candidate list.
// -----------------------------------------------------------------------
function AwardDetail({
  award,
  history,
  guests,
  votes,
  guestId,
  guestName,
  onBack,
  onCandidatePress,
  bottomPadding,
  justVoted,
}: {
  award: KaraokeAwardRow
  history: AwardsBundle['history']
  guests: AwardsBundle['guests']
  votes: AwardsBundle['votes']
  guestId: string
  guestName: string
  onBack: () => void
  onCandidatePress: (award: KaraokeAwardRow, c: AwardCandidate) => void
  bottomPadding: number
  justVoted: boolean
}) {
  const candidates = useMemo(
    () => buildAwardCandidates(award, history, guests),
    [award, history, guests],
  )
  const vote = votes[award.id] || null
  const voted = matchCandidateByVote(award, vote, candidates)
  const subjectLabel =
    award.subject_type === 'performance'
      ? 'Pick the best performance'
      : award.subject_type === 'singer'
        ? 'Pick a singer'
        : 'Pick the best duo or group'
  const finalized = !!award.finalized_at

  const emptyMsg =
    award.subject_type === 'singer'
      ? "No singers yet — once someone takes the mic they'll appear here."
      : award.subject_type === 'group'
        ? 'No multi-singer performances yet.'
        : 'No performances yet — check back after a song plays.'

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: bottomPadding,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 8 }}>
        <BackButton onPress={onBack} />
      </View>

      {/* Hero — gilded medallion + serif title centered. Sets the screen up
          as "this is the award you're voting on" before the candidate list. */}
      <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 28 }}>
        <DetailMedallion award={award} finalized={finalized} />
        <View style={{ alignSelf: 'stretch', marginTop: 22, marginBottom: 4 }}>
          <GoldRule glyph="✦" />
        </View>
        <Text
          style={{
            fontFamily: P.fontSerif,
            fontSize: 30,
            color: P.cream,
            letterSpacing: 0.2,
            textAlign: 'center',
            paddingHorizontal: 8,
            lineHeight: 36,
          }}
        >
          {award.title}
        </Text>
        <Text
          style={{
            marginTop: 6,
            fontSize: 11,
            color: P.gold,
            textAlign: 'center',
            fontWeight: '700',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
          }}
        >
          {subjectLabel}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 14,
          }}
        >
          <MetaPill label={award.is_default ? 'Default' : 'Audience'} tone="gold" />
          {finalized ? <MetaPill label="Voting closed" tone="goldFilled" /> : null}
        </View>
      </View>

      {voted ? (
        <YourVoteCard
          voted={voted}
          finalized={finalized}
          animateEntrance={justVoted}
        />
      ) : null}

      {candidates.length === 0 ? (
        <View
          style={{
            padding: 32,
            borderRadius: 12,
            backgroundColor: P.surface,
            borderWidth: 1,
            borderColor: P.goldHairline,
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <Text
            style={{
              color: P.creamMuted,
              fontFamily: P.fontSerif,
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            {emptyMsg}
          </Text>
        </View>
      ) : (
        <>
          <SectionLabel>{voted ? 'Other candidates' : 'Candidates'}</SectionLabel>
          {candidates.map((c) => {
            if (voted && c.key === voted.key) return null
            const banned = awardCandidateBanned(c, guestId, guestName)
            const disabled = finalized || banned
            const hint = finalized
              ? 'Voting closed'
              : banned
                ? "Can't vote for yourself"
                : 'Tap to vote'
            return (
              <Pressable
                key={c.key}
                onPress={() => onCandidatePress(award, c)}
                disabled={disabled}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: P.surface,
                  borderWidth: 1,
                  borderColor: P.goldHairline,
                  marginBottom: 10,
                  minHeight: 84,
                  opacity: disabled ? 0.45 : 1,
                  transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
                })}
              >
                <CandidateAvatar c={c} />
                <View style={{ flex: 1 }}>
                  <Text style={candidateLabelStyle} numberOfLines={1}>
                    {c.label}
                  </Text>
                  {c.subtitle ? (
                    <Text style={candidateSubStyle} numberOfLines={1}>
                      {c.subtitle}
                    </Text>
                  ) : null}
                </View>
                {disabled ? (
                  <Text style={candidateHintStyle}>{hint}</Text>
                ) : (
                  <Chevron color={P.gold} />
                )}
              </Pressable>
            )
          })}
        </>
      )}
    </ScrollView>
  )
}

const candidateLabelStyle = {
  fontFamily: P.fontSerif,
  fontSize: 17,
  color: P.cream,
  lineHeight: 21,
}

const candidateSubStyle = {
  fontSize: 11,
  color: P.gold,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  fontWeight: '700' as const,
  marginTop: 4,
}

const candidateHintStyle = {
  fontSize: 10,
  color: P.creamFaint,
  fontWeight: '700' as const,
  letterSpacing: 1.6,
  textTransform: 'uppercase' as const,
  textAlign: 'right' as const,
  maxWidth: 96,
}

// Your-Vote card with an entrance animation. Triggered whenever the voted
// candidate's key changes (initial render after a fresh vote) AND the parent
// signals `animateEntrance` — both gates so re-entering an already-voted
// screen doesn't replay the spring. The animation is:
//   • scale 0.92 → 1.04 → 1.0 (soft overshoot, like a stamp settling)
//   • opacity 0 → 1
//   • a transient gold glow ring on top of the card that fades out
function YourVoteCard({
  voted,
  finalized,
  animateEntrance,
}: {
  voted: AwardCandidate
  finalized: boolean
  animateEntrance: boolean
}) {
  const enter = useRef(new Animated.Value(animateEntrance ? 0 : 1)).current
  const glow = useRef(new Animated.Value(0)).current
  const lastKey = useRef(voted.key)
  useEffect(() => {
    // Only play on first render with this voted key while the parent flag is
    // set. Subsequent re-renders (e.g. unrelated state changes) keep the
    // animation done.
    if (!animateEntrance) return
    if (lastKey.current !== voted.key) {
      // The voted candidate changed — reset and replay.
      enter.setValue(0)
      glow.setValue(0)
    }
    lastKey.current = voted.key
    Animated.parallel([
      Animated.spring(enter, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [animateEntrance, voted.key, enter, glow])

  const scale = enter.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.92, 1.04, 1],
  })

  return (
    <>
      <SectionLabel>Your Vote</SectionLabel>
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 12,
          backgroundColor: P.goldWash,
          borderWidth: 1,
          borderColor: P.gold,
          marginBottom: 6,
          overflow: 'hidden',
          opacity: enter,
          transform: [{ scale }],
        }}
      >
        {/* Transient gold glow overlay — fades in then out during the
            entrance to sell the "stamped / accepted" beat. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: P.gold,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }),
          }}
        />
        <CornerBracket corner="tl" size={10} color={P.gold} />
        <CornerBracket corner="tr" size={10} color={P.gold} />
        <CornerBracket corner="bl" size={10} color={P.gold} />
        <CornerBracket corner="br" size={10} color={P.gold} />
        <CandidateAvatar c={voted} />
        <View style={{ flex: 1 }}>
          <Text style={candidateLabelStyle} numberOfLines={1}>
            {voted.label}
          </Text>
          {voted.subtitle ? (
            <Text style={candidateSubStyle} numberOfLines={1}>
              {voted.subtitle}
            </Text>
          ) : null}
        </View>
        {!finalized ? (
          <Text style={candidateHintStyle}>Tap to{'\n'}change</Text>
        ) : null}
      </Animated.View>
    </>
  )
}

function CandidateAvatar({ c }: { c: AwardCandidate }) {
  const square = c.type === 'performance' || c.type === 'group'
  const radius = square ? 8 : 30
  if (c.avatar) {
    return (
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: radius + 2,
          padding: 2,
        }}
      >
        <LinearGradient
          colors={[P.goldBright, P.goldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius + 2,
          }}
        />
        <Image
          source={{ uri: c.avatar }}
          style={{
            flex: 1,
            borderRadius: radius,
            backgroundColor: P.surfaceDeep,
          }}
        />
      </View>
    )
  }
  return (
    <View
      style={{
        width: 60,
        height: 60,
        borderRadius: radius,
        backgroundColor: P.surfaceDeep,
        borderWidth: 1,
        borderColor: P.goldEdge,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: P.fontSerif,
          fontSize: 24,
          color: P.gold,
        }}
      >
        {(c.label || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  // Detail-screen variant of the gold rule divider — centered uppercase
  // gold caption flanked by 1px gold hairlines.
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 22,
        marginBottom: 12,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: P.goldHairline }} />
      <Text
        style={{
          color: P.gold,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 2.5,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: P.goldHairline }} />
    </View>
  )
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: P.goldHairline,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      hitSlop={8}
    >
      <View
        style={{
          width: 9,
          height: 9,
          borderTopWidth: 1.5,
          borderLeftWidth: 1.5,
          borderColor: P.gold,
          transform: [{ rotate: '-45deg' }],
          marginLeft: 3,
        }}
      />
    </Pressable>
  )
}

// -----------------------------------------------------------------------
// AwardCreate — title/subject/visual/icon-picker/photo-upload form.
// -----------------------------------------------------------------------
function AwardCreate({
  isEdit,
  draft,
  setDraft,
  onBack,
  onSubmit,
  onDelete,
  bottomPadding,
}: {
  isEdit: boolean
  draft: CreateDraft
  setDraft: (next: CreateDraft) => void
  onBack: () => void
  onSubmit: () => void
  onDelete?: () => void
  bottomPadding: number
}) {
  const [manifestReady, setManifestReady] = useState(!!getAwardsManifest())
  const [shuffled, setShuffled] = useState<AwardsIcon[]>([])
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(AWARDS_ICON_PAGE_SIZE)

  useEffect(() => {
    let alive = true
    if (draft.visualMode !== 'icon') return
    ensureAwardsManifest()
      .then(({ icons }) => {
        if (!alive) return
        setManifestReady(true)
        setShuffled(shuffleAwardIcons(icons))
      })
      .catch((err) => console.warn('[Awards] manifest load failed:', err))
    return () => {
      alive = false
    }
  }, [draft.visualMode])

  const filtered = useMemo(() => {
    if (!manifestReady) return []
    return awardsFilteredIcons(shuffled, getAwardsManifest()?.icons || [], search)
  }, [manifestReady, shuffled, search])

  const pageIcons = filtered.slice(0, visibleCount)
  const hasMore = pageIcons.length < filtered.length

  const pickPhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert(
          'Photo access',
          'We need access to your photos. Enable it in Settings to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      })
      if (result.canceled || !result.assets?.[0]?.base64) return
      const asset = result.assets[0]
      const mime = asset.mimeType ?? 'image/jpeg'
      setDraft({
        ...draft,
        iconDataUrl: `data:${mime};base64,${asset.base64}`,
        iconId: null,
        visualMode: 'photo',
      })
    } catch (err: any) {
      Alert.alert('Photo error', err?.message ?? String(err))
    }
  }, [draft, setDraft])

  // Fixed-column layout: header + form fields stay pinned, the icon picker
  // takes the remaining vertical space and scrolls internally, and the
  // submit row sits above the tab bar. Mirrors the website's
  // .awards-create-shell { flex: column; min-height: calc(100dvh - 80px) }
  // approach so the screen never overflows past the viewport.
  //
  // Intentionally NOT wrapped in KeyboardAvoidingView: when the user taps
  // the icon search input we want the keyboard to slide over the submit row,
  // not push it upward. The form is short enough that the search box stays
  // above the keyboard, and the FlatList still scrolls inside its bounds.
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 18,
          paddingTop: 12,
          paddingBottom: bottomPadding,
        }}
      >
        <View style={{ marginBottom: 18 }}>
          <BackButton onPress={onBack} />
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text
              style={{
                color: P.gold,
                fontSize: 10,
                letterSpacing: 3,
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {isEdit ? 'Edit Your Nomination' : 'Submit a Nomination'}
            </Text>
            <View style={{ alignSelf: 'stretch' }}>
              <GoldRule glyph="✦" />
            </View>
            <Text
              style={{
                fontFamily: P.fontSerif,
                fontSize: 26,
                color: P.cream,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {isEdit ? 'Refine your award' : 'Add a category'}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 13,
                color: P.creamMuted,
                fontFamily: P.fontSerif,
                lineHeight: 18,
                textAlign: 'center',
              }}
            >
              Make it memorable — everyone can vote on it
            </Text>
          </View>
        </View>

        {/* Award name */}
        <View style={{ marginBottom: 14 }}>
          <FieldLabel>Award name</FieldLabel>
          <TextInput
            value={draft.title}
            onChangeText={(v) => setDraft({ ...draft, title: v })}
            placeholder="e.g. Most Dramatic Solo"
            placeholderTextColor={P.creamFaint}
            maxLength={40}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: P.goldHairline,
              borderRadius: 10,
              backgroundColor: P.surface,
              fontFamily: P.fontSerif,
              color: P.cream,
              fontSize: 16,
            }}
          />
        </View>

        {/* Subject segmented */}
        <View style={{ marginBottom: 14 }}>
          <Segmented
            value={draft.subjectType}
            onChange={(v) => setDraft({ ...draft, subjectType: v })}
            options={[
              { value: 'performance', label: 'A performance' },
              { value: 'singer', label: 'A singer' },
              { value: 'group', label: 'A duo/group' },
            ]}
            disabled={isEdit}
          />
        </View>

        {/* Visual toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginBottom: 12,
          }}
        >
          <VisualToggleButton
            label="Pick an icon"
            active={draft.visualMode === 'icon'}
            onPress={() =>
              setDraft({
                ...draft,
                visualMode: 'icon',
                iconDataUrl: null,
              })
            }
          />
          <Text
            style={{
              fontFamily: P.fontDisplay,
              fontWeight: '800',
              fontSize: 11,
              letterSpacing: 2,
              color: P.whiteMuted,
            }}
          >
            OR
          </Text>
          <VisualToggleButton
            label="Upload a photo"
            active={draft.visualMode === 'photo'}
            onPress={async () => {
              setDraft({ ...draft, visualMode: 'photo', iconId: null })
              await pickPhoto()
            }}
          />
        </View>

        {/* Search box (icon mode only) — fixed, doesn't scroll with picker */}
        {draft.visualMode === 'icon' ? (
          <TextInput
            value={search}
            onChangeText={(v) => {
              setSearch(v)
              setVisibleCount(AWARDS_ICON_PAGE_SIZE)
            }}
            placeholder={
              manifestReady
                ? `Search ${getAwardsManifest()?.icons.length ?? 0} icons…`
                : 'Loading icons…'
            }
            placeholderTextColor={P.creamFaint}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderWidth: 1,
              borderColor: P.goldHairline,
              borderRadius: 10,
              backgroundColor: P.surface,
              color: P.cream,
              fontFamily: P.fontSerif,
              fontSize: 14,
              marginBottom: 10,
            }}
          />
        ) : null}

        {/* Flexible region — icon grid OR photo upload card. Takes whatever
            vertical room is left between the fixed form above and the submit
            row below. min-height: 0 lets it shrink on small screens so the
            submit row stays visible. */}
        <View style={{ flex: 1, minHeight: 0 }}>
          {draft.visualMode === 'photo' ? (
            <Pressable
              onPress={() => void pickPhoto()}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                padding: 22,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: P.goldHairline,
                borderStyle: 'dashed',
                backgroundColor: P.surface,
              }}
            >
              {draft.iconDataUrl ? (
                <Image
                  source={{ uri: draft.iconDataUrl }}
                  style={{ width: 128, height: 128, borderRadius: 16 }}
                />
              ) : (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: P.whiteMuted,
                  }}
                />
              )}
              <Text style={{ marginTop: 12, color: P.whiteMuted, fontSize: 13 }}>
                {draft.iconDataUrl ? 'Tap to change' : 'Tap to upload a photo'}
              </Text>
            </Pressable>
          ) : !manifestReady ? (
            <View
              style={{
                flex: 1,
                padding: 32,
                borderRadius: 12,
                backgroundColor: P.surface,
                borderWidth: 1,
                borderColor: P.goldHairline,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator color={P.gold} />
              <Text
                style={{
                  marginTop: 10,
                  color: P.creamMuted,
                  fontFamily: P.fontSerif,
                  fontSize: 13,
                }}
              >
                Loading icon library…
              </Text>
            </View>
          ) : (
            <IconGrid
              icons={pageIcons}
              activeId={draft.iconId}
              onPick={(id) =>
                setDraft({ ...draft, iconId: id, iconDataUrl: null, visualMode: 'icon' })
              }
              hasMore={hasMore}
              onEndReached={() => {
                if (hasMore) setVisibleCount((n) => n + AWARDS_ICON_PAGE_SIZE)
              }}
            />
          )}
        </View>

        {/* Submit row — pinned at the bottom of the screen so it never gets
            pushed off-screen by the icon grid. */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          {onDelete ? (
            <Pressable
              onPress={onDelete}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: P.red,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: P.red,
                  fontFamily: P.fontSerif,
                  fontSize: 15,
                  letterSpacing: 0.4,
                }}
              >
                Delete
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onBack}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: P.goldHairline,
              backgroundColor: 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: P.creamMuted,
                fontFamily: P.fontSerif,
                fontSize: 15,
                letterSpacing: 0.4,
              }}
            >
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={onSubmit}
            style={{
              flex: 1,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              shadowColor: P.gold,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.55,
              shadowRadius: 18,
              elevation: 10,
            }}
          >
            <LinearGradient
              colors={[P.goldBright, P.gold, P.goldDeep]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text
              style={{
                color: '#1a140a',
                fontFamily: P.fontSerif,
                fontSize: 15,
                fontWeight: '700',
                letterSpacing: 0.4,
                paddingVertical: 14,
              }}
            >
              {isEdit ? 'Save' : 'Submit Nomination'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 10,
        color: P.gold,
        fontWeight: '700',
        letterSpacing: 2.5,
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  )
}

// Animated segmented control. A single violet pill slides between the
// option slots with a spring + brief scaleX stretch — same "liquid" feel as
// the bottom tab bar. Two Animated.Values: native-driven transform for the
// pill (fast), JS-driven progress for the per-option text color crossfade.
function Segmented<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
  disabled?: boolean
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const indicatorNative = useRef(new Animated.Value(activeIndex)).current
  const indicatorJS = useRef(new Animated.Value(activeIndex)).current
  const stretch = useRef(new Animated.Value(1)).current
  const [trackWidth, setTrackWidth] = useState(0)
  const optionCount = options.length
  const optionWidth = trackWidth > 0 ? trackWidth / optionCount : 0

  useEffect(() => {
    Animated.parallel([
      Animated.spring(indicatorNative, {
        toValue: activeIndex,
        useNativeDriver: true,
        damping: 16,
        stiffness: 200,
        mass: 1,
      }),
      Animated.spring(indicatorJS, {
        toValue: activeIndex,
        useNativeDriver: false,
        damping: 16,
        stiffness: 200,
        mass: 1,
      }),
      Animated.sequence([
        Animated.timing(stretch, {
          toValue: 1.12,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(stretch, {
          toValue: 1,
          damping: 10,
          stiffness: 220,
          mass: 1,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [activeIndex, indicatorNative, indicatorJS, stretch])

  const inputRange = options.map((_, i) => i)
  const translateX =
    optionWidth > 0
      ? indicatorNative.interpolate({
          inputRange,
          outputRange: inputRange.map((i) => i * optionWidth),
        })
      : 0

  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 4,
        backgroundColor: P.surface,
        borderWidth: 1,
        borderColor: P.goldHairline,
        borderRadius: 10,
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width - 8)}
    >
      {optionWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 4,
            width: optionWidth,
            backgroundColor: P.gold,
            borderRadius: 7,
            transform: [{ translateX }, { scaleX: stretch }],
          }}
        />
      ) : null}
      {options.map((o, i) => {
        const focus = indicatorJS.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        })
        return (
          <Pressable
            key={o.value}
            onPress={() => !disabled && onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ position: 'relative' }}>
              <Text
                style={{
                  fontFamily: P.fontSerif,
                  fontSize: 14,
                  color: P.creamMuted,
                }}
                numberOfLines={1}
              >
                {o.label}
              </Text>
              <Animated.Text
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  fontFamily: P.fontSerif,
                  fontSize: 14,
                  color: '#1a140a',
                  opacity: focus,
                }}
                numberOfLines={1}
              >
                {o.label}
              </Animated.Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

function VisualToggleButton({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: active ? P.gold : P.goldHairline,
        backgroundColor: active ? P.goldWash : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: P.fontSerif,
          fontSize: 14,
          color: active ? P.gold : P.creamMuted,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// Bounded, internally-scrolling icon grid. Sits inside a flex: 1 parent so
// it takes whatever vertical room is left after the form controls above and
// the submit row below. Uses FlatList for windowing — important since the
// manifest has ~7500 icons and a wraps-of-View would mount all of them.
function IconGrid({
  icons,
  activeId,
  onPick,
  hasMore,
  onEndReached,
}: {
  icons: AwardsIcon[]
  activeId: string | null
  onPick: (id: string) => void
  hasMore: boolean
  onEndReached: () => void
}) {
  if (icons.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          padding: 24,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          backgroundColor: P.surface,
          borderWidth: 1,
          borderColor: P.goldHairline,
        }}
      >
        <Text
          style={{
            color: P.creamMuted,
            fontFamily: P.fontSerif,
            fontSize: 14,
          }}
        >
          No icons match. Try a different word.
        </Text>
      </View>
    )
  }
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        backgroundColor: P.surface,
        borderWidth: 1,
        borderColor: P.goldHairline,
        overflow: 'hidden',
      }}
    >
      <FlatList
        data={icons}
        keyExtractor={(ic) => ic.id}
        numColumns={5}
        contentContainerStyle={{ padding: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        onEndReachedThreshold={0.6}
        onEndReached={onEndReached}
        renderItem={({ item: ic }) => {
          const active = activeId === ic.id
          return (
            <View style={{ width: '20%', aspectRatio: 1, padding: 4 }}>
              <Pressable
                onPress={() => onPick(ic.id)}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: active ? P.gold : P.creamGhost,
                  backgroundColor: active ? P.goldWash : P.surfaceDeep,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 6,
                }}
              >
                <AwardIcon
                  iconId={ic.id}
                  color={active ? P.gold : P.creamMuted}
                  size={32}
                />
              </Pressable>
            </View>
          )
        }}
        ListFooterComponent={
          hasMore ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text
                style={{
                  color: P.creamFaint,
                  fontFamily: P.fontSerif,
                  fontSize: 12,
                }}
              >
                Loading more icons…
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

// -----------------------------------------------------------------------
// VoteConfirmModal — "Switch your vote?" overlay.
// -----------------------------------------------------------------------
function VoteConfirmModal({
  confirm,
  onCancel,
  onConfirm,
}: {
  confirm: {
    awardId: string
    newLabel: string
    oldLabel: string
  } | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      transparent
      visible={!!confirm}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(5,4,3,0.85)',
          padding: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: P.surface,
            borderWidth: 1,
            borderColor: P.gold,
            borderRadius: 14,
            padding: 24,
            overflow: 'hidden',
          }}
        >
          <CornerBracket corner="tl" size={14} color={P.gold} />
          <CornerBracket corner="tr" size={14} color={P.gold} />
          <CornerBracket corner="bl" size={14} color={P.gold} />
          <CornerBracket corner="br" size={14} color={P.gold} />
          <Text
            style={{
              fontFamily: P.fontSerif,
              fontSize: 24,
              color: P.cream,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Change your vote?
          </Text>
          <View style={{ marginVertical: 8 }}>
            <GoldRule />
          </View>
          <Text
            style={{
              fontFamily: P.fontSerif,
              fontSize: 15,
              color: P.creamMuted,
              textAlign: 'center',
              marginVertical: 12,
              lineHeight: 22,
            }}
          >
            You already picked{' '}
            <Text style={{ color: P.gold }}>{confirm?.oldLabel ?? ''}</Text>
            . Switch to{' '}
            <Text style={{ color: P.gold }}>{confirm?.newLabel ?? ''}</Text>?
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: P.goldHairline,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: P.creamMuted,
                  fontFamily: P.fontSerif,
                  fontSize: 14,
                  letterSpacing: 0.4,
                }}
              >
                Keep my vote
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={{
                flex: 1,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[P.goldBright, P.gold, P.goldDeep]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text
                style={{
                  color: '#1a140a',
                  fontFamily: P.fontSerif,
                  fontSize: 14,
                  fontWeight: '700',
                  letterSpacing: 0.4,
                  paddingVertical: 12,
                }}
              >
                Switch
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
