import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { hexToRgba } from '../../theme/helpers'
import { BLUE, FAINT, Glass, GlassGroup, LIFT, Press, SOFT, WHITE, sf } from '../../theme/themes/liquid-glass/atoms/_glass'

// ─── Liquid Glass wizard chrome ─────────────────────────────────────────────
// Only rendered when the wizard's theme is 'liquid-glass'; every use is guarded
// by `tokens.name === 'liquid-glass' ?`. Same vocabulary as the theme's atoms
// (theme/themes/liquid-glass/atoms/_glass.tsx): panes of the system's glass
// over the wallpaper, tinted only where it matters, moving on springs.
//
//   GlassFill          a card's pane of glass, laid behind its content (a
//                      singer's card is glass tinted in their colour)
//   GlassTrail         the steps as a page control on a glass capsule: the
//                      current step's dot stretches into a pill
//   AvatarGlass        a singer in a clear glass ring
//   GlassSwatch        each colour as a drop; yours swells with a tick
//   GlassAddSingerButton  a glass capsule: add another singer
//   GlassRoleChip      a singer under a part: a glass capsule that fills
//                      with their colour when they sing it
//   GlassAddChip       bring someone new in for a part: clear glass, a blue +

export const LG_HEADING = { fontWeight: '800' as const, letterSpacing: -0.6, color: WHITE, ...LIFT }

export function GlassFill({ radius = 24, tint }: { radius?: number; tint?: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Glass radius={radius} tint={tint} shadow={false} style={StyleSheet.absoluteFill} />
    </View>
  )
}

/** A singer's colour as a glass tint: enough to read, never a flat fill. */
export function singerTint(color: string, alpha = 0.2): string {
  return hexToRgba(color, alpha) ?? `rgba(255,255,255,${alpha * 0.6})`
}

// ── The steps, as a page control ────────────────────────────────────────────
function Dot({ state }: { state: 'done' | 'here' | 'next' }) {
  const here = useRef(new Animated.Value(state === 'here' ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(here, { toValue: state === 'here' ? 1 : 0, stiffness: 240, damping: 16, mass: 0.7, useNativeDriver: false }).start()
  }, [state, here])
  return (
    <Animated.View
      style={{
        height: 8,
        borderRadius: 4,
        width: here.interpolate({ inputRange: [0, 1], outputRange: [8, 24] }),
        backgroundColor: state === 'next' ? 'rgba(255,255,255,0.32)' : WHITE,
        opacity: state === 'done' ? 0.72 : 1,
      }}
    />
  )
}

export function GlassTrail({ current, total, label }: { current: number; total: number; label: string }) {
  const n = Math.max(1, total)
  return (
    <View style={{ alignItems: 'center' }}>
      <Glass radius={999} variant="clear" shadow={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
        {Array.from({ length: n }, (_, i) => {
          const step = i + 1
          return <Dot key={i} state={step < current ? 'done' : step === current ? 'here' : 'next'} />
        })}
      </Glass>
      <Text numberOfLines={1} style={sf(17, '700', WHITE, { marginTop: 5, ...LIFT })}>
        {label}
      </Text>
    </View>
  )
}

// ── A singer, in a clear glass ring ─────────────────────────────────────────
export function AvatarGlass({ size = 44, color, children }: { size?: number; color: string; children: React.ReactNode }) {
  const R = size + 10
  return (
    <Glass radius={R / 2} variant="clear" style={{ width: R, height: R, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </Glass>
  )
}

// ── A colour, as a drop ─────────────────────────────────────────────────────
export function GlassSwatch({
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
  const grow = useRef(new Animated.Value(selected ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(grow, { toValue: selected ? 1 : 0, stiffness: 260, damping: selected ? 11 : 18, mass: 0.7, useNativeDriver: true }).start()
  }, [selected, grow])
  const S = 36
  return (
    <Pressable
      onPress={() => {
        if (takenByOther) return
        onPress()
      }}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: takenByOther }}
      style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center', opacity: takenByOther ? 0.3 : 1 }}
    >
      <Animated.View style={{ transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] }}>
        <View
          style={{
            width: S - 4,
            height: S - 4,
            borderRadius: (S - 4) / 2,
            backgroundColor: color,
            borderWidth: selected ? 2.5 : 0,
            borderColor: WHITE,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: color,
            shadowOpacity: 0.6,
            shadowRadius: selected ? 8 : 0,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <View pointerEvents="none" style={{ position: 'absolute', left: 5, top: 4, width: (S - 4) * 0.4, height: (S - 4) * 0.26, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          {selected ? <Ionicons name="checkmark" size={17} color={WHITE} /> : null}
          {takenByOther ? <View pointerEvents="none" style={{ position: 'absolute', width: S - 2, height: 2.5, borderRadius: 2, backgroundColor: WHITE, transform: [{ rotate: '-45deg' }] }} /> : null}
        </View>
      </Animated.View>
    </Pressable>
  )
}

// ── Add another singer ──────────────────────────────────────────────────────
export function GlassAddSingerButton({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel="Add another singer" style={{ marginTop: 2 }}>
      <Glass radius={999} interactive style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 20 }}>
        <Glass radius={19} tint="rgba(10,132,255,0.7)" shadow={false} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={24} color={WHITE} />
        </Glass>
        <View style={{ flex: 1 }}>
          <Text style={sf(16, '600')}>Add another singer</Text>
          <Text style={sf(13, '400', FAINT, { marginTop: 1 })}>From this session, or by name</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={FAINT} />
      </Glass>
    </Press>
  )
}

// ── A singer under a part ───────────────────────────────────────────────────
export function GlassRoleChip({
  name,
  color,
  initial,
  picture,
  active,
  onPress,
}: {
  name: string
  color: string
  initial: string
  picture?: React.ReactNode
  active: boolean
  onPress: () => void
}) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Glass
        radius={999}
        interactive
        shadow={false}
        tint={active ? singerTint(color, 0.55) : undefined}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5, paddingLeft: 5, paddingRight: 13 }}
      >
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: active ? 1.5 : 0, borderColor: WHITE }}>
          {picture ?? <Text style={sf(11, '800', WHITE)}>{initial}</Text>}
        </View>
        <Text style={sf(14, '600', active ? WHITE : SOFT)}>{name}</Text>
        {active ? <Ionicons name="checkmark" size={14} color={WHITE} /> : null}
      </Glass>
    </Press>
  )
}

export function GlassAddChip({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel="Add a singer for this part">
      <Glass radius={999} variant="clear" interactive shadow={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingLeft: 10, paddingRight: 14 }}>
        <Ionicons name="add" size={18} color="#64D2FF" />
        <Text style={sf(14, '600', '#64D2FF')}>Add</Text>
      </Glass>
    </Press>
  )
}

/** Panes in a row that should sample the wallpaper together (so neighbours
 *  never try to refract each other) and melt into each other as they meet. */
export function GlassRow({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  return (
    <GlassGroup spacing={2} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {children}
    </GlassGroup>
  )
}

export { BLUE as GLASS_BLUE }
