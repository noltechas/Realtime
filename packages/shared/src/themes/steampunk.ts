import type { ThemeTokens } from './tokens'

// Steampunk — Victorian industrial aesthetic. Aged brass + polished copper
// on weathered parchment, with verdigris-teal accent for oxidised metals and
// a rich oxblood for danger/warning states. Hero motifs that every steampunk
// atom touches: rotating clockwork gears, drifting steam plumes, copper
// rivets at panel corners, brass filigree corner ornaments, swinging
// pendulum dials, glowing amber Edison filaments, pneumatic pressure gauges,
// and brass riveted plate seams.
export const STEAMPUNK_TOKENS: ThemeTokens = {
  name: 'steampunk',
  displayName: 'Steampunk',
  nextThemeName: 'retrowave',

  // Raw colors — dark coal-fire world. `black` and `white` are SEMANTIC for
  // dark themes: `black` = the primary readable text on the dark world
  // (light parchment), `white` = a darker surface that contrasts with the
  // text. This mirrors how cyberpunk/space/urban inverted these tokens.
  black:       '#F0DDB5',     // aged parchment — primary readable text
  white:       '#2A1A0E',     // dark walnut — "light surface" stand-in
  cream:       '#3E2810',     // dark mahogany card
  creamDark:   '#2A1A0E',     // dark walnut panel
  hotRed:      '#C95A45',     // bright oxblood / danger
  vividYellow: '#E8A93B',     // gas-lamp amber
  softViolet:  '#A88555',     // muted brass (replacing violet)
  mintGreen:   '#8AB5A0',     // verdigris — oxidised copper green (lightened)
  muted:       '#A88555',     // muted bronze parchment
  faint:       'rgba(184,134,72,0.30)',

  accentA: '#B8762D',          // aged brass — primary
  accentB: '#C97D3E',          // polished copper — secondary
  accentC: '#5C8A7A',          // verdigris teal — tertiary (oxidation)

  // Shell
  appBg:         '#1F1108',     // deep coal-fire ember
  titlebarBg:    '#1F1108',
  titlebarText:  '#C9A878',

  navBg:           'rgba(31,17,8,0.95)',
  navBorderBottom: '1px solid rgba(184,118,45,0.45)',
  navLink:         '#A88555',
  navLinkActive:   '#E8A93B',
  navLinkActiveBg: 'rgba(232,169,59,0.10)',
  navLinkHoverBg:  'rgba(232,169,59,0.06)',

  border:       '1px solid rgba(184,118,45,0.55)',
  borderThin:   '1px solid rgba(184,118,45,0.40)',
  borderLight:  '1px solid rgba(184,118,45,0.22)',
  shadow:        '0 2px 6px rgba(0,0,0,0.55), inset 0 1px 0 rgba(232,169,59,0.18)',
  shadowLift:    '0 6px 14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(232,169,59,0.25)',
  shadowPressed: '0 1px 2px rgba(0,0,0,0.5)',
  shadowColor:   (color: string) => `0 0 10px ${color}, 0 0 22px ${color}`,

  radius:      8,
  radiusSmall: 4,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder:    'rgba(184,118,45,0.25)',
  spinnerBorderTop: '#B8762D',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'rounded',
  cardShape: 'box',
  shadowStyle: 'glow',                // amber gas-lamp glow
  cardBorderWidth: 2,                 // riveted brass plate feel
  displayUppercase: true,             // Cinzel reads as engraved plaque in caps
  displayLetterSpacing: 1.8,
  accentGlowColor: '#E8A93B',         // gas-lamp amber halo
  statusBarStyle: 'light',

  tabBarBg: '#1F1108',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(31,17,8,0.7)',
  tabBarBorder: 'rgba(184,118,45,0.6)',
  tabBarPill: '#B8762D',              // brass pill behind active tab
  tabBarPillFg: '#1F1108',
  tabBarFg: '#A88555',

  dimBorder: 'rgba(184,118,45,0.35)',
  pressedOverlay: 'rgba(232,169,59,0.10)',
}
