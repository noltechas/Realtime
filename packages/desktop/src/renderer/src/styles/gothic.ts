// Gothic: "NOCTURNE". A cathedral at midnight, during a storm.
//
// The stage is the inside of the building. Everything on it is made of four
// materials and lit by one warm light, and the same rules hold on the phone
// (packages/mobile/src/theme/themes/gothic/atoms/_gothic.tsx) so the room and
// the guest's hand are one place:
//
//   1. STONE. Cold violet-black limestone with soot and chisel marks. Every
//      plaque is a carved tablet whose corners are CUSPED (a concave quarter-
//      round notch), the one silhouette no other theme uses. Its edge catches
//      moonlight along the top and candlelight along the bottom, because those
//      are the two lights in the room.
//   2. IRON. Matte black with a pewter catch-light, for frames, rails and rules.
//   3. GLASS. Singer colours are never paint here. They are stained glass, lit
//      from behind, so a singer's colour only ever appears as light coming
//      through something: the lyric letters are lit panes in a leaded panel.
//   4. FLAME. The only warm light. Gold is never a metal in this theme (that
//      would make it the steampunk theme in the dark); it is always fire, so it
//      flickers, it glows and it lights the stone next to it.
//
// And the building is haunted. There is one storm clock (components/gothic/
// storm.ts) that every window, pane and backdrop answers at the same instant;
// there are eyes in the dark that follow whichever word is being sung; and the
// candles lean and flare with the room's voices.
//
// Type: UnifrakturMaguntia, a real Fraktur, for display moments only and always
// in title case (blackletter in capitals is unreadable). Grenze Gotisch, a
// hybrid blackletter drawn for reading, carries song titles and every lyric.
// Cormorant Garamond carries prose and small labels.
//
// Kept in sync with packages/shared/src/themes/gothic.ts.

import type React from 'react'
import type { Theme } from './theme'
import { GOTHIC_TOKENS } from '@karaoke/shared'

// ── Palette ──────────────────────────────────────────────────────────────────
export const GOTH = {
    VOID: '#07060A',
    CRYPT: '#0B0A0F',
    STONE_DEEP: '#121017',
    STONE: '#1B1822',
    STONE_HI: '#28242F',
    STONE_EDGE: '#3B3645',
    STONE_LIGHT: '#6E6779',
    IRON: '#0D0C10',
    IRON_HI: '#4C4755',
    BONE: '#E8DFCC',
    BONE_DIM: '#B8AE9B',
    PEWTER: '#968C9E',
    ASH: '#5E5766',
    CANDLE: '#E3B04B',
    FLAME: '#F6D27E',
    FLAME_CORE: '#FFF5DC',
    EMBER: '#D46F22',
    BLOOD: '#C3203A',
    BLOOD_DEEP: '#5E0B19',
    WAX: '#8C1223',
    MOON: '#AFC3EA',
    MOON_DIM: '#56678B',
    SPECTRE: '#86D6AE',
    // Pot-metal glass, for the panes that aren't a singer's.
    RUBY: '#B3132F',
    SAPPHIRE: '#1F3FA8',
    EMERALD: '#167A4E',
    AMETHYST: '#5F2FAE',
    AMBER: '#C9821A',
    FONT_FRAKTUR: "'UnifrakturMaguntia', 'Grenze Gotisch', Georgia, serif",
    FONT_GOTHIC: "'Grenze Gotisch', 'Cormorant Garamond', Georgia, serif",
    FONT_SERIF: "'Cormorant Garamond', 'EB Garamond', Georgia, serif",
} as const

