// Psychedelic — "LIQUID LIGHT", the same theme the mobile app runs.
//
// The stage's backdrop is real footage of a 1960s-style liquid light show: oil, water
// and aniline dyes on an overhead projector (see components/LiquidLight.tsx). Nothing
// about that colour is simulated, which is the whole point — two attempts at generating
// it procedurally, a lobed-plate vocabulary and then a domain-warped shader, both read
// as computer graphics rather than as photographed liquid.
//
// EVERYTHING ELSE IS PRINTED. Chrome is built from opaque plates of saturated dye with
// ink lettering and heavy ink keylines — Fillmore poster construction. That is not a
// stylistic flourish, it's the only thing that survives the backdrop: the footage is
// saturated, polychrome, high-contrast and moving, so any UI that also brings colour AND
// translucency competes with it and loses. Earlier passes used dark purple glass with
// rainbow glows and hue-rotation; against real dye footage they read as mud.
//
// Three rules, each one the lesson of a rejected attempt:
//
//   1. PLATES, NOT GLASS. Opaque saturated fills, hard edges, no gradients doing the
//      work of a shape. A crisp colour boundary reads as printed; a gradient reads as
//      generated.
//   2. INK ON BRIGHT, or cream on ink — never a dyed glyph. Every entry in DYES is
//      constrained to carry ink at body sizes, which is why the violet here is lifted
//      from the footage's true #8A3BFF to #A96BFF (ink on #8A3BFF is 3.7:1 and fails).
//   3. THE SHELL STAYS DARK. This app is the operator's control surface, usually running
//      in a dim room next to the stage output; the poster treatment belongs on the stage
//      and on the buttons, not on the admin panels.
//
// Kept in sync with packages/shared/src/themes/psychedelic.ts and the mobile theme's
// shared vocabulary at packages/mobile/src/theme/themes/psychedelic/atoms/_glass.tsx.

import type { Theme } from './theme'

// ── Palette ──────────────────────────────────────────────────────────────────
const INK        = '#08060C'   // the darkest thing in the theme; all keylines and type
const INK_PANEL  = '#120E1C'   // shell panels
const INK_CARD   = '#1A1428'   // raised shell cards
const CREAM      = '#FFF2E8'   // paper — plates, big type on dark, the primary button
const CREAM_DIM  = '#C9BFD2'   // muted body copy on the dark shell

// The dye palette, walked by position wherever a list needs colour.
const DYE_PINK   = '#FF2E88'
const DYE_AMBER  = '#FFB020'
const DYE_MINT   = '#5AF0D0'
const DYE_VIOLET = '#A96BFF'
const DYE_GREEN  = '#39D353'
const DYE_ORANGE = '#FF5A3C'

// Chicle is the Google face closest to the mobile app's Remalos: a fat, warm, 60s
// groove display. Nunito carries every piece of body copy — the previous theme set body
// text in Spicy Rice, a display face, which is illegible at 13px and was fixed on mobile
// for the same reason.
const FONT_DISPLAY = "'Chicle', 'Spicy Rice', cursive"
const FONT_BODY    = "'Nunito', 'Quicksand', system-ui, sans-serif"

/** Poster line work is heavy — a 1px hairline reads timid next to a dye plate. */
const KEYLINE = '2px'

