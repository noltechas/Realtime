import React, { useMemo, useRef } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Path } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import {
  type KaraokeQueueRow,
  type SingerConfig,
  type ThemeTokens,
} from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey, hexToRgba } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import { ScanlineOverlay, NeonText } from '../primitives'
import type { QueueRowProps } from '../../../types'

// Retrowave QueueRow — a wide neon cassette plate. Each row has:
//   • Indigo body, hot-pink rim, magenta/cyan dual halo.
//   • A continuous cyan scan band sliding right→left, staggered per row.
//   • Faint scanlines drift across the whole row.
//   • Position badge is a glowing pink neon-tube number.
//   • Album art sits in a cyan-frame porthole.
//   • Singer pills are sharp-corner neon chips with chromatic-aberration text.
//   • Vote buttons are pink/cyan "PLAY"-style triangle pads with chrome top
//     highlights. Pressing fires a small white burst.
export function RetrowaveQueueRow({
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
  const seedHash = hashKey(rowSeed)

  const scan = useLinearLoop(7000 + (seedHash % 13) * 220)
  const scanX = scan.interpolate({
    inputRange: [0, 1],
    outputRange: ['160%', '-100%'],
  })

  return (
    <View
      style={{
        backgroundColor: '#1A0A3A',
        borderWidth: 1,
        borderColor: '#FF2D95',
        overflow: 'hidden',
        shadowColor: '#FF2D95',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
      }}
    >
      {/* Top chrome highlight */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }}
      >
        <LinearGradient
          colors={['rgba(255,181,222,0.85)', 'rgba(255,45,149,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      {/* Scanlines */}
      <ScanlineOverlay rowGap={3} opacity={0.12} color="#000000" />

      {/* Travelling cyan scan band */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: scanX }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(0,240,255,0)',
            'rgba(0,240,255,0.18)',
            'rgba(255,45,149,0.22)',
            'rgba(0,240,255,0.18)',
            'rgba(0,240,255,0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { width: '55%' }]}
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
        <PositionBadge n={position} seed={seedHash} />

        {isHidden ? (
          <View style={hiddenArtStyle()}>
            <Text style={hiddenArtGlyphStyle()}>?</Text>
          </View>
        ) : item.track_art_url ? (
          <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 56,
                height: 56,
                borderWidth: 1.5,
                borderColor: '#00F0FF',
                shadowColor: '#00F0FF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.95,
                shadowRadius: 6,
              }}
            />
            <Image source={{ uri: item.track_art_url }} style={artStyle()} />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 48,
                height: 48,
                backgroundColor: 'rgba(255,45,149,0.18)',
              }}
            />
          </View>
        ) : (
          <View style={[artStyle() as ViewStyle, { backgroundColor: tokens.appBg }]} />
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ marginBottom: 2 }}>
            <NeonText
              style={{
                fontFamily: tokens.fontBody,
                fontSize: 14,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                fontStyle: 'italic',
              } as any}
              pinkColor="#FF2D95"
              cyanColor="#00F0FF"
              centerColor="#FFFFFF"
              fringe={0.9}
            >
              {isHidden ? 'HIDDEN SONG' : item.track_name}
            </NeonText>
          </View>
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

function PositionBadge({ n, seed }: { n: number; seed: number }) {
  const { tokens } = useTheme()
  const flicker = useOscillator(1900 + (seed % 7) * 200)
  const opacity = flicker.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] })

  return (
    <Animated.View
      style={{
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          backgroundColor: '#0E0526',
          borderWidth: 1.5,
          borderColor: '#FF2D95',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#FF2D95',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.95,
          shadowRadius: 6,
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontBody,
            fontSize: 14,
            color: '#FF2D95',
            letterSpacing: 0.4,
            textShadowColor: 'rgba(255,45,149,0.9)',
            textShadowRadius: 6,
            textShadowOffset: { width: 0, height: 0 },
            fontStyle: 'italic',
          }}
        >
          {n}
        </Text>
      </View>
    </Animated.View>
  )
}

function EditButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [
        editBtnStyle(),
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Ionicons name="create-outline" size={20} color="#FF2D95" />
    </Pressable>
  )
}

