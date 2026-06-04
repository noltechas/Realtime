import React from 'react'
import { View, Text, Pressable, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path } from 'react-native-svg'

// Tropical wizard chrome — the "Who sings what?" role cards rendered as carved
// WOOD PANELS, with each singer option pinned on as a little scrap of PAPER
// STAPLED to the wood. Kept here (like the space/steampunk/retrowave wizard
// chrome) so WizardScreen stays a data container with a single tropical branch.

const WOOD_COLORS: readonly [string, string] = ['#9C6B3D', '#6E4423']
const PAPER = '#FBF3DC'
const WOOD_INK = '#3A2614'
const CREAM = '#FFF1C4'

// A staple crown — a brushed-metal bar with a top glint.
function Staple({ rotate = 0 }: { rotate?: number }) {
  return (
    <View style={{ width: 15, height: 5.5, borderRadius: 2, backgroundColor: '#9AA0A8', borderWidth: 0.5, borderColor: '#6B7178', transform: [{ rotate: `${rotate}deg` }] }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 1, left: 2, right: 2, height: 1.4, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.6)' }} />
    </View>
  )
}

// A hammered nail head — a dark dome with a glint.
function Nail() {
  return (
    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#2E2014', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.35)' }} />
    </View>
  )
}

// A grained timber plank with a cut-wood edge + a hammered nail in each corner.
export function TropicalRoleCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ borderRadius: 16, marginBottom: 12, shadowColor: '#0E2E29', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 6 }}>
      <LinearGradient
        colors={WOOD_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ borderRadius: 16, borderWidth: 2.5, borderColor: '#5A3A1E', overflow: 'hidden', padding: 14 }}
      >
        {/* grain + a soft top sheen */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {[0.18, 0.4, 0.62, 0.84].map((p, i) => (
            <View key={i} style={{ position: 'absolute', left: 10, right: 10, top: `${p * 100}%`, height: 1, backgroundColor: 'rgba(0,0,0,0.14)' }} />
          ))}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '24%', backgroundColor: 'rgba(255,255,255,0.06)' }} />
        </View>
        {/* a nail hammered into each corner */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 6, left: 6 }}><Nail /></View>
        <View pointerEvents="none" style={{ position: 'absolute', top: 6, right: 6 }}><Nail /></View>
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 6, left: 6 }}><Nail /></View>
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 6, right: 6 }}><Nail /></View>
        {children}
      </LinearGradient>
    </View>
  )
}

// An absolute-fill timber overlay for any wizard card whose base is a solid
// wood color: a vertical grain gradient, faint horizontal grain lines, a soft
// top sheen, and a hammered nail in each corner. Sits behind the card content.
export function TropicalWoodFrame() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient colors={WOOD_COLORS} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
      {[0.16, 0.34, 0.52, 0.7, 0.88].map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: 10, right: 10, top: `${p * 100}%`, height: 1, backgroundColor: 'rgba(0,0,0,0.13)' }} />
      ))}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '22%', backgroundColor: 'rgba(255,255,255,0.06)' }} />
      <View style={{ position: 'absolute', top: 6, left: 6 }}><Nail /></View>
      <View style={{ position: 'absolute', top: 6, right: 6 }}><Nail /></View>
      <View style={{ position: 'absolute', bottom: 6, left: 6 }}><Nail /></View>
      <View style={{ position: 'absolute', bottom: 6, right: 6 }}><Nail /></View>
    </View>
  )
}

// A color swatch painted on the wood as a short, brushy paint-stroke square —
// a wobbly filled square with bristle streaks. Selected gets a hand-inked
// outline + a slight pop; a color taken by another singer dims out.
export function TropicalPaintSwatch({
  color,
  selected,
  takenByOther,
  onPress,
}: {
  color: string
  selected: boolean
  takenByOther: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={() => { if (!takenByOther) onPress() }}
      hitSlop={4}
      style={{ opacity: takenByOther ? 0.32 : 1, transform: [{ scale: selected ? 1.1 : 1 }], marginRight: 4, marginBottom: 4 }}
    >
      <Svg width={40} height={36} viewBox="0 0 40 36">
        <Path
          d="M5 8 C 11 5 30 4 36 8 C 38 15 37 25 34 31 C 27 34 10 33 5 29 C 3 22 3 13 5 8 Z"
          fill={color}
          stroke={selected ? '#2E2014' : 'rgba(0,0,0,0.22)'}
          strokeWidth={selected ? 3 : 1.2}
          strokeLinejoin="round"
        />
        <Path d="M9 14 C 18 12 28 13 33 15" stroke="rgba(255,255,255,0.32)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <Path d="M8 22 C 17 21 27 22 32 24" stroke="rgba(0,0,0,0.12)" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </Svg>
    </Pressable>
  )
}

// The small caption above the role name ("WHO SINGS"), burned into the wood.
export function TropicalRoleEyebrow({ fontBody }: { fontBody: string }) {
  return (
    <Text style={{ fontFamily: fontBody, fontSize: 12, letterSpacing: 1, color: 'rgba(255,241,196,0.65)', textTransform: 'uppercase' }}>
      Who sings
    </Text>
  )
}

// The role / artist name, in the secondary font, carved into the plank.
export function TropicalRoleName({ name, fontBody }: { name: string; fontBody: string }) {
  return (
    <Text
      style={{
        fontFamily: fontBody,
        fontSize: 22,
        color: CREAM,
        marginTop: 2,
        marginBottom: 12,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }}
    >
      {name}
    </Text>
  )
}

// A singer option: a scrap of paper stapled to the wood. Selected pins flat +
// bright with a colored keyline; unselected sits dimmer and a touch tilted.
export function TropicalSingerPaper({
  name,
  color,
  profilePicture,
  active,
  index,
  onPress,
  fontBody,
}: {
  name: string
  color: string
  profilePicture?: string
  active: boolean
  index: number
  onPress: () => void
  fontBody: string
}) {
  const tilt = (index % 2 === 0 ? 1 : -1) * (1.5 + (index % 2))
  return (
    <Pressable onPress={onPress} style={{ marginRight: 10, marginBottom: 10, marginTop: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: PAPER,
          borderRadius: 4,
          paddingVertical: 7,
          paddingLeft: 7,
          paddingRight: 14,
          borderWidth: active ? 2.5 : 1,
          borderColor: active ? color : 'rgba(60,38,20,0.22)',
          transform: [{ rotate: `${active ? 0 : tilt}deg` }],
          opacity: active ? 1 : 0.82,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: active ? 3 : 1 },
          shadowOpacity: active ? 0.3 : 0.16,
          shadowRadius: active ? 4 : 2,
          elevation: active ? 4 : 2,
        }}
      >
        {/* staples pinning the scrap to the wood */}
        <View pointerEvents="none" style={{ position: 'absolute', top: -3, left: '24%' }}><Staple rotate={-14} /></View>
        <View pointerEvents="none" style={{ position: 'absolute', top: -3, right: '24%' }}><Staple rotate={14} /></View>
        <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: color, borderWidth: 1.5, borderColor: '#5A3A1E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text style={{ fontFamily: fontBody, fontSize: 12, color: '#FFFFFF' }}>{(name?.[0] ?? '?').toUpperCase()}</Text>
          )}
        </View>
        <Text style={{ fontFamily: fontBody, fontSize: 15, color: WOOD_INK }}>{name}</Text>
      </View>
    </Pressable>
  )
}
