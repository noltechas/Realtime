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
import Svg, { Circle } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import {
  type KaraokeQueueRow,
  type SingerConfig,
  type ThemeTokens,
} from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey, hexToRgba } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import { Gear, Rivet } from '../Gear'
import type { QueueRowProps } from '../../../types'

// Steampunk QueueRow — a wide riveted brass plate fastened over mahogany:
//   • Mahogany row body with a 2px brass rim and four corner rivets.
//   • Position badge is a small brass numbered medallion with a rotating
//     gear behind the number (slow, continuous).
//   • Album art sits inside a circular brass-bezel porthole.
//   • Singer pills are tiny copper-edged plaques with a colored cabochon at
//     the leading edge.
//   • Vote buttons are pressure-valve bellows: pressing them puffs a tiny
//     steam burst (handled here as a soft amber overlay).
//   • The active row gets a slow brass shimmer sweep moving left→right.
export function SteampunkQueueRow({
  item,
  position,
  voted,
  guestName,
  guestId,
  onVote,
  onEdit,
}: QueueRowProps) {
  const { tokens } = useTheme()
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)
  const singers = useMemo<SingerConfig[]>(
    () => (Array.isArray(item.singer_configs) ? item.singer_configs : []),
    [item.singer_configs],
  )
  const isLocked = item.locked && position === 1
  const inSong = useMemo(() => {
    const gn = (guestName || '').toLowerCase()
    return singers.some((s) => (s.name || '').toLowerCase() === gn)
  }, [singers, guestName])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden

  const rowSeed = item.id ?? `${position}`
  const seedHash = hashKey(rowSeed)

  // Brass shimmer sweep — periodic specular highlight sliding across.
  const shimmer = useLinearLoop(7800 + (seedHash % 13) * 240)
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['-60%', '160%'],
  })

  return (
    <View
      style={{
        backgroundColor: '#2A1A0E',
        borderWidth: 2,
        borderColor: '#B8762D',
        borderRadius: 8,
        overflow: 'hidden',
        shadowColor: '#E8A93B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      }}
    >
      {/* Warm interior tint */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(232,169,59,0.06)',
          'rgba(122,77,26,0.08)',
          'rgba(58,30,8,0.16)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Shimmer sweep */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: shimmerX }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(232,196,120,0)',
            'rgba(232,196,120,0.18)',
            'rgba(232,169,59,0.24)',
            'rgba(232,196,120,0.12)',
            'rgba(232,196,120,0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { width: '60%' }]}
        />
      </Animated.View>

      {/* Corner rivets */}
      <View style={{ position: 'absolute', top: 4, left: 4 }}><Rivet size={9} /></View>
      <View style={{ position: 'absolute', top: 4, right: 4 }}><Rivet size={9} /></View>
      <View style={{ position: 'absolute', bottom: 4, left: 4 }}><Rivet size={9} /></View>
      <View style={{ position: 'absolute', bottom: 4, right: 4 }}><Rivet size={9} /></View>

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
          <View style={hiddenArtStyle(tokens)}>
            <Text style={hiddenArtGlyphStyle(tokens)}>?</Text>
          </View>
        ) : item.track_art_url ? (
          <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer brass ring */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 56,
                height: 56,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: '#B8762D',
              }}
            />
            <Image source={{ uri: item.track_art_url }} style={artStyle(tokens)} />
            {/* Sepia tint */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 46,
                height: 46,
                borderRadius: 999,
                backgroundColor: 'rgba(232,169,59,0.10)',
              }}
            />
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

function PositionBadge({ n, seed }: { n: number; seed: number }) {
  const { tokens } = useTheme()
  const spin = useLinearLoop(11000 + (seed % 7) * 280)
  const rot = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })
  const lamp = useOscillator(2400 + (seed % 5) * 220)
  const ringOpacity = lamp.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })

  return (
    <View
      style={{
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Rotating gear behind */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 40,
          height: 40,
          opacity: 0.55,
          transform: [{ rotate: rot }],
        }}
      >
        <Gear size={40} teeth={10} bodyColor="#C97D3E" edgeColor="#6E3A14" hubColor="#3A1E0A" highlightColor="#F0A058" />
      </Animated.View>
      {/* Brass medallion with the number */}
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: '#1F1108',
          borderWidth: 1.5,
          borderColor: '#E8A93B',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: '#E8A93B',
            opacity: ringOpacity,
          }}
        />
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 12,
            color: '#E8A93B',
            textShadowColor: 'rgba(232,169,59,0.7)',
            textShadowRadius: 5,
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [
        editBtnStyle(),
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <Ionicons name="create-outline" size={20} color="#E8A93B" />
    </Pressable>
  )
}

