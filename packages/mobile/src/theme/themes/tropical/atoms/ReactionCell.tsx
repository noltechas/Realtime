import React from 'react'
import { Pressable, View, Text, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { TROPICAL_MOBILE } from '../../../tokens'
import type { ReactionCellProps } from '../../../types'
import { INK, SUN, BAMBOO, softShadow, press, PlankGrain } from './_tropical'

// Tropical reaction cell — a chunky WOODEN BLOCK. The emoji / icon is pinned to
// a little scrap of PAPER stapled to the wood, and the label rides a tan plank
// BAR nailed across the bottom. Gentle sink on press.
const t = TROPICAL_MOBILE

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

// A staple crown — a little brushed-metal bar with a top highlight.
function Staple({ rotate = 0 }: { rotate?: number }) {
  return (
    <View style={{ width: 16, height: 6, borderRadius: 2, backgroundColor: '#9AA0A8', borderWidth: 0.5, borderColor: '#6B7178', transform: [{ rotate: `${rotate}deg` }] }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 1, left: 2, right: 2, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.6)' }} />
    </View>
  )
}

// A hammered nail head — a dark dome with a glint.
function Nail() {
  return (
    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#2E2014', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' }} />
    </View>
  )
}

const captionStyle: TextStyle = {
  fontFamily: t.fontDisplay, // Florida Vibes
  fontSize: 20,
  color: '#3A2614',
  textAlign: 'center',
}

const editStyle: ViewStyle = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 26,
  height: 26,
  borderRadius: 13,
  borderWidth: 2,
  borderColor: BAMBOO,
  backgroundColor: SUN,
  alignItems: 'center',
  justifyContent: 'center',
  ...softShadow(2),
}

export function ReactionCell({ onPress, onEditPress, disabled, icon, label }: ReactionCellProps) {
  const h = hashStr(label)
  // Stable, slight "tacked-on by hand" tilt for the paper scrap.
  const tilt = (h % 2 === 0 ? 1 : -1) * (2 + (h % 3))

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{ flex: 1, borderRadius: 14, ...softShadow(6) }, pressed ? press() : null, disabled ? { opacity: 0.4 } : null]}
    >
      <LinearGradient
        colors={['#9C6B3D', '#6E4423']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: 14, borderWidth: 2.5, borderColor: '#5A3A1E', overflow: 'hidden', padding: 12, alignItems: 'center', justifyContent: 'space-between' }}
      >
        {/* wood grain + a soft top sheen */}
        <PlankGrain color="rgba(0,0,0,0.14)" gap={9} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', backgroundColor: 'rgba(255,255,255,0.06)' }} />

        {/* emoji / icon on a stapled scrap of paper */}
        <View style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: '74%',
              maxWidth: 150,
              aspectRatio: 1,
              backgroundColor: '#FBF3DC',
              borderRadius: 3,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: `${tilt}deg` }],
              ...softShadow(4),
            }}
          >
            {/* paper texture sheen */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' }} />
            {/* staples at the top corners */}
            <View style={{ position: 'absolute', top: -3, left: '20%' }}><Staple rotate={-16} /></View>
            <View style={{ position: 'absolute', top: -3, right: '20%' }}><Staple rotate={16} /></View>
            {icon}
          </View>
        </View>

        {/* label on a tan plank bar nailed across the bottom */}
        <View
          style={{
            alignSelf: 'stretch',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#CBA968',
            borderRadius: 4,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.35)',
            borderBottomWidth: 1.5,
            borderBottomColor: 'rgba(0,0,0,0.28)',
            paddingHorizontal: 22,
            paddingVertical: 6,
            marginTop: 8,
            ...softShadow(2),
          }}
        >
          <View style={{ position: 'absolute', left: 7 }}><Nail /></View>
          <View style={{ position: 'absolute', right: 7 }}><Nail /></View>
          <Text style={captionStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
            {label}
          </Text>
        </View>
      </LinearGradient>

      {onEditPress ? (
        <Pressable onPress={onEditPress} hitSlop={6} style={editStyle}>
          <Ionicons name="create-outline" size={13} color={INK} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}
