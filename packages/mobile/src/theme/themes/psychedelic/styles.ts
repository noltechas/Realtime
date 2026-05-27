import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Psychedelic stylesheet — soft lava-lamp surfaces: deep-purple panels with a
// translucent hot-pink rim, blob-cornered cards, Chicle headings sized for
// bubbly impact, Spicy Rice body. Headings carry a multi-color glow text-shadow
// (pink + lime) so they hum on the dark void without falling off into the bg.
//
// No structural skew here (urban's signature) — psychedelic's character comes
// from organic asymmetric corners + continuous motion baked into each atom.
export function buildPsychedelicStyles(t: ThemeTokens): ThemeUIStyles {
  const sheet = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.appBg,
    },
    page: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 48,
      backgroundColor: t.appBg,
      flexGrow: 1,
    },
    h1: {
      fontFamily: t.fontDisplay,
      fontSize: 34,
      color: t.black,
      letterSpacing: t.displayLetterSpacing,
      textShadowColor: 'rgba(255,45,149,0.55)',
      textShadowRadius: 18,
      textShadowOffset: { width: 0, height: 0 },
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 24,
      color: t.black,
      letterSpacing: t.displayLetterSpacing,
      textShadowColor: 'rgba(255,45,149,0.45)',
      textShadowRadius: 12,
      textShadowOffset: { width: 0, height: 0 },
    },
    body: {
      fontFamily: t.fontBody,
      fontSize: 16,
      color: t.black,
      lineHeight: 22,
    },
    muted: {
      fontFamily: t.fontBody,
      fontSize: 14,
      color: t.muted,
    },
    // Default card — blob-cornered translucent purple. Atoms that want the
    // breathing animation or the hue-cycling inner glow render their own
    // shell inline instead of spreading this; this is the flat fallback for
    // generic containers (e.g. pre-session screens, wizard panels).
    card: {
      backgroundColor: 'rgba(42,20,80,0.7)',
      borderWidth: 1,
      borderColor: 'rgba(255,45,149,0.25)',
      borderTopLeftRadius: 26,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 22,
      borderBottomLeftRadius: 14,
      padding: 16,
    },
    input: {
      backgroundColor: 'rgba(255,45,149,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,45,149,0.35)',
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: t.fontBody,
      color: t.black,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,45,149,0.35)',
      backgroundColor: 'rgba(255,45,149,0.08)',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: t.fontDisplay,
      fontSize: 13,
      color: t.accentA,
    },
    sectionLabel: {
      fontFamily: t.fontDisplay,
      fontSize: 13,
      letterSpacing: 1,
      color: t.accentA,
      opacity: 0.85,
      marginBottom: 12,
      textShadowColor: 'rgba(255,45,149,0.4)',
      textShadowRadius: 8,
      textShadowOffset: { width: 0, height: 0 },
    },
  })

  return sheet
}
