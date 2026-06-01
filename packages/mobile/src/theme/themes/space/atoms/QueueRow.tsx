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
import Svg, { Circle } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import {
  type KaraokeQueueRow,
  type SingerConfig,
  type ThemeTokens,
} from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey, hexToRgba } from '../../../helpers'
import { useOscillator } from '../_shared'
import type { QueueRowProps } from '../../../types'

// Space QueueRow — a wide HUD console panel:
//   • Translucent void background, magenta rim, HUD corner brackets.
//   • A continuous cyan→magenta aurora sweep travels across the row on a
//     staggered delay per-row.
//   • Position badge is a tiny planet badge with an orbit ring.
//   • Album art has the same cyan dashed orbit ring as the SongCard.
//   • Singer pills are HUD chips with a planet glyph at the leading edge.
//   • Vote buttons get a rocket-thrust glow under them on hover/press.
export function SpaceQueueRow({
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

  const rowSeed = item.id ?? `${position}`

  // Aurora sweep — staggered per-row delay so adjacent rows don't pulse together.
  const sweep = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const startDelay = hashKey(rowSeed) % 4500
    const t = setTimeout(() => {
      Animated.loop(
        Animated.timing(sweep, {
          toValue: 1,
          duration: 8000,
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
      style={{
        backgroundColor: 'rgba(14,14,26,0.85)',
        borderWidth: 1,
        borderColor: 'rgba(224,64,251,0.28)',
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: tokens.accentGlowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      }}
    >
      {/* Aurora sweep */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transform: [{ translateX: sweepX }] }]}
      >
        <LinearGradient
          colors={[
            'rgba(224,64,251,0)',
            'rgba(224,64,251,0.14)',
            'rgba(64,224,208,0.12)',
            'rgba(168,194,255,0.08)',
            'rgba(224,64,251,0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* HUD corner brackets */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, width: 10, height: 10 }}
      >
        <View style={{ width: 10, height: 1.5, backgroundColor: '#E040FB' }} />
        <View style={{ width: 1.5, height: 8, backgroundColor: '#E040FB' }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 10,
          height: 10,
          alignItems: 'flex-end',
        }}
      >
        <View style={{ width: 10, height: 1.5, backgroundColor: '#E040FB' }} />
        <View style={{ width: 1.5, height: 8, backgroundColor: '#E040FB' }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 10,
          height: 10,
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ width: 1.5, height: 8, backgroundColor: '#40E0D0' }} />
        <View style={{ width: 10, height: 1.5, backgroundColor: '#40E0D0' }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 10,
          height: 10,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ width: 1.5, height: 8, backgroundColor: '#40E0D0' }} />
        <View style={{ width: 10, height: 1.5, backgroundColor: '#40E0D0' }} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 12,
        }}
      >
        <PositionBadge n={position} />

        {isHidden ? (
          <View style={hiddenArtStyle(tokens)}>
            <Text style={hiddenArtGlyphStyle(tokens)}>?</Text>
          </View>
        ) : item.track_art_url ? (
          <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 56,
                height: 56,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: 'rgba(64,224,208,0.45)',
                borderStyle: 'dashed',
              }}
            />
            <Image source={{ uri: item.track_art_url }} style={artStyle(tokens)} />
          </View>
        ) : (
          <View style={[artStyle(tokens) as ViewStyle, { backgroundColor: tokens.appBg }]} />
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={titleStyle(tokens)} numberOfLines={1}>
            {isHidden ? 'HIDDEN SONG' : item.track_name}
          </Text>
          {!isHidden && (
            <Text style={artistStyle(tokens)} numberOfLines={1}>
              {item.track_artist}
            </Text>
          )}
          {singers.length > 0 ? (
            <View style={singerPillsStyle}>
              {singers.map((singer, i) => (
                <SingerChip
                  key={`${item.id}-${i}-${singer.name}`}
                  singer={singer}
                />
              ))}
            </View>
          ) : null}
        </View>

        {isMine ? (
          <EditButton onPress={() => onEdit(item)} />
        ) : (
          <VoteColumn
            row={item}
            score={score}
            voted={voted}
            isLocked={isLocked}
            inSong={inSong}
            onVote={onVote}
          />
        )}
      </View>
    </View>
  )
}

// ─── Inner atoms ────────────────────────────────────────────────────────────

function PositionBadge({ n }: { n: number }) {
  const { tokens } = useTheme()
  // Faint pulse on the badge so it reads as an active radar contact.
  const pulse = useOscillator(2200 + (n % 5) * 180)
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  })

  return (
    <View
      style={{
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: tokens.accentA,
          opacity: ringOpacity,
        }}
      />
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: 'rgba(224,64,251,0.15)',
          borderWidth: 1,
          borderColor: tokens.accentA,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 13,
            color: tokens.black,
            textShadowColor: 'rgba(224,64,251,0.7)',
            textShadowRadius: 6,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          {n}
        </Text>
      </View>
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
      <Ionicons name="create-outline" size={20} color={tokens.accentA} />
    </Pressable>
  )
}

