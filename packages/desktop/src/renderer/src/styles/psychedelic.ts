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

// ── Wet dye: blending two singers into one line ──────────────────────────────
// The theme's first rule is PLATES, NOT GLASS — hard colour boundaries, no gradients.
// A line shared by two singers is the one deliberate exception, and it earns it:
//
//   * A shared line isn't two panels. It is one set of words that two people sing
//     together, and butting two hard bands against each other says the opposite —
//     "you take the left half, I'll take the right." The first version did exactly
//     that (it reused the neo-brutal poster's `nbSplitBackground`) and read as a
//     colour swatch someone had cut in half.
//   * The backdrop is real footage of dye bleeding into dye on an overhead projector.
//     A wet seam is not a generic soft gradient here — it is the literal subject of
//     the film the plate is sitting in front of.
//
// The reason hard bands were chosen in the first place still stands, though: a plain
// `linear-gradient(pink, mint)` fades through the grey axis in sRGB and the middle of
// the line turns to mud. So the seam is walked in OKLCh — lightness and chroma move
// smoothly while the HUE ROTATES between the two dyes, with a small chroma bloom at
// the centre. The mix stays a saturated third dye the whole way across, which is what
// the two colours actually do when they run together in the tray.
//
// Each singer still holds a PURE plateau across most of their own share of the line,
// so "who is singing this" survives a glance from across a room; only the seam blends.

/** #rgb / #rrggbb → sRGB 0..1. Null for anything this can't read (rgb(), named colours). */
function psyParseHex(hex: string): [number, number, number] | null {
    const raw = (hex || '').trim().replace('#', '')
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    return [r, g, b]
}

const psyToLinear = (v: number): number => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
const psyToGamma = (v: number): number => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)

/** sRGB 0..1 → OKLCh as [L 0..1, C, H degrees]. (Ottosson's matrices.) */
function psyToOklch([r0, g0, b0]: [number, number, number]): [number, number, number] {
    const r = psyToLinear(r0)
    const g = psyToLinear(g0)
    const b = psyToLinear(b0)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    const h = (Math.atan2(B, A) * 180) / Math.PI
    return [L, Math.hypot(A, B), h < 0 ? h + 360 : h]
}

function psyOklchToLinear(L: number, C: number, H: number): [number, number, number] {
    const rad = (H * Math.PI) / 180
    const A = Math.cos(rad) * C
    const B = Math.sin(rad) * C
    const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3)
    const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3)
    const s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3)
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ]
}

/**
 * OKLCh → #rrggbb. Out-of-gamut mixes give up CHROMA, never lightness: clipping the
 * channels instead would shift the hue, and a seam that changes hue as it desaturates
 * is exactly the mud this whole detour exists to avoid.
 */
function psyFromOklch(L: number, C: number, H: number): string {
    let chroma = Math.max(0, C)
    let rgb = psyOklchToLinear(L, chroma, H)
    const outside = (v: [number, number, number]): boolean => v.some((c) => c < -0.0015 || c > 1.0015)
    for (let i = 0; i < 24 && chroma > 0.0004 && outside(rgb); i++) {
        chroma *= 0.92
        rgb = psyOklchToLinear(L, chroma, H)
    }
    return (
        '#' +
        rgb
            .map((v) => {
                const n = Math.round(Math.min(1, Math.max(0, psyToGamma(Math.min(1, Math.max(0, v))))) * 255)
                return n.toString(16).padStart(2, '0')
            })
            .join('')
    )
}

/**
 * One dye stirred into another at `t` (0 = all `a`, 1 = all `b`), through OKLCh with a
 * chroma bloom at the halfway point so the mix reads as a third dye rather than as the
 * place where two colours cancelled out.
 */
export function psyDyeMix(a: string, b: string, t: number): string {
    const ra = psyParseHex(a)
    const rb = psyParseHex(b)
    if (!ra || !rb) return t < 0.5 ? a : b
    const [la, ca, ha0] = psyToOklch(ra)
    const [lb, cb, hb0] = psyToOklch(rb)
    // A near-grey pick has no meaningful hue of its own (atan2(0,0) is 0, i.e. red), so
    // it borrows the other dye's hue and the seam becomes a pure tint ramp.
    const ha = ca < 0.002 ? hb0 : ha0
    const hb = cb < 0.002 ? ha0 : hb0
    let dh = hb - ha
    if (dh > 180) dh -= 360
    if (dh < -180) dh += 360
    const L = la + (lb - la) * t
    const C = (ca + (cb - ca) * t) * (1 + 0.14 * Math.sin(Math.PI * t))
    return psyFromOklch(L, C, ha + dh * t)
}

/**
 * A shared line's fill: each singer's dye held pure across the middle of their own share
 * of the line, running wet into the next one across the seams.
 *
 * `spread` is the fraction of one singer's band given over to the crossfade on each side
 * (0.3 = a generous wet seam roughly 60% of a band wide; 0 would be the old hard cut).
 * The seam carries three sampled mid-dyes so the browser's own sRGB interpolation only
 * ever runs between neighbours a few degrees of hue apart — the OKLCh path is what
 * decides the colour, not the gradient engine.
 *
 * Falls back to a plain browser fade if a colour isn't hex, so an unexpected `rgb()`
 * singer colour still blends rather than dropping the fill entirely.
 */
export function psyDyeBleed(colors: string[], angleDeg = 96, spread = 0.3): string {
    const uniq = colors.filter((c, i) => !!c && colors.indexOf(c) === i)
    if (uniq.length === 0) return CREAM
    if (uniq.length === 1) return uniq[0]
    if (uniq.some((c) => !psyParseHex(c))) return `linear-gradient(${angleDeg}deg, ${uniq.join(', ')})`

    const band = 100 / uniq.length
    const half = band * Math.min(0.5, Math.max(0, spread))
    const stops: string[] = []
    uniq.forEach((c, i) => {
        const start = i * band
        const end = (i + 1) * band
        stops.push(`${c} ${(i === 0 ? 0 : start + half).toFixed(2)}%`)
        stops.push(`${c} ${(i === uniq.length - 1 ? 100 : end - half).toFixed(2)}%`)
        if (i < uniq.length - 1) {
            for (const t of [0.25, 0.5, 0.75]) {
                stops.push(`${psyDyeMix(c, uniq[i + 1], t)} ${(end - half + 2 * half * t).toFixed(2)}%`)
            }
        }
    })
    return `linear-gradient(${angleDeg}deg, ${stops.join(', ')})`
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