const GLOBAL_CSS = `
/* ── Fonts ───────────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Chicle&family=Nunito:wght@400;700;800&display=swap');

[data-theme="psychedelic"] * {
  font-family: ${FONT_BODY};
}
[data-theme="psychedelic"] h1,
[data-theme="psychedelic"] h2,
[data-theme="psychedelic"] h3 {
  font-family: ${FONT_DISPLAY};
  letter-spacing: 0.01em;
}

/* ── Shared motion ───────────────────────────────────────────────────────────
   Two loops, and they are slow on purpose. An earlier version of this theme ran a
   3s breathe and a continuous hue-rotate on top of a 20s blob morph; on a screen
   the audience stares at for three minutes that reads as agitation. A full cycle
   here takes 6-40 seconds, so the motion registers as drift. */

@keyframes psy-drift {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.035); }
}

/* A quick, discrete arrival for plates — a stamp, not a fade. */
@keyframes psy-stamp-in {
  0%   { transform: scale(0.94) rotate(-0.6deg); opacity: 0; }
  60%  { transform: scale(1.015) rotate(0.2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

/* ── Stage lyrics take the DISPLAY face ──────────────────────────────────────
   The universal rule above sets body type for everything, which is right for
   paragraphs and wrong for the one piece of type an entire room reads from across it.
   Without this the lyrics render in Nunito and the stage loses the theme's whole
   voice. The previous version of this theme got the groovy look here only by accident,
   because its BODY font happened to be a display face (Spicy Rice) — which in turn
   made every 13px paragraph in the app illegible.

   The descendant selector is load-bearing. Naming only .k-line and .k-syl was not
   enough: the actual glyphs live in an inner .k-syl__word span (the lyric renderer
   splits each syllable's trailing space out so a highlight can hug the letters), and the
   universal rule above MATCHES that span directly — a matching declaration always beats
   an inherited one, so the words kept rendering in Nunito while .k-line's computed
   font-family still read "Chicle" and looked correct under inspection. Measuring the
   rendered text width against a canvas prediction is what actually caught it.

   NOTE: no backticks anywhere in this string. It is a template literal, and a stray
   backtick in a CSS comment silently terminates it — the rest of the sheet then parses
   as arithmetic and globalCss lands as the NUMBER NaN, so the stage renders with no
   theme CSS at all and nothing warns you. This has now happened twice in this
   codebase, once here and once in space.ts. */
[data-theme="psychedelic"] .k-line,
[data-theme="psychedelic"] .k-line * {
  font-family: ${FONT_DISPLAY};
  /* Chicle ships one weight; asking for 700 makes the browser synthesise a smeared
     faux-bold, which at stage size is very visible. */
  font-weight: 400;
}

/* ── Shell accents ───────────────────────────────────────────────────────── */
[data-theme="psychedelic"] .topnav a[aria-current="page"] {
  box-shadow: inset 0 -3px 0 ${DYE_PINK};
}

[data-theme="psychedelic"] ::-webkit-scrollbar-thumb {
  background: ${DYE_PINK};
  border-radius: 999px;
}
[data-theme="psychedelic"] ::-webkit-scrollbar-thumb:hover {
  background: ${DYE_AMBER};
}
[data-theme="psychedelic"] ::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.04);
}

/* Focus is a solid dye ring, not a glow — glows are what the old theme used
   everywhere and they are indistinguishable from each other at a glance. */
[data-theme="psychedelic"] input:focus,
[data-theme="psychedelic"] select:focus,
[data-theme="psychedelic"] textarea:focus {
  outline: none;
  border-color: ${DYE_PINK} !important;
  box-shadow: 0 0 0 3px rgba(255,46,136,0.28) !important;
}

/* Buttons are dye plates: a press pushes them into the page rather than fading
   them, which is the physical read a printed object wants. */
[data-theme="psychedelic"] button:active {
  transform: translateY(1px);
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
export const PSYCHEDELIC: Theme = {
    name: 'psychedelic',
    nextThemeName: 'zen',
    displayName: 'Psychedelic',
    globalCss: GLOBAL_CSS,

    // `black` / `white` are SEMANTIC, not literal: on this dark shell `black` is the
    // light foreground and `white` is the dark backdrop.
    black:       CREAM,
    white:       INK,
    cream:       INK_PANEL,
    creamDark:   INK_CARD,
    hotRed:      DYE_PINK,
    // The NOW PLAYING banner uses accentB as a background with hardcoded dark text, so
    // this must stay bright. Cream is the brightest surface in the theme.
    vividYellow: CREAM,
    softViolet:  DYE_VIOLET,
    mintGreen:   DYE_MINT,
    muted:       CREAM_DIM,
    faint:       'rgba(255,255,255,0.16)',

    accentA: DYE_PINK,
    accentB: CREAM,
    accentC: DYE_MINT,

    // ── Shell ──────────────────────────────────────────────────────────────────
    appBg:         INK,
    titlebarBg:    INK,
    titlebarText:  CREAM_DIM,

    navBg:           'rgba(8,6,12,0.96)',
    navBorderBottom: `${KEYLINE} solid rgba(255,255,255,0.10)`,
    navLink:         CREAM_DIM,
    navLinkActive:   CREAM,
    navLinkActiveBg: 'rgba(255,255,255,0.07)',
    navLinkHoverBg:  'rgba(255,255,255,0.04)',

    // ── Borders & shadows ──────────────────────────────────────────────────────
    // Depth comes from real black shadow, never a coloured glow: the stage backdrop
    // already supplies all the colour there is, and a glow on top of it just adds haze.
    border:       `${KEYLINE} solid rgba(255,255,255,0.14)`,
    borderThin:   '1px solid rgba(255,255,255,0.10)',
    borderLight:  '1px solid rgba(255,255,255,0.06)',
    shadow:        '0 4px 16px rgba(0,0,0,0.5)',
    shadowLift:    '0 12px 34px rgba(0,0,0,0.6)',
    shadowPressed: '0 2px 6px rgba(0,0,0,0.55)',
    shadowColor:   (color: string) => `0 0 0 ${KEYLINE} ${color}, 0 6px 20px rgba(0,0,0,0.5)`,

    // Generous, and asymmetric where a component opts in — poured, not drawn.
    radius:      18,
    radiusSmall: 11,

    fontDisplay: FONT_DISPLAY,
    fontBody:    FONT_BODY,

    spinnerBorder:    'rgba(255,255,255,0.14)',
    spinnerBorderTop: DYE_PINK,

    // ── Component styles ───────────────────────────────────────────────────────
    page: {
        background:  'transparent',
        color:       CREAM,
        minHeight:   '100%',
        padding:     '32px 40px 64px',
        maxWidth:    960,
        margin:      '0 auto',
        fontFamily:  FONT_BODY,
        position:    'relative',
        zIndex:      2,
    },

    card: {
        background:   INK_PANEL,
        border:       `${KEYLINE} solid rgba(255,255,255,0.12)`,
        borderRadius: 18,
        boxShadow:    '0 4px 16px rgba(0,0,0,0.45)',
    },

    cardHover: {
        border:    `${KEYLINE} solid ${DYE_PINK}`,
        boxShadow: '0 10px 26px rgba(0,0,0,0.55)',
    },

    input: {
        background:   'rgba(255,255,255,0.05)',
        border:       `${KEYLINE} solid rgba(255,255,255,0.14)`,
        borderRadius: 11,
        color:        CREAM,
        fontFamily:   FONT_BODY,
        fontWeight:   700,
        outline:      'none',
        caretColor:   DYE_PINK,
    },

    select: {
        background:   'rgba(255,255,255,0.05)',
        border:       `${KEYLINE} solid rgba(255,255,255,0.12)`,
        borderRadius: 11,
        color:        CREAM,
        fontFamily:   FONT_BODY,
        fontWeight:   700,
        outline:      'none',
        cursor:       'pointer',
        appearance:   'none' as const,
    },

    // The three buttons are three weights of the same printing: paper, ink, and a
    // keyline on nothing. None of them is frosted glass.
    btnPrimary: {
        background:    CREAM,
        color:         INK,
        border:        `${KEYLINE} solid ${INK}`,
        boxShadow:     '0 4px 14px rgba(0,0,0,0.45)',
        borderRadius:  12,
        fontFamily:    FONT_DISPLAY,
        fontWeight:    400,
        cursor:        'pointer',
        transition:    'transform 0.12s ease, box-shadow 0.2s ease',
        letterSpacing: '0.02em',
    },

    btnSecondary: {
        background:   DYE_PINK,
        color:        INK,
        border:       `${KEYLINE} solid ${INK}`,
        boxShadow:    '0 4px 14px rgba(0,0,0,0.45)',
        borderRadius: 12,
        fontFamily:   FONT_DISPLAY,
        fontWeight:   400,
        cursor:       'pointer',
        transition:   'transform 0.12s ease, box-shadow 0.2s ease',
    },

    btnOutline: {
        background:   'transparent',
        color:        CREAM,
        border:       `${KEYLINE} solid rgba(255,255,255,0.42)`,
        boxShadow:    'none',
        borderRadius: 12,
        fontFamily:   FONT_DISPLAY,
        fontWeight:   400,
        cursor:       'pointer',
        transition:   'all 0.2s ease',
    },

    iconBtn: {
        width:          40,
        height:         40,
        borderRadius:   12,
        border:         `${KEYLINE} solid rgba(255,255,255,0.14)`,
        background:     'rgba(255,255,255,0.05)',
        color:          CREAM_DIM,
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        transition:     'all 0.2s ease',
        boxShadow:      'none',
    },

    iconBtnHover: {
        background: DYE_PINK,
        color:      INK,
        border:     `${KEYLINE} solid ${INK}`,
        boxShadow:  '0 4px 12px rgba(0,0,0,0.5)',
    },

    stickerLabel: {
        position:      'absolute',
        fontFamily:    FONT_BODY,
        fontWeight:    800,
        fontSize:      10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding:       '3px 11px',
        border:        `${KEYLINE} solid ${INK}`,
        boxShadow:     '0 2px 8px rgba(0,0,0,0.5)',
        color:         INK,
        background:    DYE_AMBER,
        borderRadius:  999,
    },
}

// ── Stage vocabulary ─────────────────────────────────────────────────────────
// Exported for the stage's poster chrome in KaraokePage — the plates, the sunburst,
// the count-in and the lyric line all draw from exactly these values, so the stage and
// the theme can't drift apart.
export const PSY = {
    INK,
    CREAM,
    /** Secondary ink, for supporting type on a bright plate. */
    INK_SOFT: 'rgba(8,6,12,0.68)',
    INK_FAINT: 'rgba(8,6,12,0.42)',
    /** Poster keyline width in px, as a number so callers can compute with it. */
    LINE: 3,
    DYES: [DYE_PINK, DYE_AMBER, DYE_MINT, DYE_VIOLET, DYE_GREEN, DYE_ORANGE] as const,
    FONT_DISPLAY,
    FONT_BODY,
} as const

/**
 * Cream display type with an ink stroke behind it — the one treatment that survives being
 * laid directly over the projector footage, which runs from near-black to pure white.
 *
 * The stroke width is in `em`, NOT pixels. A fixed pixel stroke looks completely different
 * on a laptop preview and on a 4K stage output: 11px read as a tasteful outline at one size
 * and as a heavy blob welded around the letters at another, closing up Chicle's counters.
 * In em it holds the same ratio to the letterform everywhere.
 *
 * `paintOrder: 'stroke'` puts the stroke UNDER the fill. Without it, -webkit-text-stroke is
 * centred on the glyph outline and eats half the letterform from the inside.
 */
export function psyStroke(em = 0.045): Record<string, string> {
    return {
        color: CREAM,
        WebkitTextStroke: `${em}em ${INK}`,
        paintOrder: 'stroke',
    }
}

/**
 * Corner radii for a plate that looks POURED rather than drawn — one diagonal pair fat,
 * the other tight, flipping with `seed` so adjacent plates aren't identical.
 */
export function psyPoured(seed: number, base = 22, swing = 10): string {
    const fat = base + swing
    const tight = base - swing
    return seed % 2 === 0
        ? `${fat}px ${tight}px ${fat}px ${tight}px`
        : `${tight}px ${fat}px ${tight}px ${fat}px`
}
