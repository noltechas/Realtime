import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  Image,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import Svg, {
  Rect,
  Defs,
  Stop,
  RadialGradient,
  LinearGradient as SvgLinearGradient,
  Text as SvgText,
} from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { AwardsRevealStep } from '@karaoke/shared'
import { AWARDS_PALETTE as P } from './palette'
import { AwardIcon } from './AwardIcon'
import { supabase } from '../supabase/client'
import { useSession } from '../hooks/useSession'

// =====================================================================
// Awards reveal — the companion's cinematic, synced view of the host's
// stage ceremony. Gilded "Academy night" aesthetic on a plum-to-black
// ambient stage, with spring/fade entrances on every element. The rich
// desktop Stage runs the master version; phones mirror it in lockstep
// (the step is read from the persisted session row, so a device that
// joins mid-show still drops straight into the right slide).
// =====================================================================

type Candidate = NonNullable<AwardsRevealStep['lineup']>[number]
type Finalist = NonNullable<AwardsRevealStep['finalist']>

const GOLD = '#d4af37'
const GOLD_BRIGHT = '#f4d35e'
const GOLD_PALE = '#fde7a6'
const CREAM = '#f5e6c5'

// The host serializes awards in camelCase (Award: iconId / iconDataUrl /
// subjectType), but the shared row type is snake_case — so reveal payloads can
// arrive in EITHER shape depending on the path. Normalize both so the icon and
// singer/performance layout are always correct (otherwise icon_id is undefined
// and AwardIcon silently renders the trophy fallback).
function normAward(a: any): {
  title: string
  description?: string
  iconId: string | null
  iconDataUrl: string | null
  isSinger: boolean
} {
  return {
    title: a?.title ?? '',
    description: a?.description ?? undefined,
    iconId: a?.iconId ?? a?.icon_id ?? null,
    iconDataUrl: a?.iconDataUrl ?? a?.icon_data_url ?? null,
    isSinger: (a?.subjectType ?? a?.subject_type) === 'singer',
  }
}

// ---------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------
export function RevealOverlay({
  step,
  onDismiss,
}: {
  step: AwardsRevealStep | null
  onDismiss: () => void
}) {
  const visible = !!step
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={{ flex: 1, backgroundColor: '#050308' }}>
        <Backdrop />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 26,
            paddingVertical: 64,
          }}
          showsVerticalScrollIndicator={false}
        >
          {step ? (
            // Re-key on each slide so every entrance animation replays.
            <PhaseContent
              key={`${step.startedAt ?? ''}:${step.phase}:${step.awardIndex ?? 0}`}
              step={step}
            />
          ) : null}
        </ScrollView>
        {/* Full-screen celebratory confetti, above the content. */}
        {step && CONFETTI_PHASES.has(step.phase) ? <Confetti key={`cf:${step.startedAt ?? ''}`} /> : null}
      </View>
    </Modal>
  )
}

const CONFETTI_PHASES = new Set<AwardsRevealStep['phase']>(['winner', 'finale', 'encore-winner'])

function PhaseContent({ step }: { step: AwardsRevealStep }) {
  switch (step.phase) {
    case 'opening':
      return <Opening step={step} />
    case 'overview':
      return <Overview step={step} />
    case 'intro':
      return <Intro step={step} />
    case 'finalist':
      return <Finalist step={step} />
    case 'lineup':
      return <Lineup step={step} />
    case 'winner':
      return <Winner step={step} />
    case 'finale':
      return <Finale step={step} />
    case 'encore-buildup':
      return <EncoreBuildup />
    case 'encore-vote':
      return <EncoreVote step={step} />
    case 'encore-winner':
      return <EncoreWinner step={step} />
    default:
      return null
  }
}

// =====================================================================
// Animation primitives
// =====================================================================
function useIn(delay = 0, spring = false): Animated.Value {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = spring
      ? Animated.spring(v, {
          toValue: 1,
          delay,
          friction: 7,
          tension: 58,
          useNativeDriver: true,
        })
      : Animated.timing(v, {
          toValue: 1,
          delay,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
    anim.start()
    return () => v.stopAnimation()
  }, [v, delay, spring])
  return v
}

// Looping 0→1→0 driver for ambient motion (breathing glow, twinkle).
function useLoop(duration = 2600, delay = 0): Animated.Value {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [v, duration, delay])
  return v
}

// Fade + rise-up entrance.
function Rise({
  delay = 0,
  dist = 22,
  style,
  children,
}: {
  delay?: number
  dist?: number
  style?: any
  children: React.ReactNode
}) {
  const v = useIn(delay)
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dist, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  )
}

