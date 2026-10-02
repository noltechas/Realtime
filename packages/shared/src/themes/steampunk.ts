import type { ThemeTokens } from './tokens'

// Steampunk: "THE VOX ENGINE". A brass steam engine that runs on your voice.
//
// The whole theme is one great machine in a Victorian engine house: brass and
// copper gears that really mesh and turn, pressure gauges, a station clock,
// copper pipes that vent steam, riveted plates, portholes, airships drifting
// past the tall arched windows. And it is driven by the singers: the louder
// the room sings, the harder the engine works (gears speed up, gauge needles
// climb, steam blows off).
//
// Every metal part is rendered, not drawn: packages/mobile/scripts/generate-
// steampunk-assets.py lights height maps as real brass, copper and steel, with
// bevels, wear, grime and verdigris. That is the difference from the flat,
// faint gears of earlier versions.
//
// Colours: brass, copper and verdigris over the dark engine house; dials and
// lettering in old parchment; plates in deep green Victorian engine enamel.
// Type: Abril Fatface (the fat face of every Victorian playbill and nameplate)
// for display, numerals and lyrics; Old Standard TT for reading and engraved
// capitals. Copy never uses em dashes.
export const STEAMPUNK_TOKENS: ThemeTokens = {
  name: 'steampunk',
  displayName: 'Steampunk',
  nextThemeName: 'retrowave',

  // Raw colors. Dark theme, so black/white are SEMANTIC: `black` is the
  // parchment text on the dark engine house, `white` the dark surface.
  black:       '#F1E4C6',     // parchment
  white:       '#1A1410',     // the engine house, a shade up
  cream:       '#16231D',     // deep green engine enamel
  creamDark:   '#120D0A',
  hotRed:      '#C9452F',     // the gauge's red zone
  vividYellow: '#E9B050',     // bright brass (opaque, carries dark type)
  softViolet:  '#A88A5A',     // old bronze
  mintGreen:   '#6FA68E',     // verdigris
  muted:       '#A8977A',
  faint:       'rgba(241,228,198,0.18)',

  accentA: '#E2A54B',          // polished brass
  accentB: '#F6C66B',          // lamplight
  accentC: '#5FA08A',          // verdigris

  // Shell
  appBg:         '#120D0A',
  titlebarBg:    '#120D0A',
  titlebarText:  '#C9B48C',

  navBg:           'rgba(18,13,10,0.96)',
  navBorderBottom: '1px solid rgba(201,161,90,0.4)',
  navLink:         '#A8977A',
  navLinkActive:   '#F6C66B',
  navLinkActiveBg: 'rgba(246,198,107,0.1)',
  navLinkHoverBg:  'rgba(246,198,107,0.06)',

  border:       '1px solid rgba(201,161,90,0.55)',
  borderThin:   '1px solid rgba(201,161,90,0.35)',
  borderLight:  '1px solid rgba(201,161,90,0.2)',
  shadow:        '0 4px 14px rgba(0,0,0,0.6)',
  shadowLift:    '0 10px 26px rgba(0,0,0,0.7)',
  shadowPressed: '0 1px 3px rgba(0,0,0,0.6)',
  shadowColor:   (color: string) => `0 0 14px ${color}`,

  radius:      6,
  radiusSmall: 3,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder:    'rgba(226,165,75,0.25)',
  spinnerBorderTop: '#E2A54B',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'rounded',
  cardShape: 'box',
  shadowStyle: 'glow',
  cardBorderWidth: 2,
  displayUppercase: false,            // fat face reads best in title case
  displayLetterSpacing: 0.4,
  accentGlowColor: '#F6C66B',
  statusBarStyle: 'light',

  tabBarBg: '#120D0A',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(18,13,10,0.8)',
  tabBarBorder: 'rgba(201,161,90,0.5)',
  tabBarPill: '#E2A54B',
  tabBarPillFg: '#1A120A',
  tabBarFg: '#8E7E62',

  dimBorder: 'rgba(201,161,90,0.3)',
  pressedOverlay: 'rgba(246,198,107,0.08)',
}
