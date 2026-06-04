import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'
import { blobCornerRadii } from '../../helpers'

// Sketch-specific stylesheet. Mirrors the legacy `mobileStyles(t)` `isSketch`
// branch — cream paper bg, asymmetric blob corner radii on cards and inputs,
// dashed border on inputs (so the field reads as "fill-in-the-blank"), Pencil
// Trace for display, Thin Pencil Handwriting for body. Hard offset shadow so
// cards float just above the paper like a Polaroid pinned to a corkboard.
export function buildSketchStyles(t: ThemeTokens): ThemeUIStyles {
  // Paper shadow — soft drop, like a card resting on the page. Not the hard
  // pixel offset neo-brutal uses; sketch wants a slightly diffuse feel.
  const paperShadow: ViewStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  }

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
      fontSize: 32,
      fontWeight: '700',
      color: t.black,
      letterSpacing: -0.5,
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 22,
      fontWeight: '700',
      color: t.black,
    },
    body: {
      fontFamily: t.fontBody,
      fontSize: 16,
      color: t.black,
      // No explicit lineHeight: the Thin Pencil Handwriting face has tall
      // ascenders that a tight 22px line box clips at the top (visible on song
      // titles). Letting it use the font's natural metrics — like `muted` and
      // the SongCard title already do for this same font — renders them whole.
    },
    muted: {
      fontFamily: t.fontBody,
      fontSize: 14,
      color: t.muted,
    },
    card: {
      backgroundColor: t.white,
      borderWidth: t.cardBorderWidth,
      borderColor: t.black,
      ...blobCornerRadii('baseCard'),
      padding: 16,
      ...paperShadow,
    },
    input: {
      backgroundColor: t.creamDark,
      borderWidth: 2,
      borderColor: t.dimBorder,
      borderStyle: 'dashed',
      ...blobCornerRadii('input'),
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 18,
      fontFamily: t.fontBody,
      color: t.black,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 999,
      borderWidth: 2,
      borderColor: t.black,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: t.fontDisplay,
      fontWeight: '700',
      fontSize: 12,
      color: t.black,
      letterSpacing: 0.5,
    },
    sectionLabel: {
      fontFamily: t.fontDisplay,
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.black,
      opacity: 0.55,
      marginBottom: 12,
    },
  })

  return sheet
}
