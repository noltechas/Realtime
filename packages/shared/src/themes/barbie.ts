import type { ThemeTokens } from './tokens'

// Barbie: "BARBIE LAND". A pink, sunny day on a painted movie set.
//
// Everything in Barbie Land is a little artificial, and delighted about it. The
// sky is a painted backdrop, the clouds are flat brushwork, the pool water has
// its ripples painted on, and the sun is always out. The theme is made of:
//
//   • PAINTED SKY    flat gradients from pool blue through pink to a peach
//                    horizon; cumulus clouds in two flat tones (white, and a
//                    lilac pink shadow side) with a warm sunlit rim.
//   • THE SUN        a painted disc with a retro two-tone sunburst. It is the
//                    theme's one clock: it brightens with the room's voices,
//                    and its glint sweeps across every glossy surface at the
//                    same moment on every screen.
//   • PINK PLASTIC   the glossy, candy-bright pink of the whole town, with a
//                    white rim and a crisp specular.
//   • PALM SPRINGS   the town's architecture: breeze-block screens, awning
//                    scallops, boomerang curves and a painted pool.
//   • GLITTER        four-point twinkles, never a plain glow.
//
// Structural signature: the SCALLOP (an awning's valance, a cloud's puffs, the
// sun's rays) ends cards, tabs and plates, so nothing is a plain rectangle.
//
// Type: Shrikhand (a heavy retro italic, set like sign-painted 3D lettering
// with a white outline and a pink extrusion) for titles and lyrics, Yellowtail
// (a 60s brush script) for the odd flourish, Poppins for everything else.
export const BARBIE_TOKENS: ThemeTokens = {
  name: 'barbie',
  displayName: 'Barbie',
  nextThemeName: 'liquid-glass', // barbie → liquid glass, which loops back to neo-brutal

  // A LIGHT theme: plum ink on pink card.
  black: '#4B0A35', // plum ink, primary text
  white: '#FFFFFF', // white card
  cream: '#FFF0F7', // pale pink card stock
  creamDark: '#FFD9EB', // shaded pink card
  hotRed: '#FF2E63', // lipstick red, danger
  vividYellow: '#FFD23F', // sunshine, opaque on purpose (see CLAUDE.md)
  softViolet: '#B98CFF', // lavender plastic
  mintGreen: '#2FCFC0', // Malibu pool aqua
  muted: '#A0567F', // dusty raspberry, secondary text
  faint: 'rgba(224,33,138,0.12)',

  // accentA must carry dark type (selected states use it with dark text), so it
  // is the lighter bubblegum. The deep Barbie pink is accentC.
  accentA: '#FF5DB1', // bubblegum
  accentB: '#FFA6D5', // cotton candy, bright for the NOW PLAYING banner
  accentC: '#E0218A', // Barbie pink

  // Shell
  appBg: '#FFE6F2',
  titlebarBg: '#E0218A',
  titlebarText: '#FFFFFF',

  navBg: '#E0218A',
  navBorderBottom: '3px solid #FFFFFF',
  navLink: '#FFE6F2',
  navLinkActive: '#FFFFFF',
  navLinkActiveBg: 'rgba(255,255,255,0.18)',
  navLinkHoverBg: 'rgba(255,255,255,0.1)',

  border: '2px solid #E0218A',
  borderThin: '1.5px solid rgba(224,33,138,0.5)',
  borderLight: '1px solid rgba(224,33,138,0.2)',
  // Soft sunny-day shadows, tinted pink rather than grey.
  shadow: '0 6px 16px rgba(176,17,94,0.18)',
  shadowLift: '0 12px 28px rgba(176,17,94,0.26)',
  shadowPressed: '0 2px 6px rgba(176,17,94,0.2)',
  shadowColor: (color: string) => `0 8px 22px ${color}`,

  radius: 22,
  radiusSmall: 14,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder: 'rgba(224,33,138,0.2)',
  spinnerBorderTop: '#E0218A',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: false,
  cornerStyle: 'rounded',
  cardShape: 'box',
  shadowStyle: 'glow', // soft pink drop, the way sunlight shadows read here
  cardBorderWidth: 2,
  displayUppercase: false, // Shrikhand is an italic display face; never caps
  displayLetterSpacing: 0,
  accentGlowColor: '#B0115E',
  statusBarStyle: 'dark',

  tabBarBg: '#E0218A', // glossy pink
  tabBarBlurTint: 'light',
  tabBarOverlay: 'rgba(255,230,242,0.5)',
  tabBarBorder: '#B0115E',
  tabBarPill: '#FFFFFF', // the glossy white bubble the active tab sits in
  tabBarPillFg: '#E0218A',
  tabBarFg: '#FFD1E8', // one shared pale pink for every inactive tab

  dimBorder: 'rgba(224,33,138,0.25)',
  pressedOverlay: 'rgba(224,33,138,0.08)',
}