// ── Textures ─────────────────────────────────────────────────────────────────
// Pre-rasterised SVG noise, used as plain background images. A live SVG filter
// on an element that also animates would re-run the turbulence every frame; as
// an image URL the browser rasterises it once and tiles it.
const dataUri = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`
const svgUri = (svg: string): string => `url("${dataUri(svg)}")`

const GRAIN_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>" +
    "<filter id='f' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' seed='7' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0.46  0 0 0 0 0.44  0 0 0 0 0.5  0 0 0 0.62 -0.2'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#f)'/></svg>"

const SOOT_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' width='520' height='520'>" +
    "<filter id='f' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.006 0.011' numOctaves='4' seed='19' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 0 0.03  0 0 0 1.6 -0.55'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#f)'/></svg>"

/** Raw data URIs, for SVG <image href> (the CSS forms below wrap these). */
export const GOTH_TEX = { grain: dataUri(GRAIN_SVG), soot: dataUri(SOOT_SVG) }

/** Fine chisel grain, a grey speckle. */
export const GOTH_GRAIN = svgUri(GRAIN_SVG)

/** Large soft soot stains, darkening the stone unevenly. */
export const GOTH_SOOT = svgUri(SOOT_SVG)

/** Mottled cathedral glass: streaks and seeds of uneven thickness. */
export const GOTH_GLASS = svgUri(
    "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>" +
        "<filter id='f' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.035 0.09' numOctaves='3' seed='4' stitchTiles='stitch'/>" +
        "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.1 -0.5'/></filter>" +
        "<rect width='100%' height='100%' filter='url(#f)'/></svg>",
)

/** Vellum fibres for the parchment notices. */
export const GOTH_VELLUM = svgUri(
    "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>" +
        "<filter id='f' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.06' numOctaves='5' seed='23' stitchTiles='stitch'/>" +
        "<feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.24  0 0 0 0 0.12  0 0 0 0.9 -0.28'/></filter>" +
        "<rect width='100%' height='100%' filter='url(#f)'/></svg>",
)

// ── Geometry ─────────────────────────────────────────────────────────────────

/**
 * The cusp: a rectangle with a concave quarter-round notch bitten out of each
 * corner, as an alpha mask. `inset` is for the inner layers of a plaque: an
 * inner face inset by d px has its notches centred on the SAME outer corner
 * point, so the radius grows by d and the centre moves out by d. That's what
 * keeps a hairline edge an even width all the way round the curve.
 */
export function gothCusp(r: number, inset = 0): React.CSSProperties {
    const R = `${r + inset}px`
    const near = `${-inset}px`
    const far = `calc(100% + ${inset}px)`
    const layer = (x: string, y: string) =>
        `radial-gradient(circle ${R} at ${x} ${y}, transparent calc(100% - 0.6px), #000 100%)`
    const image = [layer(near, near), layer(far, near), layer(near, far), layer(far, far)].join(', ')
    const pos = 'left top, right top, left bottom, right bottom'
    return {
        WebkitMaskImage: image,
        maskImage: image,
        WebkitMaskSize: '51% 51%',
        maskSize: '51% 51%',
        WebkitMaskPosition: pos,
        maskPosition: pos,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
    }
}

/**
 * An equilateral lancet (pointed arch) head over a rectangle, as an SVG path
 * in a w×h box. The two arcs are centred on the opposite springing points, so
 * the apex angle is the true gothic 60°. `springAt` is the height (from the
 * top) where the arch meets the straight jambs.
 */
export function lancetPath(w: number, h: number, inset = 0): string {
    const x0 = inset
    const x1 = w - inset
    const span = x1 - x0
    // An equilateral arch on this span rises span·√3/2 above its springing line.
    const rise = (span * Math.sqrt(3)) / 2
    const spring = Math.min(h - inset, inset + rise)
    const apexY = spring - rise
    const r = span
    return [
        `M ${x0} ${h - inset}`,
        `L ${x0} ${spring}`,
        `A ${r} ${r} 0 0 1 ${w / 2} ${apexY}`,
        `A ${r} ${r} 0 0 1 ${x1} ${spring}`,
        `L ${x1} ${h - inset}`,
        'Z',
    ].join(' ')
}

/**
 * The same lancet as a CSS clip-path polygon, sampled along both arcs. It is in
 * percent units, so it is exact for any element with the given width:height
 * `aspect` (the arcs would only distort if the element's proportions changed).
 */
export function lancetClip(aspect: number, steps = 22): string {
    // Work in a unit box 1 wide and 1/aspect tall, then convert to percent.
    const h = 1 / aspect
    const rise = Math.sqrt(3) / 2
    const spring = Math.min(h, rise)
    const pts: string[] = [`0% 100%`, `0% ${((spring / h) * 100).toFixed(3)}%`]
    // Left arc: centred on the right springing point (1, spring), radius 1,
    // from angle 180° (the left jamb) to 120° (the apex).
    for (let i = 1; i <= steps; i++) {
        const a = Math.PI - (Math.PI / 3) * (i / steps)
        const x = 1 + Math.cos(a)
        const y = spring - Math.sin(a)
        pts.push(`${(x * 100).toFixed(3)}% ${((Math.max(0, y) / h) * 100).toFixed(3)}%`)
    }
    // Right arc: centred on the left springing point (0, spring).
    for (let i = 1; i <= steps; i++) {
        const a = Math.PI / 3 - (Math.PI / 3) * (i / steps)
        const x = Math.cos(a)
        const y = spring - Math.sin(a)
        pts.push(`${(x * 100).toFixed(3)}% ${((Math.max(0, y) / h) * 100).toFixed(3)}%`)
    }
    pts.push(`100% 100%`)
    return `polygon(${pts.join(', ')})`
}

// ── Small helpers ────────────────────────────────────────────────────────────

const ROMAN: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

/** Every ordinal in the theme is a Roman numeral, like a chapter or a psalm. */
export function toRoman(n: number): string {
    let v = Math.max(1, Math.floor(n))
    let out = ''
    for (const [k, s] of ROMAN) {
        while (v >= k) {
            out += s
            v -= k
        }
    }
    return out
}

/** Deterministic 0..1 from a string, for stable per-item variation. */
export function gothHash(key: string, salt = 0): number {
    let h = 2166136261 ^ salt
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return ((h >>> 0) % 100000) / 100000
}