// Spring scale-in entrance.
function Pop({
  delay = 0,
  from = 0.6,
  style,
  children,
}: {
  delay?: number
  from?: number
  style?: any
  children: React.ReactNode
}) {
  const v = useIn(delay, true)
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

// Number that counts up from 0 — used for the winner stats.
function CountUp({ value, delay = 0, style }: { value: number; delay?: number; style?: any }) {
  const [n, setN] = useState(0)
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const id = v.addListener(({ value: x }) => setN(Math.round(x)))
    Animated.timing(v, {
      toValue: value,
      duration: 1000,
      delay: delay + 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
    return () => {
      v.removeListener(id)
      v.stopAnimation()
    }
  }, [v, value, delay])
  return <Text style={style}>{n}</Text>
}

// =====================================================================
// Ambient backdrop
// =====================================================================
function Backdrop() {
  const { width, height } = useWindowDimensions()
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Cool plum ambient, centred on the (vertically-centred) content. */}
          <RadialGradient id="plum" cx="50%" cy="46%" r="72%">
            <Stop offset="0" stopColor="#34204f" stopOpacity="0.9" />
            <Stop offset="0.55" stopColor="#190f2c" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#050308" stopOpacity="0" />
          </RadialGradient>
          {/* Edge vignette to draw the eye inward. */}
          <RadialGradient id="vignette" cx="50%" cy="50%" r="75%">
            <Stop offset="0.4" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.82" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="#050308" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#plum)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#vignette)" />
      </Svg>
      <GoldHaze width={width} height={height} />
      <Sparkles width={width} height={height} />
    </View>
  )
}

// Soft gold spotlight — a centred radial glow (NOT a hard disc) that gently
// breathes, haloing the content in the middle of the screen.
function GoldHaze({ width, height }: { width: number; height: number }) {
  const v = useLoop(4200)
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }]}
    >
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="ghaze" cx="50%" cy="47%" r="52%">
            <Stop offset="0" stopColor={GOLD} stopOpacity="0.26" />
            <Stop offset="0.5" stopColor={GOLD} stopOpacity="0.07" />
            <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#ghaze)" />
      </Svg>
    </Animated.View>
  )
}

function Sparkles({ width, height }: { width: number; height: number }) {
  const pts = useRef(
    Array.from({ length: 16 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 2 + Math.random() * 3.5,
      dur: 1500 + Math.random() * 2200,
      delay: Math.random() * 2400,
    })),
  ).current
  return (
    <>
      {pts.map((p, i) => (
        <Sparkle key={i} {...p} />
      ))}
    </>
  )
}

function Sparkle({ x, y, size, dur, delay }: { x: number; y: number; size: number; dur: number; delay: number }) {
  const v = useLoop(dur, delay)
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: GOLD_BRIGHT,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.7] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
      }}
    />
  )
}