function SingerChip({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  const tint = singer.color || '#FF2D95'
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingLeft: 4,
        paddingVertical: 2,
        backgroundColor: hexToRgba(tint, 0.2) ?? 'rgba(255,45,149,0.2)',
        borderWidth: 1,
        borderColor: tint,
        shadowColor: tint,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#0A0420',
        }}
      >
        {singer.profilePicture ? (
          <Image source={{ uri: singer.profilePicture }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text
            style={{
              color: '#0A0420',
              fontFamily: tokens.fontBody,
              fontSize: 9,
            }}
          >
            {initial}
          </Text>
        )}
      </View>
      <Text
        style={{
          color: '#F4E8FF',
          fontFamily: tokens.fontBody,
          fontSize: 11,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          fontStyle: 'italic',
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
      <View style={lockBadgeStyle()}>
        <Ionicons name="lock-closed" size={16} color="#FF2D95" />
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
        <View style={votedPillStyle(voted > 0)}>
          <Ionicons name="checkmark" size={11} color="#0A0420" />
          <Text style={votedPillLabelStyle(tokens)}>
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
        <VoteButton dir="up" onPress={() => onVote(row, 1)} />
        <VoteButton dir="down" onPress={() => onVote(row, -1)} />
      </View>
    </View>
  )
}

function VoteButton({ dir, onPress }: { dir: 'up' | 'down'; onPress: () => void }) {
  const press = useRef(new Animated.Value(0)).current
  const isUp = dir === 'up'
  const triggerPress = () => {
    press.setValue(0)
    Animated.timing(press, {
      toValue: 1,
      duration: 460,
      useNativeDriver: true,
    }).start()
  }
  const burstScale = press.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.8] })
  const burstOpacity = press.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.85, 0],
  })

  return (
    <Pressable
      onPress={() => {
        triggerPress()
        onPress()
      }}
      style={({ pressed }) => [
        voteBtnStyle(isUp),
        pressed ? { opacity: 0.85, transform: [{ translateY: 1 }] } : null,
      ]}
      accessibilityLabel={isUp ? 'Upvote' : 'Downvote'}
    >
      <LinearGradient
        colors={isUp ? ['#FFB5DE', '#FF2D95', '#5A0838'] : ['#B5F5FF', '#00F0FF', '#003844']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Chrome top highlight */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#FFFFFF', opacity: 0.7 }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 5,
          borderRightWidth: 5,
          borderTopWidth: isUp ? 0 : 6,
          borderBottomWidth: isUp ? 6 : 0,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: isUp ? 'transparent' : '#0A0420',
          borderBottomColor: isUp ? '#0A0420' : 'transparent',
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 40,
          height: 40,
          left: -3,
          top: -3,
          opacity: burstOpacity,
          transform: [{ scale: burstScale }],
        }}
      >
        <Svg width={40} height={40}>
          <Circle cx={20} cy={20} r={18} fill={isUp ? '#FF2D95' : '#00F0FF'} opacity={0.5} />
        </Svg>
      </Animated.View>
    </Pressable>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const { tokens } = useTheme()
  const color = score > 0 ? '#00F0FF' : score < 0 ? '#FF003C' : '#F4E8FF'
  return <Text style={[scoreStyle(tokens), { color }]}>{score}</Text>
}

function artStyle(): ImageStyle {
  return {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: '#003844',
  }
}
function hiddenArtStyle(): ViewStyle {
  return {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#FF2D95',
    backgroundColor: '#0E0526',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
function hiddenArtGlyphStyle(): TextStyle {
  return {
    color: '#FF2D95',
    fontSize: 22,
    lineHeight: 26,
  }
}
function artistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontSize: 11,
    color: '#9A82CF',
    marginTop: 2,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
    fontFamily: t.fontBody,
    fontSize: 16,
    minWidth: 28,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 1,
    fontStyle: 'italic',
  }
}
const voteButtonsStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}
function voteBtnStyle(isUp: boolean): ViewStyle {
  return {
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: isUp ? '#FF2D95' : '#00F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: isUp ? '#FF2D95' : '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 6,
  }
}
function votedPillStyle(up: boolean): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: up ? '#FF2D95' : '#00F0FF',
    borderWidth: 1,
    borderColor: up ? '#5A0838' : '#003844',
  }
}
function votedPillLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#0A0420',
    fontFamily: t.fontBody,
    fontSize: 9,
    letterSpacing: 1.4,
    fontStyle: 'italic',
  }
}
function lockBadgeStyle(): ViewStyle {
  return {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,45,149,0.2)',
    borderWidth: 1.5,
    borderColor: '#FF2D95',
    marginLeft: 4,
  }
}
function lockLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#FF2D95',
    fontFamily: t.fontBody,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  }
}
function editBtnStyle(): ViewStyle {
  return {
    width: 38,
    height: 38,
    borderWidth: 1.5,
    borderColor: '#FF2D95',
    backgroundColor: 'rgba(255,45,149,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
    shadowColor: '#FF2D95',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  }
}
