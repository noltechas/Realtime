import React from 'react'
import { ActivityIndicator, Pressable, Text, type TextStyle } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { ButtonProps } from '../../../types'
import { GlassPanel, HAIRLINE_STRONG, INK, INK_LINE, TEXT, WARM, useLift } from './_glass'

// Psychedelic Button — printed keys, matching the plates.
//
//   primary   → a cream plate with ink lettering and the theme's heavy ink keyline. It
//               is the same surface as the on-deck queue row and the search bay, which
//               is the point: a flat white pill with a thin white edge (what this was)
//               read as a system button dropped onto a poster.
//   secondary → an INK plate with white lettering — the inverse, so the pair reads as
//               two weights of the same printing rather than as solid vs. translucent.
//   outline   → transparent with a heavy white keyline, for the genuinely quiet action.
//
// All three are opaque or fully transparent; none is frosted glass. Nothing on a
// screen of printed plates should look like a window.
export function PsychedelicButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()
  const { transform, onPressIn, onPressOut } = useLift()

  const isPrimary = variant === 'primary'
  const isSecondary = variant === 'secondary'
  const inert = disabled || loading
  const lettering = isPrimary ? INK : TEXT

  return (
    <Pressable
      onPress={() => {
        if (inert) return
        onPress()
      }}
      onPressIn={inert ? undefined : onPressIn}
      onPressOut={inert ? undefined : onPressOut}
      disabled={inert}
      style={{ opacity: inert ? 0.45 : 1 }}
    >
      <GlassPanel
        radius={18}
        fill="none"
        edgeColor={isPrimary || isSecondary ? INK : HAIRLINE_STRONG}
        edgeWidth={isPrimary || isSecondary ? INK_LINE : 2}
        style={[
          { transform },
          isPrimary
            ? { backgroundColor: WARM }
            : isSecondary
              ? { backgroundColor: INK }
              : null,
        ]}
        contentStyle={{
          minHeight: 52,
          paddingVertical: 15,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color={lettering} />
        ) : (
          <Text numberOfLines={1} style={letteringStyle(tokens.fontDisplay, lettering)}>
            {label}
          </Text>
        )}
      </GlassPanel>
    </Pressable>
  )
}

function letteringStyle(fontFamily: string, color: string): TextStyle {
  return {
    color,
    fontFamily,
    fontSize: 18,
    // Remalos is already chunky; letter-spacing would open it up and lose the
    // hand-lettered density that makes poster type work.
    letterSpacing: 0.3,
  }
}
