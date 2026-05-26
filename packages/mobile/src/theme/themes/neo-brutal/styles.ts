import { StyleSheet } from 'react-native'
import { NEO_BRUTAL_MOBILE } from '../../tokens'
import type { ThemeUIStyles } from '../../types'

// Neo-brutal screen scaffolds. Lifted from the default (non-cyberpunk,
// non-urban, non-sketch, non-deep-sea) branches of the legacy mobileStyles()
// builder. All values are hard-coded against NEO_BRUTAL_MOBILE so this module
// has no runtime per-theme name branching — switching themes swaps
// the whole ThemeUIModule rather than re-running an if/else chain.
const t = NEO_BRUTAL_MOBILE

// Hard offset shadow — the neo-brutal signature. `intensity` mirrors the
// legacy themeShadow() small/medium/large preset.
function offsetShadow(intensity: 'sm' | 'md' | 'lg' = 'md') {
  const offset = intensity === 'sm' ? 2 : intensity === 'lg' ? 6 : 4
  const elev = intensity === 'sm' ? 2 : intensity === 'lg' ? 6 : 4
  return {
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: elev,
  }
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
  card: {
    backgroundColor: t.white,
    borderWidth: t.cardBorderWidth,
    borderColor: t.black,
    borderRadius: t.radius,
    padding: 16,
    ...offsetShadow('md'),
  },
  input: {
    backgroundColor: t.creamDark,
    borderWidth: 2,
    borderColor: t.black,
    borderRadius: t.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: t.fontBody,
    color: t.black,
  },
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

export const styles: ThemeUIStyles = rawStyles
