// Space: "GOLDEN RECORD". Earth's music, sent out into deep space.
//
// In 1977 the two Voyager probes left for interstellar space carrying a gold
// record of the sounds and music of Earth. The stage is that record and the
// deep space it sails through, and every element is built from four materials:
//
//   1. DEEP SPACE. A real sky, rendered in one shader (components/space/
//      DeepField.tsx): stars in their true colours, the dust lanes of the Milky
//      Way, faint emission nebulae, and the long diagonal sunbeam of the Pale
//      Blue Dot photograph. While a song plays without a video, the song's own
//      album art becomes a nebula.
//   2. GOLD. The record: satin anodized gold, cut with fine concentric grooves
//      that catch the light as a single bright sweep.
//   3. ETCHED LINE. All ornament is hairline engraving in the record cover's
//      language: the pulsar map that tells a finder where Earth is, binary tick
//      marks, the stylus diagram. Never a glow blob.
//   4. STARLIGHT. Light is a point source with diffraction spikes, the eight-
//      pointed star of a deep-field telescope photograph. A singer's colour is
//      the colour of their star; the words they sing light up as starlight.
//
// Type: Jost (a geometric face in the tradition of Futura, which NASA engraved
// on the Apollo 11 plaque), light and widely tracked for display, medium for
// lyrics; IBM Plex Mono for every coordinate, number and code.
//
// Kept in sync with packages/shared/src/themes/space.ts.

import type { Theme } from './theme'
import { SPACE_TOKENS } from '@karaoke/shared'

// ── Palette ──────────────────────────────────────────────────────────────────
export const SP = {
    VOID: '#020308',
    VOID_2: '#05060C',
    GLASS: '#080A12',
    GLASS_HI: '#10131D',
    // Gold, from shadow to sheen
    GOLD_SHADOW: '#4A3612',
    GOLD_DEEP: '#9C7A33',
    GOLD: '#E9C46A',
    GOLD_HI: '#F6DE9A',
    GOLD_SHEEN: '#FFF4D2',
    // Starlight and dust
    STAR: '#ECE6D8',
    STAR_DIM: '#B7B2A6',
    DUST: '#8A8EA3',
    DUST_DIM: '#5D6175',
    // Real star and gas colours
    STAR_BLUE: '#A9C3FF',
    STAR_RED: '#FFB08A',
    H_ALPHA: '#E0687A',
    OIII: '#5FD6C8',
    PALE_BLUE: '#8FB4FF',
    FONT_DISPLAY: "'Jost', 'Futura', 'Century Gothic', 'Helvetica Neue', sans-serif",
    FONT_MONO: "'IBM Plex Mono', 'Menlo', 'Consolas', monospace",
} as const

/** Etched gold hairline colours at three strengths. */
export const ETCH = {
    strong: 'rgba(233,196,106,0.62)',
    mid: 'rgba(233,196,106,0.34)',
    faint: 'rgba(233,196,106,0.16)',
} as const

// ── Small helpers ────────────────────────────────────────────────────────────

/** Deterministic 0..1 from a string, for stable per-item variation. */
export function spHash(key: string, salt = 0): number {
    let h = 2166136261 ^ salt
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return ((h >>> 0) % 100000) / 100000
}

/**
 * A number in the record cover's binary notation: the cover writes 1 as a
 * short vertical stroke and 0 as a short horizontal one. Returns most
 * significant digit first, padded to `bits`.
 */
export function binaryDigits(n: number, bits = 0): Array<0 | 1> {
    const s = Math.max(0, Math.floor(n)).toString(2).padStart(bits, '0')
    return s.split('').map((c) => (c === '1' ? 1 : 0))
}

/** The eight-pointed deep-field star as a CSS mask image (colour it with
 *  background-color). Six long spikes from the hexagonal mirror, two short
 *  horizontal ones from the struts, and a soft core. */
export const STAR_MASK = (() => {
    const spike = (a: number, len: number, w: number) => {
        const r = (a * Math.PI) / 180
        const x = Math.cos(r)
        const y = Math.sin(r)
        const px = -y * w
        const py = x * w
        return `M ${(px).toFixed(3)} ${(py).toFixed(3)} L ${(x * len).toFixed(3)} ${(y * len).toFixed(3)} L ${(-px).toFixed(3)} ${(-py).toFixed(3)} L ${(-x * len).toFixed(3)} ${(-y * len).toFixed(3)} Z`
    }
    const paths = [spike(90, 50, 1.6), spike(30, 50, 1.6), spike(150, 50, 1.6), spike(0, 28, 1.1)]
    const svg =
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='-50 -50 100 100'>" +
        "<defs><radialGradient id='g'><stop offset='0' stop-color='white'/><stop offset='0.18' stop-color='white' stop-opacity='0.95'/><stop offset='0.42' stop-color='white' stop-opacity='0.25'/><stop offset='1' stop-color='white' stop-opacity='0'/></radialGradient></defs>" +
        paths.map((d) => `<path d='${d}' fill='white'/>`).join('') +
        "<circle r='22' fill='url(#g)'/></svg>"
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})()

/** Radio static, for a signal that can't be read yet (a surprise song). */
const NOISE_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
    "<filter id='f' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' seed='3' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0 0.72  0 0 0 1.6 -0.55'/></filter>" +
    "<rect width='100%' height='100%' fill='%23050608'/><rect width='100%' height='100%' filter='url(%23f)'/></svg>"
