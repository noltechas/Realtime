import { StyleSheet } from 'react-native'
import { TROPICAL_MOBILE } from '../../tokens'
import type { ThemeUIStyles } from '../../types'
import { INK, PALM_DK, BAMBOO_LT, PANEL_GLASS, SAND, softShadow } from './atoms/_tropical'

// Tropical screen scaffolds. The screen background is the tropical.jpg photo
// (rendered by the Backdrop atom); every content surface is transparent or a
// translucent sand panel so the beach shows through. Headings use Pacifico
// (surf script) with a soft white halo so they stay legible directly over the
// photo; body copy is Quicksand. All values hard-coded against TROPICAL_MOBILE
// so this module has no runtime per-theme branching.
const t = TROPICAL_MOBILE

const rawStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SAND, // fallback sand if the photo fails to load
  },
  page: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    backgroundColor: 'transparent', // let the Backdrop photo show through
    flexGrow: 1,
  },
  h1: {
    fontFamily: t.fontDisplay, // Florida Vibes (runs small — sized up)
    fontSize: 46,
    color: PALM_DK,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255,255,255,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 7,
  },
  h2: {
    fontFamily: t.fontDisplay,
    fontSize: 32,
    color: PALM_DK,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  body: {
    fontFamily: t.fontBody, // Quicksand
    fontSize: 15,
    fontWeight: '600',
    color: INK,
    lineHeight: 21,
  },
  muted: {
    fontFamily: t.fontBody,
    fontSize: 13,
    fontWeight: '600',
    color: t.muted,
  },
  // Translucent sand panel with a soft bamboo keyline + natural sun-shadow.
  card: {
    backgroundColor: PANEL_GLASS,
    borderWidth: t.cardBorderWidth,
    borderColor: BAMBOO_LT,
    borderRadius: t.radius,
    padding: 16,
    ...softShadow(7),
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: BAMBOO_LT,
    borderRadius: t.radiusSmall,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: t.fontBody,
    fontWeight: '600',
    color: INK,
  },
  pillBox: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: BAMBOO_LT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: t.vividYellow,
  },
  pillText: {
    fontFamily: t.fontBody,
    fontWeight: '700',
    fontSize: 12,
    color: PALM_DK,
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontFamily: t.fontDisplay, // Florida Vibes (runs small — sized up)
    fontSize: 21,
    letterSpacing: 0.3,
    color: PALM_DK,
    marginBottom: 12,
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
})

export const styles: ThemeUIStyles = rawStyles
