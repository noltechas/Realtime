import React, { useRef } from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import type { ReactionCellProps } from '../../../types'
import { DYES, INK, Plate, phaseFor, pouredRadii, useLift, usePulse } from './_glass'

// Psychedelic reaction cell — a small DYE PLATE.
//
// Each cell now takes its own colour from the palette, walked by grid position. An
// earlier pass made all six identical glass on the theory that per-cell colour over
// polychrome footage reads as clutter — true when the cells were translucent and the
// footage showed through them, false now that they're opaque printed plates. Six solid
// colours in a grid read as a set of buttons; six dark windows read as a wall.
//
// Feedback is a single ink flash on send: brief, unmistakable, and legible whatever
// frame is playing behind.
export function PsychedelicReactionCell({
  label,
  icon,
  index = 0,
  onPress,
  onEditPress,
  disabled,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  const { transform, onPressIn, onPressOut } = useLift()
  const dye = DYES[index % DYES.length]
  const breathe = usePulse(5300, phaseFor(index, 5300, label))
  const labelScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] })

  const flash = useRef(new Animated.Value(0)).current
  const triggerFlash = () => {
    flash.setValue(1)
    Animated.timing(flash, {
      toValue: 0,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }
  const flashOpacity = flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] })

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
        <Plate
          dye={dye}
          seed={label}
          phaseIndex={index}
          period={6700}
          bigDisc={104}
          smallDisc={68}
          radii={pouredRadii(label, 20, 8)}
          fill
          style={{ flex: 1, transform }}
          contentStyle={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            paddingHorizontal: 10,
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: INK,
              opacity: flashOpacity,
            }}
          />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
          <Animated.Text
            numberOfLines={1}
            style={{
              textAlign: 'center',
              fontFamily: tokens.fontDisplay,
              fontSize: 16,
              color: INK,
              marginTop: 4,
              transform: [{ scale: labelScale }],
            }}
          >
            {label}
          </Animated.Text>
        </Plate>
      </Pressable>

      {onEditPress ? (
        <Pressable
          onPress={onEditPress}
          hitSlop={8}
          style={{ position: 'absolute', top: 9, right: 10 }}
        >
          <View
            style={{
              width: 27,
              height: 27,
              borderRadius: 14,
              backgroundColor: INK,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="create-outline" size={14} color="#FFFFFF" />
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}