export const SP_NOISE = `url("data:image/svg+xml,${NOISE_SVG.replace(/</g, '%3C').replace(/>/g, '%3E')}")`

// ── Global CSS ───────────────────────────────────────────────────────────────
// Stage-window only (see ThemeContext). The stage's structure and lyric
// treatment live in karaoke.css under SPACE STAGE.
//
// NOTE: no backticks anywhere in this string (a stray one ends the template
// literal early and globalCss silently becomes NaN).
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

[data-theme="space"] * {
  font-family: ${SP.FONT_DISPLAY};
}
[data-theme="space"] h1,
[data-theme="space"] h2,
[data-theme="space"] h3 {
  font-family: ${SP.FONT_DISPLAY};
  font-weight: 400;
  letter-spacing: 0.08em;
}

/* Lyrics are Jost Medium. The descendant selector matters: the glyphs live in
   .k-syl__word, which the universal rule above matches directly. */
[data-theme="space"] .k-line,
[data-theme="space"] .k-line * {
  font-family: ${SP.FONT_DISPLAY};
  font-weight: 500;
  letter-spacing: 0.015em;
}

[data-theme="space"] .karaoke-stage {
  background: ${SP.VOID};
}

/* Shared images for karaoke.css (it can't import from here). */
:root {
  --sp-star-mask: ${STAR_MASK};
  --sp-noise: ${SP_NOISE};
}

[data-theme="space"] ::selection {
  background: rgba(233,196,106,0.4);
  color: ${SP.STAR};
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
const T = SPACE_TOKENS

const glassFill = `linear-gradient(180deg, ${SP.GLASS_HI} 0%, ${SP.GLASS} 100%)`
// Satin anodized gold: a broad soft highlight across the top third, darker
// toward the foot, the way a brushed gold plate lit from above reads.
const goldFill = `linear-gradient(180deg, ${SP.GOLD_HI} 0%, ${SP.GOLD} 38%, #C9A24C 70%, ${SP.GOLD_DEEP} 100%)`

export const SPACE: Theme = {
    ...T,
    globalCss: GLOBAL_CSS,
    fontDisplay: SP.FONT_DISPLAY,
    fontBody: SP.FONT_DISPLAY,

    page: {
        background: 'transparent',
        color: SP.STAR,
        minHeight: '100%',
        padding: '32px 40px 64px',
        maxWidth: 1040,
        margin: '0 auto',
        fontFamily: SP.FONT_DISPLAY,
        position: 'relative',
        zIndex: 2,
    },

    card: {
        background: glassFill,
        border: `1px solid ${ETCH.faint}`,
        borderRadius: 14,
        boxShadow: '0 10px 30px rgba(0,0,0,0.65), inset 0 1px 0 rgba(233,196,106,0.10)',
        color: SP.STAR,
    },

    cardHover: {
        border: `1px solid ${ETCH.mid}`,
        boxShadow: '0 14px 36px rgba(0,0,0,0.75), inset 0 1px 0 rgba(233,196,106,0.18)',
        transform: 'translateY(-1px)',
    },

    input: {
        background: SP.VOID_2,
        border: `1px solid ${ETCH.faint}`,
        borderRadius: 10,
        color: SP.STAR,
        fontFamily: SP.FONT_DISPLAY,
        outline: 'none',
        caretColor: SP.GOLD,
    },

    select: {
        background: SP.VOID_2,
        border: `1px solid ${ETCH.faint}`,
        borderRadius: 10,
        color: SP.STAR,
        fontFamily: SP.FONT_DISPLAY,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none' as const,
    },

    // Primary is the record's gold, with the legend engraved dark into it.
    btnPrimary: {
        background: goldFill,
        color: '#1A1206',
        border: '1px solid #6E5320',
        boxShadow: '0 6px 18px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,244,210,0.6), inset 0 -2px 0 rgba(74,54,18,0.35)',
        borderRadius: 999,
        fontFamily: SP.FONT_DISPLAY,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
    },

    btnSecondary: {
        background: glassFill,
        color: SP.GOLD_HI,
        border: `1px solid ${ETCH.mid}`,
        boxShadow: '0 6px 18px rgba(0,0,0,0.55)',
        borderRadius: 999,
        fontFamily: SP.FONT_DISPLAY,
        fontWeight: 500,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
    },

    btnOutline: {
        background: 'transparent',
        color: SP.STAR,
        border: `1px solid ${ETCH.mid}`,
        boxShadow: 'none',
        borderRadius: 999,
        fontFamily: SP.FONT_DISPLAY,
        fontWeight: 500,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
    },

    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: `1px solid ${ETCH.faint}`,
        background: SP.VOID_2,
        color: SP.STAR_DIM,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.18s ease',
        boxShadow: 'none',
    },

    iconBtnHover: {
        background: 'rgba(233,196,106,0.10)',
        color: SP.GOLD_HI,
        border: `1px solid ${ETCH.mid}`,
    },

    stickerLabel: {
        position: 'absolute',
        fontFamily: SP.FONT_MONO,
        fontWeight: 500,
        fontSize: 11,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        padding: '4px 12px',
        border: `1px solid ${ETCH.mid}`,
        boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
        color: SP.GOLD_HI,
        background: 'rgba(2,3,8,0.9)',
        borderRadius: 999,
    },
}
