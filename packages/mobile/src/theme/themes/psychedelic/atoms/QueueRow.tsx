import React, { useMemo, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import {
  type KaraokeQueueRow,
  type SingerConfig,
  type ThemeTokens,
} from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { blobCornerRadii, hashKey, hexToRgba } from '../../../helpers'
import { useOscillator } from '../_shared'
import type { QueueRowProps } from '../../../types'

// Reusable per-element breath wrapper. Every interactive/visible child of the
// row gets one of these so it pulses on its own native-driver scale oscillator.
// `seed` is hashed into the period so siblings inside the same row never share
// a phase. NO Y translation anywhere — psychedelic foreground breathes only.
function Breathing({
  seed,
  amplitude = 0.04,
  basePeriod = 2400,
  style,
  children,
}: {
  seed: string | number
  amplitude?: number
  basePeriod?: number
  style?: ViewStyle
  children: React.ReactNode
}) {
  const hash = hashKey(seed)
  const period = basePeriod + (hash % 17) * 200
  const breath = useOscillator(period)
  const scale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1 - amplitude, 1 + amplitude],
  })
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
  )
}

// Psychedelic QueueRow — translucent purple panel with asymmetric blob
// corners + an aurora gradient sweep. Every visible element (position badge,
// art, title, artist, singer pills, vote/edit buttons, lock/voted badges,
// score) pulses on its own native-driver scale oscillator so the row feels
// alive without any vertical motion.
export function PsychedelicQueueRow({
  item,
  position,
  voted,
  guestName,
  guestId,
  guests,
  onVote,
  onEdit,
}: QueueRowProps) {
  const { tokens } = useTheme()
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)
  const singers = useMemo<SingerConfig[]>(
    () =>
      (Array.isArray(item.singer_configs) ? item.singer_configs : []).map(
        (sc) => {
          // Resolve the singer's LIVE name + avatar from the canonical guest
          // record (so profile edits propagate). Name-only singers pass through.
          const g = sc.guestId ? guests.get(sc.guestId) : undefined
          return g
            ? { ...sc, name: g.name, profilePicture: g.profile_picture ?? undefined }
            : sc
        },
      ),
    [item.singer_configs, guests],
  )
  const isLocked = item.locked && position === 1
  const inSong = useMemo(() => {
    if (guestId && singers.some((s) => s.guestId === guestId)) return true
    const gn = (guestName || '').toLowerCase()
    return !!gn && singers.some((s) => (s.name || '').toLowerCase() === gn)
  }, [singers, guestName, guestId])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden

  const shape = blobCornerRadii(hashKey(`q-${item.id}`))
  const rowSeed = item.id ?? `${position}`

  // Aurora sweep across the row, staggered per-row by a hashed delay.
  const sweep = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const startDelay = hashKey(rowSeed) % 4000
    const t = setTimeout(() => {
      Animated.loop(
        Animated.timing(sweep, {
          toValue: 1,
          duration: 7000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start()
    }, startDelay)
    return () => clearTimeout(t)
  }, [sweep, rowSeed])

  const sweepX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '100%'],
  })

  return (
    <View
      style={[
        shape,
        {
          backgroundColor: 'rgba(42,20,80,0.82)',
          borderWidth: 1,
          borderColor: 'rgba(255,45,149,0.3)',
          overflow: 'hidden',
          shadowColor: tokens.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: sweepX }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255,45,149,0)',
            'rgba(255,45,149,0.15)',
            'rgba(255,140,45,0.12)',
            'rgba(182,255,45,0.10)',
            'rgba(255,45,149,0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 12,
        }}
      >
        <Breathing seed={`pos-${rowSeed}`} amplitude={0.05}>
          <PositionBadge n={position} />
        </Breathing>

        <Breathing seed={`art-${rowSeed}`} amplitude={0.035}>
          {isHidden ? (
            <View style={hiddenArtStyle(tokens)}>
              <Text style={hiddenArtGlyphStyle(tokens)}>?</Text>
            </View>
          ) : item.track_art_url ? (
            <Image source={{ uri: item.track_art_url }} style={artStyle(tokens)} />
          ) : (
            <View style={[artStyle(tokens) as ViewStyle, { backgroundColor: tokens.appBg }]} />
          )}
        </Breathing>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Breathing
            seed={`title-${rowSeed}`}
            amplitude={0.025}
            style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
          >
            <Text style={titleStyle(tokens)} numberOfLines={1}>
              {isHidden ? 'HIDDEN SONG' : item.track_name}
            </Text>
          </Breathing>
          {!isHidden && (
            <Breathing
              seed={`artist-${rowSeed}`}
              amplitude={0.022}
              style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
            >
              <Text style={artistStyle(tokens)} numberOfLines={1}>
                {item.track_artist}
              </Text>
            </Breathing>
          )}
          {singers.length > 0 ? (
            <View style={singerPillsStyle}>
              {singers.map((singer, i) => (
                <Breathing
                  key={`${item.id}-${i}-${singer.name}`}
                  seed={`singer-${rowSeed}-${i}`}
                  amplitude={0.035}
                >
                  <SingerBubble singer={singer} />
                </Breathing>
              ))}
            </View>
          ) : null}
        </View>

        {isMine ? (
          <Breathing seed={`edit-${rowSeed}`} amplitude={0.04}>
            <EditButton onPress={() => onEdit(item)} />
          </Breathing>
        ) : (
          <VoteColumn
            row={item}
            score={score}
            voted={voted}
            isLocked={isLocked}
            inSong={inSong}
            onVote={onVote}
            seed={rowSeed}
          />
        )}
      </View>
    </View>
  )
}