// =====================================================================
// Visual primitives
// =====================================================================
function Eyebrow({ children, color = P.amberLight, style }: { children: React.ReactNode; color?: string; style?: any }) {
  return (
    <Text
      style={[
        {
          color,
          fontSize: 12,
          letterSpacing: 4,
          fontWeight: '800',
          textTransform: 'uppercase',
          textAlign: 'center',
          alignSelf: 'stretch',
        },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

// Decorative gold hairline with a center diamond, fading at both ends.
function GoldRule({ w = 200 }: { w?: number }) {
  const arm = w / 2 - 9
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
      <LinearGradient
        colors={['rgba(212,175,55,0)', 'rgba(212,175,55,0.75)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 1, width: arm }}
      />
      <View style={{ width: 7, height: 7, backgroundColor: GOLD, transform: [{ rotate: '45deg' }], marginHorizontal: 7 }} />
      <LinearGradient
        colors={['rgba(212,175,55,0.75)', 'rgba(212,175,55,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 1, width: arm }}
      />
    </View>
  )
}

// Gilded headline rendered as SVG so it gets a real gold vertical gradient.
// Auto-fits the available width on one line (used for SHORT ceremony phrases).
function GildedText({ text, maxSize = 48 }: { text: string; maxSize?: number }) {
  const { width } = useWindowDimensions()
  const avail = width - 56
  const inner = avail - 18 // guaranteed margin so the line never clips
  const per = 0.64 // generous em-width estimate for Delauney caps
  const len = Math.max(4, text.length)
  const size = Math.max(18, Math.min(maxSize, Math.floor(inner / (len * per))))
  const h = Math.round(size * 1.18)
  return (
    <Svg width={avail} height={h}>
      <Defs>
        <SvgLinearGradient id="gild" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GOLD_PALE} />
          <Stop offset="0.5" stopColor="#e6c252" />
          <Stop offset="1" stopColor="#9c7b22" />
        </SvgLinearGradient>
      </Defs>
      <SvgText
        x={avail / 2}
        y={size * 1.04}
        textAnchor="middle"
        fontSize={size}
        fontFamily={P.fontDisplay}
        fill="url(#gild)"
        letterSpacing={0.5}
      >
        {text}
      </SvgText>
    </Svg>
  )
}

// Cream display title with a gold bloom — WRAPS, for long award/song names.
function GlowTitle({ children, size = 30, color = '#ffffff' }: { children: React.ReactNode; size?: number; color?: string }) {
  return (
    <Text
      style={{
        fontFamily: P.fontDisplay,
        fontSize: size,
        // Delauney's caps ink ~1.02em above the baseline, so the line box must
        // be ≥1.55× the font size or the tops shear off (RN clips to the line).
        lineHeight: Math.round(size * 1.62),
        color,
        textAlign: 'center',
        alignSelf: 'stretch',
        textShadowColor: 'rgba(212,175,55,0.45)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 11,
      }}
    >
      {children}
    </Text>
  )
}

// Circular avatar (singer) / rounded-rect (performance) with a gold ring.
function Avatar({
  uri,
  label,
  color,
  size,
  square = false,
}: {
  uri?: string | null
  label?: string
  color?: string
  size: number
  square?: boolean
}) {
  const r = square ? Math.round(size * 0.16) : size / 2
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        borderWidth: 2,
        borderColor: GOLD,
        backgroundColor: color || 'rgba(212,175,55,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} />
      ) : (
        <Text style={{ color: CREAM, fontWeight: '800', fontSize: size * 0.4, fontFamily: P.fontDisplay }}>
          {(label || '?').charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  )
}

// Pulsing halo wrapper for a hero element (medallion / winner avatar).
function Halo({ size, delay = 0, children }: { size: number; delay?: number; children: React.ReactNode }) {
  const pulse = useLoop(2400)
  return (
    <Pop delay={delay} from={0.5}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * 1.16,
            height: size * 1.16,
            borderRadius: size,
            backgroundColor: GOLD,
            opacity: 0.12,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: GOLD,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
          }}
        />
        {children}
      </View>
    </Pop>
  )
}

// Award medallion (icon in a gilded disc with a breathing halo).
function Medallion({
  iconId,
  iconDataUrl,
  size = 104,
  delay = 0,
}: {
  iconId: string | null
  iconDataUrl: string | null
  size?: number
  delay?: number
}) {
  // Uploaded photo → rounded-rectangle gold-outlined frame filled by the image
  // (same footprint as the disc). Built-in icons keep the gilded coin.
  if (iconDataUrl) {
    return (
      <Halo size={size} delay={delay}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.22),
            borderWidth: 2,
            borderColor: GOLD,
            backgroundColor: '#1a140a',
            overflow: 'hidden',
          }}
        >
          <Image source={{ uri: iconDataUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      </Halo>
    )
  }
  return (
    <Halo size={size} delay={delay}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: P.goldEdge,
          backgroundColor: 'rgba(212,175,55,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AwardIcon iconId={iconId} iconDataUrl={null} color={GOLD} size={Math.round(size * 0.52)} />
      </View>
    </Halo>
  )
}

// One-shot diagonal light sweep across the screen (winner celebration).
function LightSweep({ delay = 320 }: { delay?: number }) {
  const { width } = useWindowDimensions()
  const x = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(x, {
      toValue: 1,
      duration: 1200,
      delay,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [x, delay])
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -100,
        bottom: -100,
        width: 140,
        opacity: 0.45,
        transform: [
          { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.7, width * 1.3] }) },
          { rotate: '16deg' },
        ],
      }}
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,246,214,0.55)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  )
}

// =====================================================================
// Phase: Opening
// =====================================================================
function Opening({ step }: { step: AwardsRevealStep }) {
  const n = step.totalAwards ?? 0
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Rise delay={40}>
        <Eyebrow>The Ceremony</Eyebrow>
      </Rise>
      <Rise delay={120} style={{ alignSelf: 'stretch', marginVertical: 16 }}>
        <GoldRule />
      </Rise>
      <Rise delay={220}>
        <GildedText text="Tonight's Awards" maxSize={50} />
      </Rise>
      <Rise delay={320} style={{ alignSelf: 'stretch', marginVertical: 16 }}>
        <GoldRule />
      </Rise>
      <Rise delay={440}>
        <Text style={{ color: P.creamMuted, fontSize: 15, letterSpacing: 0.5, textAlign: 'center' }}>
          {n} categor{n === 1 ? 'y' : 'ies'} to reveal
        </Text>
      </Rise>
    </View>
  )
}

