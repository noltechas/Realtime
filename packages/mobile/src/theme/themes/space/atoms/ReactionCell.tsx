import React, { useRef } from 'react'
import { Animated, Easing, Pressable, Text, View, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import type { ReactionCellProps } from '../../../types'
import {
  AMBER,
  CRITICAL,
  CUT_PLATE,
  CUT_TIGHT,
  ICE,
  MONO,
  MachinedPanel,
  NOMINAL,
  STEEL_HI,
  TEXT_FAINT,
  VIOLET,
  usePressTravel,
  type Tone,
} from './_ship'

// Space reaction cell — a labelled console key.
//
// Each cell gets one lamp tone from the ship's own six, assigned stably by
// label hash, so the grid reads as six distinct channels on one panel instead
// of six copies of the same chip. The channel designator in the corner is what
// makes that read as a real console rather than a colour scheme.
//
// Feedback is a lamp FLASH plus the key's own travel — no expanding ripples, no
// per-cell scan lines. The stage screen shows six of these at once, and six
// looping animations behind a live 3D scene is exactly the kind of thing that
// costs frames for nothing.
const CELL_TONES: Tone[] = ['ice', 'amber', 'violet', 'nominal', 'critical', 'steel']
const CELL_COLORS: Record<Tone, string> = {
  ice: ICE,
  amber: AMBER,
  violet: VIOLET,
  nominal: NOMINAL,
  critical: CRITICAL,
  steel: STEEL_HI,
}

export function SpaceReactionCell({
  label,
  icon,
  onPress,
  onEditPress,
  disabled,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  const seed = hashKey(label)
  // Bit slice chosen so the Stage screen's actual seven labels (Flowers,
  // Tomato, Custom, Custom Emoji, Say Something, Memes, Photo) land on all six
  // tones with a single unavoidable repeat — the low bits bunched them onto
  // three. Nothing guarantees uniqueness for arbitrary labels, and two channels
  // sharing a lamp colour is legitimate; six identical cells is not.
  const tone = CELL_TONES[(seed >>> 11) % CELL_TONES.length]
  const lamp = CELL_COLORS[tone]
  // Two hex digits off the top of the hash, not `seed % 8`: with six cells on
  // screen a modulo-8 code produced visible duplicates (two CH-01s side by
  // side), which reads as a bug rather than as an inventory. There is no index
  // in ReactionCellProps to make this strictly unique, so a wide, well-mixed
  // range is the honest fix.
  const channel = `CH-${(seed >>> 20).toString(16).toUpperCase().padStart(2, '0').slice(-2)}`

  const { transform, onPressIn, onPressOut } = usePressTravel()

  // Lamp flash on activation. Separate from the press travel because it should
  // fire on the actual send, not on finger-down.
  const flash = useRef(new Animated.Value(0)).current
  const triggerFlash = () => {
    flash.setValue(1)
    Animated.timing(flash, {
      toValue: 0,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }
  const flashOpacity = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] })

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => {
          if (disabled) return
          triggerFlash()
          onPress()
        }}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        disabled={disabled}
        style={{ flex: 1, opacity: disabled ? 0.4 : 1 }}
      >
        <MachinedPanel
          cuts={CUT_PLATE}
          tone={tone}
          fill="glass"
          systemBar
          style={{ flex: 1, transform } as ViewStyle}
          contentStyle={{ flex: 1, paddingTop: 9, paddingBottom: 11, paddingHorizontal: 10, paddingLeft: 12 }}
        >
          {/* Activation flash — a full-cell wash in the channel's lamp tone. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: lamp,
              opacity: flashOpacity,
            }}
          />

          <Text
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: 1.2,
              color: TEXT_FAINT,
            }}
          >
            {channel}
          </Text>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </View>

          <Text
            numberOfLines={1}
            style={{
              textAlign: 'center',
              fontFamily: tokens.fontDisplay,
              fontSize: 11,
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              color: lamp,
            }}
          >
            {label}
          </Text>
        </MachinedPanel>
      </Pressable>

      {onEditPress ? (
        <Pressable
          onPress={onEditPress}
          hitSlop={8}
          style={{ position: 'absolute', top: 6, right: 6 }}
        >
          <MachinedPanel
            cuts={CUT_TIGHT}
            tone={tone}
            fill="raised"
            edgeStrength={0.9}
            contentStyle={{
              width: 22,
              height: 22,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="create-outline" size={12} color={lamp} />
          </MachinedPanel>
        </Pressable>
      ) : null}
    </View>
  )
}