// ─── Inner atoms ────────────────────────────────────────────────────────────

function PositionBadge({ n }: { n: number }) {
  const { tokens } = useTheme()
  const shape = blobCornerRadii(hashKey(`pos-${n}`))
  return (
    <View
      style={[
        shape,
        {
          minWidth: 32,
          height: 32,
          paddingHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,45,149,0.18)',
          borderWidth: 1,
          borderColor: tokens.accentA,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 16,
          color: tokens.accentA,
          textShadowColor: 'rgba(255,45,149,0.7)',
          textShadowRadius: 6,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {n}
      </Text>
    </View>
  )
}

function EditButton({ onPress }: { onPress: () => void }) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [
        editBtnStyle(tokens),
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Ionicons name="create-outline" size={22} color={tokens.accentA} />
    </Pressable>
  )
}

function SingerBubble({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  const tint = singer.color || tokens.accentA
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingLeft: 4,
        paddingVertical: 2,
        backgroundColor: hexToRgba(tint, 0.15) ?? 'rgba(255,45,149,0.15)',
        borderWidth: 1,
        borderColor: tint,
        borderRadius: 999,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {singer.profilePicture ? (
          <Image source={{ uri: singer.profilePicture }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text
            style={{
              color: tokens.appBg,
              fontFamily: tokens.fontDisplay,
              fontSize: 10,
            }}
          >
            {initial}
          </Text>
        )}
      </View>
      <Text
        style={{
          color: tokens.black,
          fontFamily: tokens.fontDisplay,
          fontSize: 12,
        }}
        numberOfLines={1}
      >
        {singer.name || 'Singer'}
      </Text>
    </View>
  )
}

function VoteColumn({
  row,
  score,
  voted,
  isLocked,
  inSong,
  onVote,
  seed,
}: {
  row: KaraokeQueueRow
  score: number
  voted?: 1 | -1
  isLocked: boolean
  inSong: boolean
  onVote: (row: KaraokeQueueRow, value: 1 | -1) => void
  seed: string
}) {
  const { tokens } = useTheme()
  if (isLocked) {
    return (
      <Breathing seed={`lock-${seed}`} amplitude={0.04}>
        <View style={lockBadgeStyle(tokens)}>
          <Ionicons name="lock-closed" size={18} color={tokens.accentC} />
          <Text style={lockLabelStyle(tokens)}>Next Up{'\n'}Locked</Text>
        </View>
      </Breathing>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={voteColStyle}>
        <Breathing seed={`score-${seed}`} amplitude={0.05}>
          <ScoreLabel score={score} />
        </Breathing>
      </View>
    )
  }

  if (voted) {
    return (
      <View style={voteColStyle}>
        {score !== 0 ? (
          <Breathing seed={`score-${seed}`} amplitude={0.05}>
            <ScoreLabel score={score} />
          </Breathing>
        ) : null}
        <Breathing seed={`voted-${seed}`} amplitude={0.04}>
          <View style={votedPillStyle(tokens, voted > 0)}>
            <Ionicons name="checkmark" size={11} color="#fff" />
            <Text style={votedPillLabelStyle(tokens)}>
              {voted > 0 ? 'Voted Up' : 'Voted Down'}
            </Text>
          </View>
        </Breathing>
      </View>
    )
  }

  return (
    <View style={voteColStyle}>
      {score !== 0 ? (
        <Breathing seed={`score-${seed}`} amplitude={0.05}>
          <ScoreLabel score={score} />
        </Breathing>
      ) : null}
      <View style={voteButtonsStyle}>
        <Breathing seed={`up-${seed}`} amplitude={0.05}>
          <Pressable
            onPress={() => onVote(row, 1)}
            style={({ pressed }) => [
              voteBtnStyle(tokens, 'up'),
              pressed ? { opacity: 0.7 } : null,
            ]}
            accessibilityLabel="Upvote"
          >
            <Ionicons name="chevron-up" size={18} color="#fff" />
          </Pressable>
        </Breathing>
        <Breathing seed={`down-${seed}`} amplitude={0.05}>
          <Pressable
            onPress={() => onVote(row, -1)}
            style={({ pressed }) => [
              voteBtnStyle(tokens, 'down'),
              pressed ? { opacity: 0.7 } : null,
            ]}
            accessibilityLabel="Downvote"
          >
            <Ionicons name="chevron-down" size={18} color="#fff" />
          </Pressable>
        </Breathing>
      </View>
    </View>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const { tokens } = useTheme()
  const color = score > 0 ? tokens.accentB : score < 0 ? tokens.hotRed : tokens.black
  return <Text style={[scoreStyle(tokens), { color }]}>{score}</Text>
}

// ─── per-element style builders ─────────────────────────────────────────────

function artStyle(t: ThemeTokens): ImageStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderTopLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,140,45,0.4)',
  }
}
function hiddenArtStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderTopLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: t.accentA,
    backgroundColor: 'rgba(255,45,149,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
function hiddenArtGlyphStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.accentA,
    fontFamily: t.fontDisplay,
    fontSize: 24,
    lineHeight: 28,
  }
}
function titleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontSize: 16,
    color: t.accentA,
    textShadowColor: 'rgba(255,45,149,0.4)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 0 },
  }
}
function artistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontSize: 12,
    color: t.accentB,
    marginTop: 1,
  }
}
const singerPillsStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 8,
}
const voteColStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginLeft: 4,
  alignSelf: 'center',
}
function scoreStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontSize: 17,
    minWidth: 28,
    textAlign: 'center',
    lineHeight: 20,
  }
}
const voteButtonsStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}
function voteBtnStyle(t: ThemeTokens, dir: 'up' | 'down'): ViewStyle {
  const isUp = dir === 'up'
  return {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: isUp ? t.accentB : t.hotRed,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isUp ? 'rgba(182,255,45,0.25)' : 'rgba(255,45,149,0.25)',
    shadowColor: isUp ? t.accentB : t.hotRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  }
}
function votedPillStyle(t: ThemeTokens, up: boolean): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: up ? 'rgba(182,255,45,0.25)' : 'rgba(255,45,149,0.25)',
    borderWidth: 1,
    borderColor: up ? t.accentB : t.accentA,
    borderRadius: 999,
  }
}
function votedPillLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#fff',
    fontFamily: t.fontDisplay,
    fontSize: 10,
    letterSpacing: 0.5,
  }
}
function lockBadgeStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,140,45,0.2)',
    borderWidth: 1,
    borderColor: t.accentC,
    borderRadius: 14,
    marginLeft: 4,
  }
}
function lockLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.accentC,
    fontFamily: t.fontDisplay,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  }
}
function editBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.accentA,
    backgroundColor: 'rgba(255,45,149,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  }
}