// =====================================================================
// Phase: Overview — every category, floating in
// =====================================================================
function Overview({ step }: { step: AwardsRevealStep }) {
  const awards = step.overview || []
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Rise delay={40}>
        <Eyebrow style={{ color: GOLD }}>Tonight's Categories</Eyebrow>
      </Rise>
      <Rise delay={120} style={{ alignSelf: 'stretch', marginTop: 12, marginBottom: 22 }}>
        <GoldRule />
      </Rise>
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {awards.map((a, i) => {
          const iconId = (a as any).iconId ?? (a as any).icon_id ?? null
          const iconDataUrl = (a as any).iconDataUrl ?? (a as any).icon_data_url ?? null
          return (
            <Pop key={(a as any).id ?? i} delay={180 + i * 90} from={0.7} style={{ width: '33.33%', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 }}>
              {iconDataUrl ? (
                <View
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 15,
                    borderWidth: 2,
                    borderColor: GOLD,
                    backgroundColor: '#1a140a',
                    overflow: 'hidden',
                    marginBottom: 9,
                  }}
                >
                  <Image source={{ uri: iconDataUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ) : (
                <View
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 33,
                    backgroundColor: 'rgba(212,175,55,0.08)',
                    borderWidth: 1,
                    borderColor: P.goldEdge,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 9,
                  }}
                >
                  <AwardIcon iconId={iconId} iconDataUrl={null} color={GOLD} size={36} />
                </View>
              )}
              <Text style={{ fontFamily: P.fontDisplay, color: CREAM, fontSize: 14, textAlign: 'center', lineHeight: 21 }} numberOfLines={3}>
                {a.title}
              </Text>
            </Pop>
          )
        })}
      </View>
    </View>
  )
}

// =====================================================================
// Phase: Intro — present the award (logo + title + citation)
// =====================================================================
function Intro({ step }: { step: AwardsRevealStep }) {
  if (!step.award) return null
  const A = normAward(step.award)
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Rise delay={40}>
        <Eyebrow style={{ color: GOLD }}>
          Award {(step.awardIndex ?? 0) + 1} of {step.totalAwards ?? 0}
        </Eyebrow>
      </Rise>
      <View style={{ marginTop: 22, marginBottom: 24 }}>
        <Medallion iconId={A.iconId} iconDataUrl={A.iconDataUrl} size={110} delay={140} />
      </View>
      <Rise delay={300}>
        <GlowTitle size={32}>{A.title}</GlowTitle>
      </Rise>
      {A.description ? (
        <Rise delay={420} style={{ alignSelf: 'stretch', marginTop: 14 }}>
          <Text
            style={{
              fontFamily: P.fontSerif,
              fontStyle: 'italic',
              fontSize: 17,
              lineHeight: 26,
              color: P.creamMuted,
              textAlign: 'center',
              alignSelf: 'stretch',
              paddingHorizontal: 14,
            }}
          >
            {A.description}
          </Text>
        </Rise>
      ) : null}
    </View>
  )
}

// =====================================================================
// Phase: Finalist — one nominee spotlight (random order)
// =====================================================================
function Finalist({ step }: { step: AwardsRevealStep }) {
  const f = step.finalist
  if (!step.award || !f) return null
  const A = normAward(step.award)
  const isSinger = A.isSinger
  const c = f.candidate
  const songs = f.songs || []
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Rise delay={30}>
        <Eyebrow style={{ color: GOLD }}>
          Finalist {f.order + 1} of {f.count}
        </Eyebrow>
      </Rise>
      <Rise delay={110}>
        <Text
          style={{
            color: P.creamFaint,
            fontSize: 11,
            letterSpacing: 2,
            fontWeight: '700',
            textTransform: 'uppercase',
            textAlign: 'center',
            alignSelf: 'stretch',
            marginTop: 8,
            paddingHorizontal: 8,
          }}
        >
          {A.title}
        </Text>
      </Rise>

      <View style={{ marginTop: 22, marginBottom: 16 }}>
        <Halo size={140} delay={200}>
          <Avatar uri={c.avatarUrl} label={c.label} size={140} square={!isSinger} />
        </Halo>
      </View>

      <Rise delay={360}>
        <GlowTitle size={30}>{isSinger ? c.label : c.trackName || c.label}</GlowTitle>
      </Rise>

      {isSinger ? (
        <View style={{ alignSelf: 'stretch', marginTop: 22 }}>
          <Rise delay={460}>
            <Eyebrow style={{ color: P.creamFaint, fontSize: 11, letterSpacing: 2 }}>
              {songs.length ? 'Songs they sang' : 'Took the mic tonight'}
            </Eyebrow>
          </Rise>
          <View style={{ marginTop: 14 }}>
            {songs.map((s, i) => (
              <SongRow key={i} song={s} delay={560 + i * 90} />
            ))}
          </View>
        </View>
      ) : c.singers && c.singers.length ? (
        <Rise delay={460} style={{ marginTop: 20, alignSelf: 'stretch' }}>
          <PerformerStrip singers={c.singers} />
        </Rise>
      ) : null}
    </View>
  )
}

