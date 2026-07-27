import React, { useEffect, useRef } from 'react'
import { Animated, Image, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { hashKey } from '../../theme/helpers'
import {
  Bead3D,
  CREAM,
  Hibiscus3D,
  PAINTED,
  PAPER,
  Press,
  RAMP_WALNUT,
  Timber,
  TimberDetail,
  alpha,
  lift,
  sans,
  script,
  shade,
  tiki,
  useSize,
} from '../../theme/themes/tropical/atoms/_tropical'

// Tropical wizard chrome — the "Who sings what?" flow rendered in the theme's
// tiki-workshop vocabulary: role cards are carved walnut boards (seeded grain,
// routed groove, beveled edges), each singer option is a paper tag TAPED to the
// board with washi strips in the singer's own color, and the color swatches are
// glossy lei beads that bloom into a dimensional hibiscus when picked — the
// same bead→bloom move the profile ColorPicker makes, so the whole app tells
// one story. Kept here (like the space/steampunk/retrowave chrome) so
// WizardScreen stays a data container with a single tropical branch.

// ── The absolute-fill timber overlay for wizard cards ───────────────────────
// WizardScreen paints the card base walnut (see wizardCardStyle) and layers
// this inside it: the wood ramp, procedurally-seeded grain, bevels and a routed
// groove border. Measures itself, so it fits any card.
export function TropicalWoodFrame() {
  const [size, onLayout] = useSize()
  return (
    <View pointerEvents="none" onLayout={onLayout} style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[RAMP_WALNUT[0], RAMP_WALNUT[1], RAMP_WALNUT[2]]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {size ? (
        <TimberDetail w={size.w} h={size.h} radius={16} seed={hashKey(`${size.w}x${size.h}`)} groove />
      ) : null}
    </View>
  )
}

// ── Role card ────────────────────────────────────────────────────────────────
export function TropicalRoleCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={[{ borderRadius: 16, marginBottom: 12 }, lift(2)]}>
      <Timber radius={16} ramp={RAMP_WALNUT} seed="role-card" groove style={{ padding: 14 }}>
        {children}
      </Timber>
    </View>
  )
}

// The small caption above the role name, stamped in the tiki caps face.
// (fontBody kept for API compatibility with the other themes' chrome.)
export function TropicalRoleEyebrow(_props: { fontBody: string }) {
  return <Text style={tiki(10.5, 'rgba(255,240,214,0.6)')}>Who sings</Text>
}

// The role / artist name, painted in the surf script.
export function TropicalRoleName({ name }: { name: string; fontBody: string }) {
  return (
    <Text style={[script(16, CREAM, PAINTED), { marginTop: 2, marginBottom: 10 }]} numberOfLines={1}>
      {name}
    </Text>
  )
}

// ── Singer option: a paper tag taped to the board ───────────────────────────
export function TropicalSingerPaper({
  name,
  color,
  profilePicture,
  active,
  index,
  onPress,
}: {
  name: string
  color: string
  profilePicture?: string
  active: boolean
  index: number
  onPress: () => void
  fontBody: string
}) {
  const tilt = (index % 2 === 0 ? 1 : -1) * (1.4 + (index % 2))
  const v = useRef(new Animated.Value(active ? 1 : 0)).current

  useEffect(() => {
    const a = Animated.spring(v, { toValue: active ? 1 : 0, useNativeDriver: true, damping: 12, stiffness: 210, mass: 0.7 })
    a.start()
    return () => a.stop()
  }, [active, v])

  return (
    <Press onPress={onPress} scaleTo={0.93} style={{ marginRight: 10, marginBottom: 12, marginTop: 6 }}>
      <Animated.View
        style={[
          paperStyle,
          {
            opacity: active ? 1 : 0.82,
            transform: [
              { rotate: `${active ? 0 : tilt}deg` },
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
            ],
          },
          active ? { shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 } : null,
        ]}
      >
        {/* washi tape — takes the singer's color once they're on the part */}
        <Animated.View style={{ opacity: v, position: 'absolute', left: -11, top: -5, width: 34, height: 12, borderRadius: 2, backgroundColor: alpha(color, 0.68), borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-36deg' }] }} />
        <Animated.View style={{ opacity: v, position: 'absolute', right: -11, top: -5, width: 34, height: 12, borderRadius: 2, backgroundColor: alpha(color, 0.68), borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '36deg' }] }} />

        <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
          {profilePicture ? (
            <View style={{ width: 24, height: 24, borderRadius: 999, overflow: 'hidden', borderWidth: 1.5, borderColor: shade(color, 0.2) }}>
              <Image source={{ uri: profilePicture }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : (
            <>
              <Bead3D size={26} color={color} />
              <Text style={[sans(10.5, 'bold', '#FFFFFF'), { position: 'absolute' }]}>{(name?.[0] ?? '?').toUpperCase()}</Text>
            </>
          )}
        </View>
        <Text style={sans(14, 'bold', '#3B2410')} numberOfLines={1}>
          {name}
        </Text>
      </Animated.View>
    </Press>
  )
}

// The "add a singer to this part" affordance — a blank tag waiting for a name.
export function TropicalAddPaper({
  index,
  onPress,
}: {
  index: number
  onPress: () => void
  fontBody: string
}) {
  const tilt = (index % 2 === 0 ? 1 : -1) * 1.6
  return (
    <Press onPress={onPress} scaleTo={0.93} style={{ marginRight: 10, marginBottom: 12, marginTop: 6 }}>
      <View
        style={[
          paperStyle,
          {
            backgroundColor: 'rgba(255,249,236,0.8)',
            borderWidth: 1.5,
            borderColor: 'rgba(59,36,16,0.45)',
            borderStyle: 'dashed',
            opacity: 0.92,
            transform: [{ rotate: `${tilt}deg` }],
          },
        ]}
      >
        <Text style={[sans(17, 'bold', '#3B2410'), { marginTop: -1 }]}>+</Text>
        <Text style={sans(14, 'bold', '#3B2410')}>Add</Text>
      </View>
    </Press>
  )
}

// ── Color swatch: lei bead that blooms when picked ──────────────────────────
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
  const v = useRef(new Animated.Value(selected ? 1 : 0)).current

  useEffect(() => {
    const a = Animated.spring(v, { toValue: selected ? 1 : 0, useNativeDriver: true, damping: 10, stiffness: 180, mass: 0.75 })
    a.start()
    return () => a.stop()
  }, [selected, v])

  return (
    <Press
      onPress={() => {
        if (!takenByOther) onPress()
      }}
      hitSlop={4}
      scaleTo={0.86}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 2, marginBottom: 4, opacity: takenByOther ? 0.3 : 1 }}
    >
      <Animated.View
        style={{
          opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.4, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }],
        }}
      >
        <Bead3D size={27} color={color} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          opacity: v,
          transform: [
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-80deg', '0deg'] }) },
          ],
        }}
      >
        <Hibiscus3D size={40} color={color} />
      </Animated.View>
    </Press>
  )
}

// Shared paper-tag styling.
const paperStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  backgroundColor: PAPER,
  borderRadius: 5,
  paddingVertical: 6,
  paddingLeft: 6,
  paddingRight: 13,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.28,
  shadowRadius: 3,
  elevation: 3,
}