function SingerChip({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  const tint = singer.color || tokens.accentA
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingLeft: 4,
        paddingVertical: 2,
        backgroundColor: hexToRgba(tint, 0.18) ?? 'rgba(224,64,251,0.18)',
        borderWidth: 1,
        borderColor: tint,
        borderRadius: 4,
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          shadowColor: tint,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.95,
          shadowRadius: 4,
        }}
      >
        {singer.profilePicture ? (
          <Image source={{ uri: singer.profilePicture }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text
            style={{
              color: '#08080F',
              fontFamily: tokens.fontDisplay,
              fontSize: 9,
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
          fontSize: 11,
          letterSpacing: 0.8,
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
}: {
  row: KaraokeQueueRow
  score: number
  voted?: 1 | -1
  isLocked: boolean
  inSong: boolean
  onVote: (row: KaraokeQueueRow, value: 1 | -1) => void
}) {
  const { tokens } = useTheme()
  if (isLocked) {
    return (
      <View style={lockBadgeStyle(tokens)}>
        <Ionicons name="lock-closed" size={16} color={tokens.accentB} />
        <Text style={lockLabelStyle(tokens)}>Next{'\n'}Locked</Text>
      </View>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={voteColStyle}>
        <ScoreLabel score={score} />
      </View>
    )
  }

  if (voted) {
    return (
      <View style={voteColStyle}>
        {score !== 0 ? <ScoreLabel score={score} /> : null}
        <View style={votedPillStyle(tokens, voted > 0)}>
          <Ionicons name="checkmark" size={11} color="#08080F" />
          <Text style={votedPillLabelStyle(tokens, voted > 0)}>
            {voted > 0 ? 'BOOSTED' : 'DAMPED'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={voteColStyle}>
      {score !== 0 ? <ScoreLabel score={score} /> : null}
      <View style={voteButtonsStyle}>
        <Pressable
          onPress={() => onVote(row, 1)}
          style={({ pressed }) => [
            voteBtnStyle(tokens, 'up'),
            pressed ? { opacity: 0.7, transform: [{ translateY: 1 }] } : null,
          ]}
          accessibilityLabel="Upvote"
        >
          <ThrusterGlyph dir="up" />
        </Pressable>
        <Pressable
          onPress={() => onVote(row, -1)}
          style={({ pressed }) => [
            voteBtnStyle(tokens, 'down'),
            pressed ? { opacity: 0.7, transform: [{ translateY: 1 }] } : null,
          ]}
          accessibilityLabel="Downvote"
        >
          <ThrusterGlyph dir="down" />
        </Pressable>
      </View>
    </View>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const { tokens } = useTheme()
  const color = score > 0 ? tokens.accentB : score < 0 ? tokens.hotRed : tokens.black
  return <Text style={[scoreStyle(tokens), { color }]}>{score}</Text>
}

// Rocket-thruster glyph — chevron + a faint glowing fin underneath.
function ThrusterGlyph({ dir }: { dir: 'up' | 'down' }) {
  const isUp = dir === 'up'
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={16} height={16} viewBox="0 0 16 16">
        {isUp ? (
          <>
            <Circle cx={8} cy={13} r={2.5} fill="#FFC34D" opacity={0.55} />
            <Circle cx={8} cy={13} r={1.4} fill="#FFC34D" />
          </>
        ) : (
          <>
            <Circle cx={8} cy={3} r={2.5} fill="#FF4060" opacity={0.55} />
            <Circle cx={8} cy={3} r={1.4} fill="#FF4060" />
          </>
        )}
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Ionicons
          name={isUp ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="#E8E6F0"
        />
      </View>
    </View>
  )
}

// ─── per-element style builders ─────────────────────────────────────────────

function artStyle(t: ThemeTokens): ImageStyle {
  return {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(224,64,251,0.6)',
  }
}
function hiddenArtStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.accentA,
    backgroundColor: 'rgba(224,64,251,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
function hiddenArtGlyphStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.accentA,
    fontFamily: t.fontDisplay,
    fontSize: 22,
    lineHeight: 26,
  }
}
function titleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontSize: 14,
    color: t.black,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(224,64,251,0.45)',
    textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 0 },
  }
}
function artistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontSize: 12,
    color: t.muted,
    marginTop: 2,
    letterSpacing: 0.3,
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
    fontSize: 16,
    minWidth: 28,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 1,
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
    borderRadius: 4,
    borderWidth: 1,
    borderColor: isUp ? t.accentB : t.hotRed,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isUp ? 'rgba(64,224,208,0.18)' : 'rgba(255,64,96,0.18)',
    shadowColor: isUp ? t.accentB : t.hotRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
  }
}
function votedPillStyle(t: ThemeTokens, up: boolean): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: up ? 'rgba(64,224,208,0.85)' : 'rgba(255,64,96,0.85)',
    borderWidth: 1,
    borderColor: up ? t.accentB : t.hotRed,
    borderRadius: 4,
  }
}
function votedPillLabelStyle(t: ThemeTokens, _up: boolean): TextStyle {
  return {
    color: '#08080F',
    fontFamily: t.fontDisplay,
    fontSize: 9,
    letterSpacing: 1,
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
    backgroundColor: 'rgba(64,224,208,0.15)',
    borderWidth: 1,
    borderColor: t.accentB,
    borderRadius: 6,
    marginLeft: 4,
  }
}
function lockLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.accentB,
    fontFamily: t.fontDisplay,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    letterSpacing: 0.6,
  }
}
function editBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 38,
    height: 38,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: t.accentA,
    backgroundColor: 'rgba(224,64,251,0.18)',
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