function SingerChip({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  const tint = singer.color || '#B8762D'
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingLeft: 4,
        paddingVertical: 2,
        backgroundColor: hexToRgba(tint, 0.18) ?? 'rgba(184,118,45,0.2)',
        borderWidth: 1.5,
        borderColor: '#B8762D',
        borderRadius: 3,
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
          borderWidth: 1,
          borderColor: '#5C3A12',
        }}
      >
        {singer.profilePicture ? (
          <Image source={{ uri: singer.profilePicture }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text
            style={{
              color: '#1F1108',
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
          color: '#E8C9A0',
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
      <View style={lockBadgeStyle()}>
        <Ionicons name="lock-closed" size={16} color="#E8A93B" />
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
          <Ionicons name="checkmark" size={11} color="#1F1108" />
          <Text style={votedPillLabelStyle(tokens)}>
            {voted > 0 ? 'STOKED' : 'VENTED'}
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
      duration: 480,
      useNativeDriver: true,
    }).start()
  }
  const steamScale = press.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] })
  const steamOpacity = press.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.7, 0],
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
      {/* Brass plate gradient fill */}
      <LinearGradient
        colors={isUp ? ['#E8C078', '#B8762D', '#7A4D1A'] : ['#A88555', '#5C3A12', '#3A1E0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 4 }]}
      />
      <Ionicons
        name={isUp ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={isUp ? '#1F1108' : '#E8C9A0'}
      />
      {/* Steam burst on press */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: '50%',
          top: isUp ? -8 : '100%',
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: isUp ? -20 : -20,
          opacity: steamOpacity,
          transform: [{ scale: steamScale }],
        }}
      >
        <Svg width={40} height={40}>
          <Circle cx={20} cy={20} r={18} fill="#FFE4A0" opacity={0.55} />
        </Svg>
      </Animated.View>
    </Pressable>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const { tokens } = useTheme()
  const color = score > 0 ? '#E8A93B' : score < 0 ? '#C97D3E' : '#E8C9A0'
  return <Text style={[scoreStyle(tokens), { color }]}>{score}</Text>
}

function artStyle(t: ThemeTokens): ImageStyle {
  return {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#5C3A12',
  }
}
function hiddenArtStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#B8762D',
    backgroundColor: '#1A0E04',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
function hiddenArtGlyphStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#E8A93B',
    fontFamily: t.fontDisplay,
    fontSize: 22,
    lineHeight: 26,
  }
}
function titleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontSize: 14,
    color: '#F0DDB5',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(232,169,59,0.5)',
    textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 0 },
  }
}
function artistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontSize: 12,
    color: '#C9A878',
    marginTop: 2,
    letterSpacing: 0.3,
    fontStyle: 'italic',
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
function voteBtnStyle(isUp: boolean): ViewStyle {
  return {
    width: 34,
    height: 34,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: isUp ? '#E8A93B' : '#7A4D1A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: isUp ? '#E8A93B' : '#5C3A12',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
  }
}
function votedPillStyle(up: boolean): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: up ? '#E8A93B' : '#5C8A7A',
    borderWidth: 1.5,
    borderColor: up ? '#7A4D1A' : '#2E4640',
    borderRadius: 3,
  }
}
function votedPillLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#1F1108',
    fontFamily: t.fontDisplay,
    fontSize: 9,
    letterSpacing: 1.2,
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
    backgroundColor: 'rgba(232,169,59,0.18)',
    borderWidth: 1.5,
    borderColor: '#E8A93B',
    borderRadius: 4,
    marginLeft: 4,
  }
}
function lockLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#E8A93B',
    fontFamily: t.fontDisplay,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    letterSpacing: 0.6,
  }
}
function editBtnStyle(): ViewStyle {
  return {
    width: 38,
    height: 38,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#E8A93B',
    backgroundColor: 'rgba(232,169,59,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
    shadowColor: '#E8A93B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  }
}