// ── Global CSS ───────────────────────────────────────────────────────────────
// Stage-window only (see ThemeContext). The stage's structure and lyric
// treatment live in karaoke.css under GOTHIC STAGE; this sheet carries what is
// keyed to data-theme: the faces, and the universal font rule.
//
// NOTE: no backticks anywhere in this string. It is a template literal, and a
// stray backtick in a CSS comment ends it early, after which the rest of the
// file parses as arithmetic and globalCss silently becomes the number NaN.
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Grenze+Gotisch:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap');

[data-theme="gothic"] * {
  font-family: ${GOTH.FONT_SERIF};
}
[data-theme="gothic"] h1,
[data-theme="gothic"] h2,
[data-theme="gothic"] h3 {
  font-family: ${GOTH.FONT_GOTHIC};
  letter-spacing: 0.01em;
}

/* Lyrics take the reading blackletter. The descendant selector matters: the
   glyphs live in an inner .k-syl__word span, and the universal rule above
   matches that span directly, which beats anything inherited from .k-line. */
[data-theme="gothic"] .k-line,
[data-theme="gothic"] .k-line * {
  font-family: ${GOTH.FONT_GOTHIC};
  font-weight: 800;
  letter-spacing: 0.012em;
}

[data-theme="gothic"] .karaoke-stage {
  background: ${GOTH.VOID};
}

[data-theme="gothic"] ::selection {
  background: rgba(195,32,58,0.55);
  color: ${GOTH.BONE};
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
const T = GOTHIC_TOKENS

const plaqueShadow = '0 10px 30px rgba(0,0,0,0.7), 0 14px 30px -16px rgba(227,176,75,0.35)'

export const GOTHIC: Theme = {
    ...T,
    globalCss: GLOBAL_CSS,
    fontDisplay: GOTH.FONT_GOTHIC,
    fontBody: GOTH.FONT_SERIF,

    page: {
        background: 'transparent',
        color: GOTH.BONE,
        minHeight: '100%',
        padding: '32px 40px 64px',
        maxWidth: 1040,
        margin: '0 auto',
        fontFamily: GOTH.FONT_SERIF,
        position: 'relative',
        zIndex: 2,
    },

    card: {
        background: `linear-gradient(176deg, ${GOTH.STONE_HI} 0%, ${GOTH.STONE} 46%, ${GOTH.STONE_DEEP} 100%)`,
        border: '1px solid rgba(175,195,234,0.16)',
        borderRadius: 2,
        boxShadow: plaqueShadow,
        color: GOTH.BONE,
    },

    cardHover: {
        border: '1px solid rgba(227,176,75,0.4)',
        boxShadow: '0 14px 36px rgba(0,0,0,0.75), 0 18px 34px -14px rgba(227,176,75,0.5)',
    },

    input: {
        background: GOTH.CRYPT,
        border: '1px solid rgba(175,195,234,0.18)',
        borderRadius: 2,
        color: GOTH.BONE,
        fontFamily: GOTH.FONT_SERIF,
        outline: 'none',
        caretColor: GOTH.CANDLE,
    },

    select: {
        background: GOTH.CRYPT,
        border: '1px solid rgba(175,195,234,0.18)',
        borderRadius: 2,
        color: GOTH.BONE,
        fontFamily: GOTH.FONT_SERIF,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none' as const,
    },

    // Primary is sealing wax: deep crimson, bone legend, lit from a candle below.
    btnPrimary: {
        background: `linear-gradient(180deg, #A8182E 0%, ${GOTH.WAX} 55%, #5A0815 100%)`,
        color: GOTH.BONE,
        border: '1px solid #3A0510',
        boxShadow: '0 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,190,190,0.22)',
        borderRadius: 2,
        fontFamily: GOTH.FONT_GOTHIC,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.16s ease',
        letterSpacing: '0.04em',
    },

    btnSecondary: {
        background: `linear-gradient(180deg, ${GOTH.STONE_HI}, ${GOTH.STONE_DEEP})`,
        color: GOTH.BONE,
        border: '1px solid rgba(175,195,234,0.22)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
        borderRadius: 2,
        fontFamily: GOTH.FONT_GOTHIC,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.16s ease',
    },

    btnOutline: {
        background: 'transparent',
        color: GOTH.BONE,
        border: '1px solid rgba(175,195,234,0.3)',
        boxShadow: 'none',
        borderRadius: 2,
        fontFamily: GOTH.FONT_GOTHIC,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.16s ease',
    },

    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 2,
        border: '1px solid rgba(175,195,234,0.18)',
        background: GOTH.CRYPT,
        color: GOTH.PEWTER,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.16s ease',
        boxShadow: 'none',
    },

    iconBtnHover: {
        background: 'rgba(227,176,75,0.1)',
        color: GOTH.CANDLE,
        boxShadow: '0 0 14px rgba(227,176,75,0.25)',
    },

    stickerLabel: {
        position: 'absolute',
        fontFamily: GOTH.FONT_SERIF,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        padding: '3px 10px',
        border: '1px solid rgba(175,195,234,0.2)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
        color: GOTH.BONE,
        background: 'rgba(11,10,15,0.92)',
        borderRadius: 2,
    },
}
