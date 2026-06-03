import { StyleSheet } from 'react-native'
import { COMIC_BOOK_MOBILE } from '../../tokens'
import type { ThemeUIStyles } from '../../types'

// Comic-Book screen scaffolds. Same offset-shadow family as neo-brutal, but
// louder: heavier 3px ink panel borders, hard INK (#16161D) drop shadows
// (not the red accentGlowColor — comic panels are inked in black), Luckiest
// Guy display headings with a hard ink textShadow for the printed-panel look,
// and a warm newsprint paper background. All values hard-coded against
// COMIC_BOOK_MOBILE so there's no runtime per-theme branching in this folder.
const t = COMIC_BOOK_MOBILE

// Hard ink offset shadow — the comic-panel signature. Always inked black
// (#16161D), never the red accent, so panels read as printed line art.
function inkShadow(intensity: 'sm' | 'md' | 'lg' = 'md') {
  const offset = intensity === 'sm' ? 2 : intensity === 'lg' ? 6 : 4
  const elev = intensity === 'sm' ? 2 : intensity === 'lg' ? 6 : 4
  return {
    shadowColor: t.black,
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
    // Luckiest Guy is single-weight — keep weight 'normal'. The earlier same-ink
    // textShadow just doubled the glyphs into a muddy blob; use a hard RED
    // spot-color drop shadow instead so the ink letters read crisp with a clean
    // pop-art offset (the classic comic-logo look).
    fontWeight: 'normal',
    fontSize: 35,
    color: t.black,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: t.hotRed,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  h2: {
    fontFamily: t.fontDisplay,
    fontWeight: 'normal',
    fontSize: 24,
    color: t.black,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: t.fontBody,
    fontSize: 15,
    color: t.black,
    lineHeight: 21,
  },
  muted: {
    fontFamily: t.fontBody,
    fontSize: 13,
    color: t.muted,
  },
  card: {
    backgroundColor: t.white,
    borderWidth: t.cardBorderWidth,
    borderColor: t.black,
    borderRadius: t.radius,
    padding: 16,
    ...inkShadow('md'),
  },
  input: {
    backgroundColor: t.white,
    borderWidth: 2.5,
    borderColor: t.black,
    borderRadius: t.radiusSmall,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: t.fontBody,
    color: t.black,
  },
  pillBox: {
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: t.black,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: t.vividYellow,
  },
  pillText: {
    fontFamily: t.fontDisplay,
    fontWeight: 'normal',
    fontSize: 13,
    color: t.black,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontFamily: t.fontDisplay,
    fontWeight: 'normal',
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: t.black,
    opacity: 0.6,
    marginBottom: 12,
  },
})

export const styles: ThemeUIStyles = rawStyles
