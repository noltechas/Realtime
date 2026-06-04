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
import { Ionicons } from '@expo/vector-icons'
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
  setAwardBallot,
  createCustomAward,
  updateMyAward,
  deleteMyAward,
  buildAwardCandidates,
  awardCandidateBanned,
  matchBallot,
  resolveSubjectFromCandidate,
  subscribeToAwards,
  AWARDS_ICON_PAGE_SIZE,
  type AwardSubjectType,
  type AwardsBundle,
  type AwardCandidate,
  type KaraokeAwardRow,
  type KaraokeAwardVoteRow,
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

type Sub = 'list' | 'detail' | 'create' | 'edit'

interface CreateDraft {
  title: string
  description: string
  subjectType: AwardSubjectType
  iconId: string | null
  iconDataUrl: string | null
  visualMode: 'icon' | 'photo'
}

// Step 2 typewriter inscription. The 4 chars at the end is the trailing space —
// keep them in sync with descriptionMeetsMinimum() and the web typewriter.
const AWARDED_TO_PREFIX = 'Awarded to '
const AWARD_DESCRIPTION_MAX = 180

// "Did the guest write something meaningful?" — strips the typewriter prefix
// first so guests aren't credited for just leaving "Awarded to " in the field.
function descriptionMeetsMinimum(value: string): boolean {
  const body = value.startsWith(AWARDED_TO_PREFIX)
    ? value.slice(AWARDED_TO_PREFIX.length)
    : value
  return body.trim().length >= 3
}

// Latin-numeral helper for the "STEP II OF IV" eyebrow. Only ever called with
// 1..4 so a tiny lookup is plenty.
const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' }