function SongRow({ song, delay }: { song: { trackName: string; trackArtist: string; artUrl: string | null }; delay: number }) {
  return (
    <Rise delay={delay} dist={14}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: 'rgba(212,175,55,0.07)',
          borderWidth: 1,
          borderColor: 'rgba(212,175,55,0.18)',
          borderRadius: 14,
          padding: 10,
          marginBottom: 9,
        }}
      >
        {song.artUrl ? (
          <Image source={{ uri: song.artUrl }} style={{ width: 46, height: 46, borderRadius: 9 }} />
        ) : (
          <View style={{ width: 46, height: 46, borderRadius: 9, backgroundColor: 'rgba(212,175,55,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: GOLD, fontSize: 20 }}>♪</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: CREAM, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
            {song.trackName}
          </Text>
          <Text style={{ color: P.creamMuted, fontSize: 12 }} numberOfLines={1}>
            {song.trackArtist}
          </Text>
        </View>
      </View>
    </Rise>
  )
}

// Overlapping performer avatars + names (for performance / group nominees).
function PerformerStrip({ singers }: { singers: NonNullable<Candidate['singers']> }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
        {singers.slice(0, 6).map((s, i) => (
          <View
            key={i}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              marginLeft: i === 0 ? 0 : -8,
              borderWidth: 2,
              borderColor: '#050308',
              overflow: 'hidden',
              backgroundColor: s.color || 'rgba(212,175,55,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {s.profilePicture ? (
              <Image source={{ uri: s.profilePicture }} style={{ width: 38, height: 38, borderRadius: 19 }} />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{(s.name || '?').charAt(0).toUpperCase()}</Text>
            )}
          </View>
        ))}
      </View>
      <Text style={{ color: P.creamMuted, fontSize: 13, textAlign: 'center' }} numberOfLines={2}>
        {singers.map((s) => s.name).join(' · ')}
      </Text>
    </View>
  )
}

// =====================================================================
// Phase: Lineup — all finalists together
// =====================================================================
function Lineup({ step }: { step: AwardsRevealStep }) {
  const lineup = step.lineup || []
  const A = step.award ? normAward(step.award) : null
  const isSinger = A?.isSinger ?? false
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Rise delay={40}>
        <Eyebrow style={{ color: GOLD }}>{lineup.length === 1 ? 'Your Finalist' : 'Your Finalists'}</Eyebrow>
      </Rise>
      {A ? (
        <Rise delay={120}>
          <Text
            style={{
              color: P.creamFaint,
              fontSize: 11,
              letterSpacing: 2,
              fontWeight: '700',
              textTransform: 'uppercase',
              textAlign: 'center',
              alignSelf: 'stretch',
              marginTop: 8,
              paddingHorizontal: 8,
            }}
          >
            {A.title}
          </Text>
        </Rise>
      ) : null}
      <Rise delay={180} style={{ alignSelf: 'stretch', marginTop: 14, marginBottom: 22 }}>
        <GoldRule />
      </Rise>
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }}>
        {lineup.map((c, i) => (
          <Pop key={c.subjectKey} delay={240 + i * 130} from={0.6}>
            <View
              style={{
                width: 116,
                backgroundColor: 'rgba(212,175,55,0.06)',
                borderWidth: 1,
                borderColor: P.goldHairline,
                borderRadius: 18,
                paddingVertical: 16,
                paddingHorizontal: 10,
                alignItems: 'center',
              }}
            >
              <Avatar uri={c.avatarUrl} label={c.label} size={66} square={!isSinger} />
              <Text style={{ color: CREAM, fontFamily: P.fontDisplay, fontSize: 14, lineHeight: 18, textAlign: 'center', marginTop: 10 }} numberOfLines={2}>
                {isSinger ? c.label : c.trackName || c.label}
              </Text>
              {!isSinger && c.singers && c.singers.length ? (
                <Text style={{ color: GOLD, fontSize: 11, textAlign: 'center', marginTop: 4 }} numberOfLines={2}>
                  {c.singers.map((s) => s.name).join(', ')}
                </Text>
              ) : null}
            </View>
          </Pop>
        ))}
      </View>
    </View>
  )
}

