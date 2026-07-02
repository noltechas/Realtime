import React from 'react'
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../ThemeContext'
import {
  BRASS_FACE,
  BRASS_INK,
  IRON_PANEL,
  PARCH,
  AMBER,
  HAIRLINE,
  DEPTH_SHADOW,
} from './_steam'
import type { ButtonProps } from '../../../types'

// Steampunk Button — a machined brass bar, not a decorated plate:
//   primary   → polished brass face (vertical gradient) with a bright
//               machined top edge and engraved dark Cinzel lettering.
//   secondary → iron plate with a brass hairline and parchment lettering.
//   outline   → hairline only, amber lettering.
// Press feedback is mechanical: the bar seats 1px downward and dims slightly,
// like a key being pressed on an instrument. No rivets, no ripples.
export function SteampunkButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()

  const isPrimary = variant === 'primary'
  const isSecondary = variant === 'secondary'
  const labelColor = isPrimary ? BRASS_INK : isSecondary ? PARCH : AMBER

  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return
        onPress()
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        baseStyle,
        isPrimary
          ? { borderColor: 'rgba(46,30,8,0.9)', ...DEPTH_SHADOW }
          : isSecondary
            ? { borderColor: HAIRLINE, backgroundColor: IRON_PANEL, ...DEPTH_SHADOW }
            : { borderColor: HAIRLINE, backgroundColor: 'transparent' },
        disabled || loading ? { opacity: 0.45 } : null,
        pressed ? { opacity: 0.88, transform: [{ translateY: 1 }] } : null,
      ]}
    >
      {isPrimary ? (
        <>
          <LinearGradient
            colors={BRASS_FACE}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
          />
          {/* machined top edge catching the light */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 1,
              left: 6,
              right: 6,
              height: 1,
              backgroundColor: 'rgba(255,245,220,0.55)',
            }}
          />
        </>
      ) : null}

      {/* engraved inner rule on the iron variants */}
      {isSecondary ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { margin: 3, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(232,169,59,0.10)' },
          ]}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={labelStyle(tokens.fontDisplay, labelColor, isPrimary)}>{label}</Text>
      )}
    </Pressable>
  )
}

const baseStyle: ViewStyle = {
  paddingVertical: 14,
  paddingHorizontal: 26,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderRadius: 8,
  overflow: 'hidden',
}

function labelStyle(fontDisplay: string, color: string, primary: boolean): TextStyle {
  return {
    color,
    fontFamily: fontDisplay,
    fontSize: 13,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    textShadowColor: primary ? 'rgba(255,245,220,0.35)' : 'rgba(0,0,0,0.5)',
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 1 },
  }
}