export function AwardsScreen() {
  const { session } = useSession()
  const insets = useSafeAreaInsets()
  const [bundle, setBundle] = useState<AwardsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState<Sub>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CreateDraft | null>(null)
  // Set by setBallot when a ballot changes; AwardDetail plays a brief flash on
  // the ballot strip. Cleared automatically after ~1.2s.
  const [recentlyVotedAwardId, setRecentlyVotedAwardId] = useState<string | null>(null)
  // Set by submitDraft when a new (or edited) award lands in the list — the
  // AwardCard runs an entrance animation when this matches its id. Cleared
  // ~1.8s later so re-rendering the list later doesn't re-animate the row.
  const [recentlyCreatedAwardId, setRecentlyCreatedAwardId] = useState<string | null>(null)

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
      // Reveal steps are handled globally by <SessionRevealLayer> (driven off
      // the persisted session row) so the ceremony shows from any tab and
      // resumes after an app reopen — not just while this tab is mounted.
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
        description: existing.description ?? '',
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
        description: '',
        subjectType: 'performance',
        iconId: null,
        iconDataUrl: null,
        visualMode: 'icon',
      })
    }
  }

  // Apply (or roll back) a full ranked ballot in local state without waiting
  // for the DB. The detail screen re-renders immediately with the new slots.
  const applyOptimisticBallot = (awardId: string, rows: KaraokeAwardVoteRow[]) => {
    setBundle((prev) => {
      if (!prev) return prev
      const newVotes = { ...prev.votes }
      if (rows.length) newVotes[awardId] = rows
      else delete newVotes[awardId]
      return { ...prev, votes: newVotes }
    })
  }

  // Persist a reordered ballot. `ordered` is the chosen candidates in rank
  // order (index 0 = 1st place). Writes optimistically, then the whole ballot
  // is replaced server-side; a failure rolls back and alerts.
  const setBallot = (award: KaraokeAwardRow, ordered: AwardCandidate[]) => {
    const prev = bundle?.votes[award.id] ?? []
    const picks = ordered.slice(0, 3).map((c, i) => {
      const subj = resolveSubjectFromCandidate(award, c)
      return { rank: i + 1, subjectGuestId: subj.guestId, subjectQueueRowId: subj.queueRowId }
    })
    const rows: KaraokeAwardVoteRow[] = picks.map((p) => ({
      award_id: award.id,
      voter_guest_id: session.guestId,
      subject_guest_id: p.subjectGuestId,
      subject_queue_row_id: p.subjectQueueRowId,
      rank: p.rank,
    }))
    applyOptimisticBallot(award.id, rows)
    setRecentlyVotedAwardId(award.id)
    setTimeout(() => {
      setRecentlyVotedAwardId((id) => (id === award.id ? null : id))
    }, 1200)
    setAwardBallot(supabase, { awardId: award.id, guestId: session.guestId, picks }).catch(
      (err: any) => {
        applyOptimisticBallot(award.id, prev)
        Alert.alert('Vote failed', err?.message ?? 'Try again.')
      },
    )
  }

  // Optimistic submit: the wizard already gates the Continue button on each
  // step so all fields are validated by the time we get here. We insert
  // (or update) the row in local state immediately, transition back to the
  // list, and only then fire the server call in the background. Refresh
  // reconciles the optimistic temp row with the real one once Supabase
  // responds. No alerts on failure — the user just sees their award stick;
  // if the server rejected it, the next refresh removes it silently.
  const submitDraft = async () => {
    if (!draft) return
    const title = draft.title.trim()
    const description = draft.description.trim()
    // Defensive guard — canAdvance already enforces these on the wizard side.
    if (!title || !descriptionMeetsMinimum(description) || (!draft.iconId && !draft.iconDataUrl)) {
      return
    }
    const isEditFlow = sub === 'edit' && !!editingId
    const editTarget = editingId
    const now = new Date().toISOString()
    const tempId = 'tmp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

    setBundle((prev) => {
      if (!prev) return prev
      if (isEditFlow && editTarget) {
        return {
          ...prev,
          awards: prev.awards.map((a) =>
            a.id === editTarget
              ? {
                  ...a,
                  title,
                  description,
                  icon_id: draft.iconId,
                  icon_data_url: draft.iconDataUrl,
                  updated_at: now,
                }
              : a,
          ),
        }
      }
      const optimistic: KaraokeAwardRow = {
        id: tempId,
        session_id: session.sessionId,
        slug: null,
        title,
        description,
        subject_type: draft.subjectType,
        icon_id: draft.iconId,
        icon_data_url: draft.iconDataUrl,
        is_default: false,
        created_by_guest_id: session.guestId,
        finalized_at: null,
        created_at: now,
        updated_at: now,
      }
      return { ...prev, awards: [...prev.awards, optimistic] }
    })

    const freshId = isEditFlow && editTarget ? editTarget : tempId
    setRecentlyCreatedAwardId(freshId)
    setTimeout(() => {
      setRecentlyCreatedAwardId((id) => (id === freshId ? null : id))
    }, 1800)

    goToList()

    // Background sync; failures are quiet — refresh() will reconcile.
    try {
      if (isEditFlow && editTarget) {
        await updateMyAward(supabase, editTarget, {
          title,
          description,
          iconId: draft.iconId,
          iconDataUrl: draft.iconDataUrl,
        })
      } else {
        await createCustomAward(supabase, {
          sessionId: session.sessionId,
          guestId: session.guestId,
          title,
          description,
          subjectType: draft.subjectType,
          iconId: draft.iconId,
          iconDataUrl: draft.iconDataUrl,
        })
      }
      await refresh()
    } catch (err: any) {
      console.warn('[Awards] save failed:', err?.message ?? err)
      // For create, drop the optimistic temp row so the UI doesn't lie.
      // For edit, refresh restores the prior server state.
      if (!isEditFlow) {
        setBundle((prev) =>
          prev ? { ...prev, awards: prev.awards.filter((a) => a.id !== tempId) } : prev,
        )
      } else {
        await refresh()
      }
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
          freshAwardId={recentlyCreatedAwardId}
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
          onSetBallot={setBallot}
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
  const w = Math.max(160, Math.round(text.length * size * 0.74))
  // Delauney's caps ink ~1.02em above the baseline (taller than the declared
  // ascent). Baseline at 1.08·size with a 1.14·size box leaves a symmetric
  // ~0.06·size gap top & bottom, so the caps read as vertically centered.
  const h = Math.round(size * 1.14)
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
        y={size * 1.08}
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
  freshAwardId,
  onCardPress,
  onCreatePress,
  bottomPadding,
}: {
  awards: KaraokeAwardRow[]
  votes: AwardsBundle['votes']
  ownGuestId: string
  freshAwardId: string | null
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
              voteCount={votes[aw.id]?.length ?? 0}
              finalized={!!aw.finalized_at}
              isOwn={aw.created_by_guest_id === ownGuestId}
              isFresh={aw.id === freshAwardId}
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
      <GradientTitle text="Awards" size={46} />
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
        <Ionicons
          name={owned ? 'create' : 'add'}
          size={owned ? 20 : 22}
          color={owned ? '#1a140a' : P.gold}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: P.cream,
            fontFamily: P.fontSerif,
            fontSize: 16,
            letterSpacing: 0.2,
            // Generous line height so Delauney's tall caps don't clip at top.
            lineHeight: 23,
          }}
          numberOfLines={2}
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
  voteCount,
  finalized,
  isOwn,
  isFresh,
  onPress,
}: {
  award: KaraokeAwardRow
  voteCount: number
  finalized: boolean
  isOwn: boolean
  isFresh: boolean
  onPress: () => void
}) {
  const voted = voteCount > 0
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

  // Entrance animation for a freshly-created/edited award. Plays once on
  // mount when isFresh starts true — the parent flag flips off after ~1.8s
  // so the card stays in its resting state for subsequent renders.
  const enterScale = useRef(new Animated.Value(isFresh ? 0.86 : 1)).current
  const enterOpacity = useRef(new Animated.Value(isFresh ? 0 : 1)).current
  const glow = useRef(new Animated.Value(isFresh ? 1 : 0)).current
  useEffect(() => {
    if (!isFresh) return
    Animated.parallel([
      Animated.spring(enterScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [isFresh, enterScale, enterOpacity, glow])

  return (
    <Animated.View
      style={{
        marginBottom: 12,
        opacity: enterOpacity,
        transform: [{ scale: enterScale }],
        shadowColor: P.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }),
        shadowRadius: 22,
        elevation: 0,
      }}
    >
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

      {/* (Corner-bracket flourishes were removed here: pinned to the card's
          square corners, they were clipped by the 12px border radius +
          overflow:hidden into stray gold fragments. The gold border, gilded
          wash, and vote badge already mark the "awarded" state.) */}

      <AwardMedallion award={award} voted={voted} finalized={finalized} />

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text
          style={{
            fontFamily: P.fontSerif,
            fontSize: 17,
            color: P.cream,
            letterSpacing: 0.2,
            // Delauney's caps ink well above the declared ascent — a generous
            // line height keeps the tops from clipping inside the text frame.
            lineHeight: 27,
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

      <StatusIndicator voteCount={voteCount} finalized={finalized} />
    </Pressable>
    </Animated.View>
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

function StatusIndicator({ voteCount, finalized }: { voteCount: number; finalized: boolean }) {
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
  if (voteCount > 0) {
    // Ballot cast — a filled gold pill showing how many of the 3 ranks are
    // used so guests can tell at a glance whether they finished ranking.
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 11,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: P.goldEdge,
        }}
      >
        {/* The gradient rounds itself (borderRadius) so the pill doesn't need
            overflow:hidden — that clip was shaving the bold count glyphs at the
            top/bottom and the capsule ends. */}
        <LinearGradient
          colors={[P.goldBright, P.goldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
        />
        <Check tint="#1a140a" size={11} />
        <Text
          style={{
            color: '#1a140a',
            fontWeight: '800',
            fontSize: 11,
            letterSpacing: 1,
            lineHeight: 15,
          }}
        >
          {voteCount}/3
        </Text>
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

  // Uploaded photos use a rounded-rectangle gilded frame (same 60×60 footprint
  // as the coin) with the image filling it, rather than a small icon centered
  // in a disc.
  if (award.icon_data_url) {
    return (
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 14,
          padding: 2.5,
          shadowColor: struck ? P.gold : '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: struck ? 0.5 : 0.35,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <LinearGradient
          colors={[P.goldBright, P.gold, P.goldDeep]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14 }}
        />
        <View style={{ flex: 1, borderRadius: 11.5, overflow: 'hidden', backgroundColor: P.surfaceDeep }}>
          <Image
            source={{ uri: award.icon_data_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      </View>
    )
  }

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
          iconDataUrl={null}
          color={iconColor}
          size={32}
        />
      </View>
    </View>
  )
}

// Hero medallion for the detail screen — same gilded-coin language as the
// list, scaled up to 120px so the award reads as a "trophy moment" when
// you open it. Uses three-stop gold gradient on both the ring and the face.
function DetailMedallion({ award }: { award: KaraokeAwardRow; finalized: boolean }) {
  // Uploaded photo → rounded-rectangle gilded frame filled by the image.
  if (award.icon_data_url) {
    return (
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 26,
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
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 26 }}
        />
        <View style={{ flex: 1, borderRadius: 23, overflow: 'hidden', backgroundColor: P.surfaceDeep }}>
          <Image
            source={{ uri: award.icon_data_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      </View>
    )
  }

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
          iconDataUrl={null}
          color="#1a140a"
          size={64}
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
  onSetBallot,
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
  onSetBallot: (award: KaraokeAwardRow, ordered: AwardCandidate[]) => void
  bottomPadding: number
  justVoted: boolean
}) {
  const candidates = useMemo(
    () => buildAwardCandidates(award, history, guests),
    [award, history, guests],
  )
  // Only the nominees this guest can actually vote for — you can't vote for
  // yourself, so your own entries are hidden entirely rather than shown as
  // disabled "Can't vote for yourself" rows.
  const votableCandidates = useMemo(
    () => candidates.filter((c) => !awardCandidateBanned(c, guestId, guestName)),
    [candidates, guestId, guestName],
  )
  const ballotRows = votes[award.id] || []
  // The voter's current picks, in rank order (index 0 = 1st place).
  const selected = useMemo(
    () => matchBallot(award, ballotRows, candidates).map((x) => x.candidate),
    [award, ballotRows, candidates],
  )
  const selectedIndex = useMemo(() => {
    const m = new Map<string, number>()
    selected.forEach((c, i) => m.set(c.key, i))
    return m
  }, [selected])
  const finalized = !!award.finalized_at
  const full = selected.length >= 3

  const subjectLabel =
    award.subject_type === 'performance'
      ? 'Rank the best performances'
      : award.subject_type === 'singer'
        ? 'Rank your top singers'
        : 'Rank the best duos & groups'

  // When the only nominees are this guest's own entries, there's nothing they
  // can vote for — explain that rather than implying the category is empty.
  const selfOnly = candidates.length > 0 && votableCandidates.length === 0
  const emptyMsg = selfOnly
    ? "You're the only nominee here so far — you can't vote for yourself, but everyone else can vote for you."
    : award.subject_type === 'singer'
      ? "No singers yet — once someone takes the mic they'll appear here."
      : award.subject_type === 'group'
        ? 'No multi-singer performances yet.'
        : 'No performances yet — check back after a song plays.'

  const toggle = (c: AwardCandidate) => {
    if (finalized) return
    if (awardCandidateBanned(c, guestId, guestName)) return
    if (selectedIndex.has(c.key)) {
      onSetBallot(award, selected.filter((x) => x.key !== c.key))
    } else if (!full) {
      onSetBallot(award, [...selected, c])
    }
  }
  const removeAt = (i: number) =>
    onSetBallot(award, selected.filter((_, idx) => idx !== i))

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
          as "this is the award you're voting on" before the ballot. */}
      <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
        <DetailMedallion award={award} finalized={finalized} />
        <View style={{ alignSelf: 'stretch', marginTop: 22, marginBottom: 4 }}>
          <GoldRule glyph="✦" />
        </View>
        <Text
          style={{
            fontFamily: P.fontSerif,
            fontSize: 26,
            color: P.cream,
            letterSpacing: 0.2,
            textAlign: 'center',
            paddingHorizontal: 8,
            // Delauney's caps ink well above the declared ascent, so the line
            // box must be ≥1.6× the size or the tops of the caps clip.
            lineHeight: 44,
            paddingTop: 4,
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
        {award.description ? (
          <Text
            numberOfLines={6}
            style={{
              marginTop: 16,
              paddingHorizontal: 14,
              // Flowing gilded script — reads as elegant cursive. Great Vibes
              // sits visually small with tall flourishes, so it's sized up and
              // given a generous line box to keep ascenders/descenders intact.
              fontFamily: P.fontScript,
              fontSize: 30,
              lineHeight: 38,
              color: 'rgba(245,230,197,0.82)',
              textAlign: 'center',
            }}
          >
            {award.description}
          </Text>
        ) : null}
        {finalized ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 14,
            }}
          >
            <MetaPill label="Voting closed" tone="goldFilled" />
          </View>
        ) : null}
      </View>

      {votableCandidates.length === 0 ? (
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
          {/* The ballot — three ranked slots */}
          <SectionLabel>Your Ballot</SectionLabel>
          <BallotStrip
            selected={selected}
            finalized={finalized}
            onRemove={removeAt}
            flash={justVoted}
          />

          {/* Nominees */}
          <SectionLabel>Nominees</SectionLabel>
          {votableCandidates.map((c) => {
            const idx = selectedIndex.get(c.key)
            const isSelected = idx !== undefined
            const blockedByFull = full && !isSelected
            const disabledTap = finalized || blockedByFull
            const hint = finalized
              ? 'Voting closed'
              : blockedByFull
                ? 'Ballot full'
                : 'Tap to rank'
            const dim = finalized || blockedByFull
            return (
              <Pressable
                key={c.key}
                onPress={() => toggle(c)}
                disabled={disabledTap}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isSelected ? P.goldWash : P.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? P.gold : P.goldHairline,
                  marginBottom: 10,
                  minHeight: 84,
                  opacity: dim ? 0.45 : 1,
                  transform: [{ scale: pressed && !disabledTap ? 0.985 : 1 }],
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
                {isSelected ? (
                  <SelectedRankChip rank={(idx as number) + 1} />
                ) : dim ? (
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
  // ≥1.5× the size so Delauney's tall caps don't clip at the top.
  lineHeight: 26,
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

// The ranked ballot: three slots (1st / 2nd / 3rd). Filled slots show the
// chosen nominee with a remove button; empty slots prompt the voter. A brief
// gold pulse plays when `flash` flips true right after a pick changes.
function BallotStrip({
  selected,
  finalized,
  onRemove,
  flash,
}: {
  selected: AwardCandidate[]
  finalized: boolean
  onRemove: (index: number) => void
  flash: boolean
}) {
  const glow = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!flash) return
    glow.setValue(0)
    Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start()
  }, [flash, glow])

  return (
    <View style={{ marginBottom: 16 }}>
      {[0, 1, 2].map((i) => {
        const c = selected[i]
        const filled = !!c
        const placeholder =
          i === 0
            ? 'Tap a nominee for 1st place'
            : i === 1
              ? 'Tap a nominee for 2nd place'
              : 'Tap a nominee for 3rd place'
        return (
          <Animated.View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 12,
              minHeight: 76,
              marginBottom: 8,
              overflow: 'hidden',
              backgroundColor: filled ? P.goldWash : P.surfaceDeep,
              borderWidth: 1,
              borderColor: filled ? P.gold : P.goldHairline,
              borderStyle: filled ? 'solid' : 'dashed',
            }}
          >
            {filled ? (
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
            ) : null}
            <RankBadge rank={i + 1} />
            {filled ? (
              <>
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
                {!finalized ? <RemoveButton onPress={() => onRemove(i)} /> : null}
              </>
            ) : (
              <Text
                style={{
                  flex: 1,
                  color: P.creamFaint,
                  fontFamily: P.fontSerif,
                  fontStyle: 'italic',
                  fontSize: 14,
                  // Generous line box so Delauney's tall caps don't clip; the
                  // small translateY corrects the font's high-sitting baseline
                  // so the prompt reads as vertically centered beside the badge.
                  lineHeight: 22,
                  transform: [{ translateY: 1.5 }],
                }}
              >
                {placeholder}
              </Text>
            )}
          </Animated.View>
        )
      })}
    </View>
  )
}

// Rank medallion shown on the left of each ballot slot.
function RankBadge({ rank }: { rank: number }) {
  return (
    <View style={{ alignItems: 'center', width: 44 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: P.gold,
          backgroundColor: P.goldWash,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: P.gold,
            fontWeight: '800',
            fontSize: 15,
            fontFamily: P.fontSerif,
            // Delauney's digits ink above the declared ascent and have no
            // descender, so even a full-height line box leaves them sitting
            // high in the medallion. A generous line box clears the top clip;
            // the small translateY drops the figure to true optical center.
            lineHeight: 36,
            textAlign: 'center',
            textAlignVertical: 'center',
            includeFontPadding: false,
            transform: [{ translateY: 2 }],
          }}
        >
          {rank}
        </Text>
      </View>
    </View>
  )
}

// Filled gold rank chip shown on a nominee row that's on the ballot.
function SelectedRankChip({ rank }: { rank: number }) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
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
      <Text style={{ color: '#1a140a', fontWeight: '800', fontSize: 16 }}>{rank}</Text>
    </View>
  )
}

function RemoveButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: P.goldHairline,
        backgroundColor: P.surface,
      }}
    >
      <Text style={{ color: P.gold, fontSize: 18, lineHeight: 20, marginTop: -2 }}>×</Text>
    </Pressable>
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
// AwardCreate — 4-step Oscar-program wizard (Name → Description →
// Subject → Visual). Each step lives in the same component; only the body
// region animates between steps so the header (step indicator + gilded
// title) reads as a fixed program banner. See plans/we-need-to-add-nested-curry.md.
// -----------------------------------------------------------------------
type WizardStep = 1 | 2 | 3 | 4

const STEP_META: Record<WizardStep, { title: string; caption: string }> = {
  1: { title: 'Name your award', caption: 'What shall the world call this honor?' },
  2: { title: 'Describe the honor', caption: 'A line in the program, the kind that gets read aloud.' },
  3: { title: 'Choose its subject', caption: 'Who or what will it celebrate?' },
  4: { title: 'Bestow it a face', caption: 'Pick an icon or upload a photograph.' },
}

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
  // Wizard step state (1..4). Lives inside AwardCreate — `sub: 'create'|'edit'`
  // at the parent already gates the wizard; step is a sub-concern.
  const [step, setStep] = useState<WizardStep>(1)
  const slideX = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(1)).current
  // latestDraft is read inside the typewriter so the user typing mid-animation
  // extends rather than gets overwritten by a stale-closure setDraft.
  const latestDraft = useRef(draft)
  useEffect(() => {
    latestDraft.current = draft
  }, [draft])

  const [manifestReady, setManifestReady] = useState(!!getAwardsManifest())
  const [shuffled, setShuffled] = useState<AwardsIcon[]>([])
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(AWARDS_ICON_PAGE_SIZE)

  // Lazy-load the icon manifest the first time the visual step is entered.
  // Previously this ran on mount; deferring it to step 4 saves work for guests
  // who bail before reaching the visual picker.
  useEffect(() => {
    let alive = true
    if (step !== 4) return
    if (draft.visualMode !== 'icon') return
    if (manifestReady) return
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
  }, [step, draft.visualMode, manifestReady])

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
        ...latestDraft.current,
        iconDataUrl: `data:${mime};base64,${asset.base64}`,
        iconId: null,
        visualMode: 'photo',
      })
    } catch (err: any) {
      Alert.alert('Photo error', err?.message ?? String(err))
    }
  }, [setDraft])

  // Step 2 typewriter: types "Awarded to " into the description field on
  // entry, but only on a *fresh* create (or returning to step 2 from elsewhere
  // with the field empty). Edit drafts have a pre-filled description, so the
  // length check below short-circuits and no typewriter runs.
  useEffect(() => {
    if (step !== 2) return
    if (latestDraft.current.description.length > 0) return
    let cancelled = false
    let i = 0
    let tickTimer: ReturnType<typeof setTimeout> | null = null
    const start = setTimeout(function tick() {
      if (cancelled) return
      if (i >= AWARDED_TO_PREFIX.length) return
      setDraft({ ...latestDraft.current, description: AWARDED_TO_PREFIX.slice(0, i + 1) })
      i += 1
      tickTimer = setTimeout(tick, 65)
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(start)
      if (tickTimer) clearTimeout(tickTimer)
    }
  }, [step, setDraft])

  // Per-step "can the user advance?" — also used to disable the Continue
  // button's pressable while the field is invalid, so guests get immediate
  // visual feedback rather than an alert after tapping.
  const canAdvance = useMemo(() => {
    if (step === 1) return draft.title.trim().length >= 2
    if (step === 2) return descriptionMeetsMinimum(draft.description)
    if (step === 3) return true
    return !!draft.iconId || !!draft.iconDataUrl
  }, [step, draft.title, draft.description, draft.iconId, draft.iconDataUrl])

  const animateTo = useCallback(
    (next: WizardStep, direction: 'forward' | 'back') => {
      const dx = direction === 'forward' ? -28 : 28
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: dx,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setStep(next)
        slideX.setValue(-dx)
        Animated.parallel([
          Animated.timing(slideX, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start()
      })
    },
    [slideX, fade],
  )

  const onContinue = useCallback(() => {
    if (!canAdvance) return
    if (step === 4) {
      onSubmit()
      return
    }
    animateTo((step + 1) as WizardStep, 'forward')
  }, [canAdvance, step, animateTo, onSubmit])

  const onStepBack = useCallback(() => {
    if (step === 1) {
      onBack()
      return
    }
    animateTo((step - 1) as WizardStep, 'back')
  }, [step, animateTo, onBack])

  const stepMeta = STEP_META[step]
  const eyebrow = isEdit
    ? 'Edit Your Nomination'
    : 'Step ' + ROMAN[step] + ' of IV'
  const showDelete = step === 4 && !!onDelete
  const continueLabel = step === 4 ? (isEdit ? 'Save' : 'Submit Nomination') : 'Continue'
  const backLabel = step === 1 ? 'Cancel' : 'Back'

  // Footer is rendered inline at the end of each step body — that way the
  // Continue/Back row sits *directly* below the input on steps with a
  // keyboard (name, citation), instead of being pinned to the bottom of the
  // screen where the soft keyboard would cover it. On step 4 the icon grid
  // flex-grows above this row so the row still ends up near the bottom there.
  const footer = (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
      {showDelete ? (
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
              lineHeight: 22,
            }}
          >
            Delete
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={onStepBack}
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
            lineHeight: 22,
          }}
        >
          {backLabel}
        </Text>
      </Pressable>
      <Pressable
        onPress={onContinue}
        disabled={!canAdvance}
        style={{
          flex: 1,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          shadowColor: P.gold,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: canAdvance ? 0.55 : 0,
          shadowRadius: 18,
          elevation: canAdvance ? 10 : 0,
          opacity: canAdvance ? 1 : 0.45,
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
            lineHeight: 22,
            paddingVertical: 14,
          }}
        >
          {continueLabel}
        </Text>
      </Pressable>
    </View>
  )

  // Fixed-column layout: header + footer stay pinned, only the body region
  // animates between steps. Keeps the gold rule + step indicator + title
  // steady — reads as "the program is the same; only the page turns."
  //
  // Intentionally NOT wrapped in KeyboardAvoidingView: same rationale as
  // the old single-screen form — we want the keyboard to slide over the
  // submit row rather than push it.
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
        {/* HEADER — fixed across all steps */}
        <View style={{ marginBottom: 16 }}>
          <BackButton onPress={onStepBack} />
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <StepIndicator step={step} />
            <Text
              style={{
                color: P.gold,
                fontSize: 10,
                letterSpacing: 3,
                fontWeight: '700',
                textTransform: 'uppercase',
                marginTop: 10,
                marginBottom: 6,
              }}
            >
              {eyebrow}
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
                // Delauney's caps ink above the declared ascent — needs a
                // ≥1.6× line box + top padding or the tops of the caps clip.
                lineHeight: 44,
                paddingTop: 4,
              }}
            >
              {stepMeta.title}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 13,
                color: P.creamMuted,
                fontFamily: P.fontSerif,
                lineHeight: 21,
                textAlign: 'center',
                paddingHorizontal: 8,
              }}
            >
              {stepMeta.caption}
            </Text>
          </View>
        </View>

        {/* BODY — animated step content */}
        <Animated.View
          style={{
            flex: 1,
            minHeight: 0,
            opacity: fade,
            transform: [{ translateX: slideX }],
          }}
        >
          {step === 1 ? (
            <View>
              <FieldLabel>Award name</FieldLabel>
              <TextInput
                value={draft.title}
                onChangeText={(v) => setDraft({ ...draft, title: v })}
                onSubmitEditing={onContinue}
                returnKeyType="next"
                placeholder="e.g. Most Dramatic Solo"
                placeholderTextColor={P.creamFaint}
                maxLength={40}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  borderWidth: 1,
                  borderColor: P.goldHairline,
                  borderRadius: 10,
                  backgroundColor: P.surface,
                  fontFamily: P.fontSerif,
                  color: P.cream,
                  fontSize: 16,
                  // Generous line box so Delauney's tall caps don't clip.
                  lineHeight: 24,
                  textAlign: 'center',
                }}
                autoFocus
              />
              {footer}
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <FieldLabel>The citation</FieldLabel>
              {/* Four CornerBracket glyphs frame the textarea so it reads as
                  an inscribed plaque, not a chat input. */}
              <View
                style={{
                  borderWidth: 1,
                  borderColor: P.goldHairline,
                  borderRadius: 10,
                  backgroundColor: P.surface,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  position: 'relative',
                }}
              >
                <CornerBracket corner="tl" size={10} />
                <CornerBracket corner="tr" size={10} />
                <CornerBracket corner="bl" size={10} />
                <CornerBracket corner="br" size={10} />
                <TextInput
                  value={draft.description}
                  onChangeText={(v) =>
                    setDraft({ ...draft, description: v.slice(0, AWARD_DESCRIPTION_MAX) })
                  }
                  multiline
                  textAlignVertical="top"
                  maxLength={AWARD_DESCRIPTION_MAX}
                  placeholder={isEdit ? '' : 'Awarded to the…'}
                  placeholderTextColor={P.creamFaint}
                  style={{
                    minHeight: 160,
                    fontFamily: P.fontSerif,
                    fontStyle: 'italic',
                    color: P.cream,
                    fontSize: 30,
                    lineHeight: 44,
                    padding: 0,
                  }}
                />
              </View>
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: P.creamFaint,
                  fontFamily: P.fontSerif,
                  lineHeight: 16,
                  textAlign: 'right',
                }}
              >
                {draft.description.length}/{AWARD_DESCRIPTION_MAX}
              </Text>
              {footer}
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <FieldLabel>What it honors</FieldLabel>
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
              {isEdit ? (
                <Text
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: P.creamFaint,
                    fontFamily: P.fontSerif,
                    fontStyle: 'italic',
                    lineHeight: 18,
                    textAlign: 'center',
                  }}
                >
                  The subject can't change once an award has been cast.
                </Text>
              ) : null}
              {footer}
            </View>
          ) : null}

          {step === 4 ? (
            <View style={{ flex: 1, minHeight: 0 }}>
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
                    lineHeight: 17,
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

              {draft.visualMode === 'icon' ? (
                <TextInput
                  value={search}
                  onChangeText={(v) => {
                    setSearch(v)
                    setVisibleCount(AWARDS_ICON_PAGE_SIZE)
                  }}
                  placeholder={manifestReady ? 'Search…' : 'Loading icons…'}
                  placeholderTextColor={P.creamFaint}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: P.goldHairline,
                    borderRadius: 10,
                    backgroundColor: P.surface,
                    color: P.cream,
                    fontFamily: P.fontSerif,
                    fontSize: 14,
                    lineHeight: 21,
                    marginBottom: 10,
                    textAlign: 'center',
                  }}
                />
              ) : null}

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
                        lineHeight: 19,
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
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  )
}

// Four-diamond step indicator. Filled glyph = completed/current; outlined =
// upcoming. Short gold rules between them tie the cluster to the existing
// GoldRule language already used as section dividers.
function StepIndicator({ step }: { step: WizardStep }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
      }}
    >
      {[1, 2, 3, 4].map((n, idx) => (
        <React.Fragment key={n}>
          <Text
            style={{
              fontSize: 9,
              color: n <= step ? P.gold : P.goldHairline,
              letterSpacing: 1,
            }}
          >
            ◆
          </Text>
          {idx < 3 ? (
            <View
              style={{
                width: 14,
                height: 1,
                backgroundColor: n < step ? P.gold : P.goldHairline,
              }}
            />
          ) : null}
        </React.Fragment>
      ))}
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
                  lineHeight: 21,
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
                  lineHeight: 21,
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
          lineHeight: 21,
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
            lineHeight: 21,
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
          {/* (Corner brackets removed: this dialog also clips them with its
              radius + overflow:hidden, same stray-fragment bug as the cards.) */}
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