// =====================================================================
// Phase: Winner
// =====================================================================
function Winner({ step }: { step: AwardsRevealStep }) {
  if (!step.award) return null
  const A = normAward(step.award)
  const winners = step.winners || []
  const isSinger = A.isSinger
  const winner = winners[0]
  const avatars = flattenWinnerAvatars(winners)

  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <LightSweep />
      {/* The award they won — the prominent headline ("Winner" is implied by
          the trophy/confetti context, so we drop that label). */}
      <Rise delay={40}>
        <Text
          style={{
            fontFamily: P.fontDisplay,
            fontSize: 27,
            lineHeight: 44,
            color: GOLD_BRIGHT,
            letterSpacing: 1.5,
            textAlign: 'center',
            alignSelf: 'stretch',
            textTransform: 'uppercase',
            paddingHorizontal: 6,
            textShadowColor: 'rgba(212,175,55,0.5)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 14,
          }}
        >
          {A.title}
        </Text>
      </Rise>
      <Rise delay={130} style={{ alignSelf: 'stretch', marginTop: 8 }}>
        <GoldRule />
      </Rise>

      {!winner ? (
        <View style={{ marginTop: 30, alignItems: 'center' }}>
          <Medallion iconId={A.iconId} iconDataUrl={A.iconDataUrl} size={104} delay={200} />
          <Rise delay={360} style={{ marginTop: 18 }}>
            <GlowTitle size={28}>No winner this round</GlowTitle>
          </Rise>
          <Rise delay={460}>
            <Text style={{ color: P.creamMuted, marginTop: 8, fontSize: 14, textAlign: 'center' }}>No votes were cast</Text>
          </Rise>
        </View>
      ) : (
        <>
          <View style={{ marginTop: 26, marginBottom: 18, flexDirection: 'row', justifyContent: 'center' }}>
            {avatars.length <= 1 ? (
              <Halo size={150} delay={220}>
                <Avatar uri={avatars[0]?.uri} label={avatars[0]?.initial} size={150} square={!isSinger} />
              </Halo>
            ) : (
              <Pop delay={220} from={0.5} style={{ flexDirection: 'row', justifyContent: 'center' }}>
                {avatars.slice(0, 5).map((a, i) => (
                  <View key={i} style={{ marginLeft: i === 0 ? 0 : -14 }}>
                    <Avatar uri={a.uri} label={a.initial} size={96} square={!isSinger} />
                  </View>
                ))}
              </Pop>
            )}
          </View>

          <Rise delay={420}>
            <GlowTitle size={34} color={CREAM}>{isSinger ? winner.label : winner.trackName || winner.label}</GlowTitle>
          </Rise>

          {!isSinger && winner.singers && winner.singers.length ? (
            <Rise delay={500}>
              <Text style={{ color: GOLD, marginTop: 6, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                {winner.singers.map((s) => s.name).join(', ')}
              </Text>
            </Rise>
          ) : null}

          {step.winnerStats ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 26, alignSelf: 'stretch' }}>
              <StatChip value={step.winnerStats.score} label="total score" delay={620} />
              <StatDivider />
              <StatChip
                value={step.winnerStats.firstPlaceVotes}
                label={`1st-place vote${step.winnerStats.firstPlaceVotes === 1 ? '' : 's'}`}
                delay={720}
              />
              <StatDivider />
              <StatChip
                value={step.winnerStats.totalVotes}
                label={`total vote${step.winnerStats.totalVotes === 1 ? '' : 's'}`}
                delay={820}
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  )
}

function StatDivider() {
  return <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(212,175,55,0.25)', marginVertical: 6 }} />
}

function StatChip({ value, label, delay }: { value: number; label: string; delay: number }) {
  return (
    <Pop delay={delay} from={0.7} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>
      {/* lineHeight ≥1.55× the size or Delauney's digits clip at the top. */}
      <CountUp value={value} delay={delay} style={{ color: GOLD_BRIGHT, fontFamily: P.fontDisplay, fontSize: 38, lineHeight: 60 }} />
      <Text
        style={{
          color: P.creamMuted,
          fontSize: 10,
          letterSpacing: 1.3,
          textTransform: 'uppercase',
          fontWeight: '700',
          marginTop: 4,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pop>
  )
}

function flattenWinnerAvatars(winners: NonNullable<AwardsRevealStep['winners']>): Array<{ uri: string | null; initial: string }> {
  const out: Array<{ uri: string | null; initial: string }> = []
  winners.forEach((w) => {
    if (w.singers && w.singers.length > 1) {
      w.singers.forEach((s) => out.push({ uri: s.profilePicture ?? null, initial: (s.name || '?').charAt(0).toUpperCase() }))
    } else {
      out.push({ uri: w.avatarUrl ?? null, initial: (w.label || '?').charAt(0).toUpperCase() })
    }
  })
  return out
}

// =====================================================================
// Phase: Finale — the full roll of winners
// =====================================================================
function Finale({ step }: { step: AwardsRevealStep }) {
  const summary = step.finaleSummary || []
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Rise delay={40}>
        <GildedText text="That's a Wrap!" maxSize={44} />
      </Rise>
      <Rise delay={140} style={{ alignSelf: 'stretch', marginTop: 14, marginBottom: 22 }}>
        <GoldRule />
      </Rise>
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
        {summary.map((s, i) => {
          const isSinger = ((s.award as any).subjectType ?? s.award.subject_type) === 'singer'
          const iconId = (s.award as any).iconId ?? (s.award as any).icon_id ?? null
          const iconDataUrl = (s.award as any).iconDataUrl ?? (s.award as any).icon_data_url ?? null
          const w = s.winners[0]
          return (
            <Rise key={i} delay={200 + i * 110} dist={16} style={{ width: '50%', padding: 6 }}>
              <View
                style={{
                  backgroundColor: 'rgba(212,175,55,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(212,175,55,0.28)',
                  borderRadius: 16,
                  padding: 12,
                  minHeight: 136,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <AwardIcon iconId={iconId} iconDataUrl={iconDataUrl} color={GOLD} size={22} />
                  <Text style={{ color: P.creamMuted, fontSize: 10, letterSpacing: 1, fontWeight: '700', textTransform: 'uppercase', flex: 1, lineHeight: 14 }} numberOfLines={2}>
                    {s.award.title}
                  </Text>
                </View>
                {!w ? (
                  <Text style={{ color: P.creamFaint, fontSize: 13 }}>No winner</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar uri={w.avatarUrl} label={w.label} size={46} square={!isSinger} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: P.fontDisplay, fontSize: 15, lineHeight: 20, color: GOLD_BRIGHT }} numberOfLines={2}>
                        {isSinger ? w.label : w.trackName || w.label}
                      </Text>
                      {!isSinger && w.singers && w.singers.length ? (
                        <Text style={{ color: P.creamMuted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                          {w.singers.map((x) => x.name).join(', ')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>
            </Rise>
          )
        })}
      </View>
    </View>
  )
}

// =====================================================================
// Phase: Encore build-up
// =====================================================================
function EncoreBuildup() {
  const pulse = useLoop(900)
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Halo size={120} delay={60}>
        <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: P.goldEdge, backgroundColor: 'rgba(212,175,55,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="mic" size={54} color={GOLD} />
        </View>
      </Halo>
      <Animated.View style={{ marginTop: 28, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }}>
        <GildedText text="Encore!" maxSize={64} />
      </Animated.View>
      <Rise delay={300}>
        <Text style={{ color: P.creamMuted, fontSize: 16, marginTop: 10, textAlign: 'center' }}>Get ready to vote…</Text>
      </Rise>
    </View>
  )
}

// =====================================================================
// Phase: Encore vote — tap a song as many times as you like
// =====================================================================
function EncoreVote({ step }: { step: AwardsRevealStep }) {
  const { session } = useSession()
  const songs = step.encoreSongs || []
  const [counts, setCounts] = useState<Record<string, number>>({})
  const countsRef = useRef(counts)
  countsRef.current = counts
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCounts({})
  }, [step.startedAt])

  useEffect(() => {
    if (!session) return
    const ch = supabase.channel('encore-' + session.sessionId)
    ch.subscribe()
    chRef.current = ch
    return () => {
      try {
        supabase.removeChannel(ch)
      } catch {
        /* ignore */
      }
      chRef.current = null
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [session?.sessionId])

  const scheduleSend = () => {
    if (!session || timerRef.current) return
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      try {
        chRef.current?.send({
          type: 'broadcast',
          event: 'encore-tally',
          payload: { guestId: session.guestId, counts: countsRef.current },
        })
      } catch {
        /* ignore */
      }
    }, 350)
  }

  const tap = (id: string) => {
    setCounts((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
    scheduleSend()
  }

  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Rise delay={30}>
        <GildedText text="Encore Vote!" maxSize={44} />
      </Rise>
      <Rise delay={120}>
        <Text style={{ color: P.creamMuted, fontSize: 14, marginTop: 6, marginBottom: 18, textAlign: 'center' }}>
          Tap a song as many times as you want
        </Text>
      </Rise>
      <View style={{ alignSelf: 'stretch', gap: 12 }}>
        {songs.map((s, i) => (
          <Rise key={s.id} delay={200 + i * 80} dist={16}>
            <EncoreSongTile song={s} count={counts[s.id] || 0} onPress={() => tap(s.id)} />
          </Rise>
        ))}
      </View>
    </View>
  )
}

function EncoreSongTile({
  song,
  count,
  onPress,
}: {
  song: NonNullable<AwardsRevealStep['encoreSongs']>[number]
  count: number
  onPress: () => void
}) {
  // Pop the count each time it changes.
  const bump = useRef(new Animated.Value(0)).current
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    bump.setValue(0)
    Animated.spring(bump, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start()
  }, [count, bump])
  const scale = bump.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.32, 1] })

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 12,
        borderRadius: 16,
        backgroundColor: pressed ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.07)',
        borderWidth: 1.5,
        borderColor: count > 0 ? GOLD : P.goldEdge,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {song.artUrl ? (
        <Image source={{ uri: song.artUrl }} style={{ width: 54, height: 54, borderRadius: 11 }} />
      ) : (
        <View style={{ width: 54, height: 54, borderRadius: 11, backgroundColor: 'rgba(212,175,55,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: GOLD, fontSize: 24 }}>♪</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: CREAM, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>
          {song.trackName}
        </Text>
        <Text style={{ color: P.creamMuted, fontSize: 12 }} numberOfLines={1}>
          {song.trackArtist}
        </Text>
      </View>
      <Animated.Text
        style={{
          color: count > 0 ? GOLD_BRIGHT : P.creamFaint,
          fontFamily: P.fontDisplay,
          fontSize: 28,
          // ≥1.55× the size so Delauney's digits don't clip at the top.
          lineHeight: 46,
          minWidth: 42,
          textAlign: 'right',
          transform: [{ scale }],
        }}
      >
        {count}
      </Animated.Text>
    </Pressable>
  )
}

// =====================================================================
// Phase: Encore winner
// =====================================================================
function EncoreWinner({ step }: { step: AwardsRevealStep }) {
  const w = step.encoreWinner
  if (!w) return null
  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Rise delay={30}>
        <Eyebrow style={{ color: GOLD, letterSpacing: 6 }}>The Encore</Eyebrow>
      </Rise>
      <View style={{ marginTop: 20, marginBottom: 18 }}>
        <Halo size={210} delay={160}>
          {w.artUrl ? (
            <Image source={{ uri: w.artUrl }} style={{ width: 200, height: 200, borderRadius: 20, borderWidth: 2, borderColor: GOLD }} />
          ) : (
            <View style={{ width: 200, height: 200, borderRadius: 20, borderWidth: 2, borderColor: GOLD, backgroundColor: 'rgba(212,175,55,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: GOLD, fontSize: 64 }}>♪</Text>
            </View>
          )}
        </Halo>
      </View>
      <Rise delay={360}>
        <GlowTitle size={32} color={CREAM}>{w.trackName}</GlowTitle>
      </Rise>
      <Rise delay={460}>
        <Text style={{ color: P.creamMuted, fontSize: 16, marginTop: 6, textAlign: 'center' }}>{w.trackArtist}</Text>
      </Rise>
    </View>
  )
}

// =====================================================================
// Confetti — gold-toned falling pieces
// =====================================================================
function Confetti() {
  const { width, height } = useWindowDimensions()
  const pieces = useRef(
    Array.from({ length: 34 }, () => ({
      left: Math.random(),
      color: ['#fde68a', '#f4d35e', '#d4af37', '#fff6d6', '#e6c252', '#b8860b'][Math.floor(Math.random() * 6)],
      duration: 2600 + Math.random() * 1900,
      delay: Math.random() * 1400,
      rotate: Math.floor(Math.random() * 360),
      size: 6 + Math.random() * 6,
    })),
  ).current
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -80, left: 0, width, height: height + 160 }}>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} {...p} width={width} fall={height + 160} />
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
  size,
  width,
  fall,
}: {
  left: number
  color: string
  duration: number
  delay: number
  rotate: number
  size: number
  width: number
  fall: number
}) {
  const y = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
      ]),
    ).start()
  }, [y, duration, delay])
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [-40, fall] })
  const sway = y.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 14, -10] })
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: left * width,
        width: size,
        height: size * 1.6,
        backgroundColor: color,
        borderRadius: 1.5,
        opacity: 0.9,
        transform: [{ translateY }, { translateX: sway }, { rotate: `${rotate}deg` }],
      }}
    />
  )
}
