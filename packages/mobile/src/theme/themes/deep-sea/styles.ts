import { StyleSheet } from 'react-native'
import { DEEP_SEA_MOBILE } from '../../tokens'
import type { ThemeUIStyles } from '../../types'

// Deep-sea screen scaffolds. Lifted from the legacy `mobileStyles()`
// `isDeepSea` branches — translucent navy cards over the animated caustics
// backdrop, cyan (0,255,200) accent borders + glow, and LuckiestGuy display
// + Nunito body. All values pulled from DEEP_SEA_MOBILE so this module has
// no runtime `tokens.name` branching.
const t = DEEP_SEA_MOBILE

// Cyan bioluminescent glow used on cards / inputs. Matches the legacy
// themeShadow(t, 'md') for glow themes.
const cyanGlow = {
  shadowColor: t.accentGlowColor,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.55,
  shadowRadius: 12,
}

const rawStyles = StyleSheet.create({
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
    fontWeight: '900',
    color: t.black,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: t.fontDisplay,
    fontSize: 22,
    fontWeight: '800',
    color: t.black,
    letterSpacing: 0,
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
  // Translucent navy card with cyan border and faint bioluminescent halo.
  card: {
    backgroundColor: 'rgba(12,29,66,0.6)',
    borderWidth: t.cardBorderWidth,
    borderColor: 'rgba(0,255,200,0.45)',
    borderRadius: t.radius,
    padding: 16,
    ...cyanGlow,
  },
  // Input well: a faint cyan-tinted wash on a dark base. Matches the
  // legacy isDeepSea inputBg.
  input: {
    backgroundColor: 'rgba(0,255,200,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,200,0.3)',
    borderRadius: t.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: t.fontBody,
    color: t.black,
  },
  pillBox: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,255,200,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,255,200,0.1)',
  },
  pillText: {
    fontFamily: t.fontDisplay,
    fontWeight: '700',
    fontSize: 12,
    color: t.accentA,
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

export const styles: ThemeUIStyles = rawStyles
