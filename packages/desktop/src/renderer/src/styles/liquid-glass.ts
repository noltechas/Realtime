// Liquid Glass: a stage made of glass, after Apple's Liquid Glass design.
//
// Everything that isn't content is GLASS floating over it: panes that bend
// the light at their rims (real refraction through an SVG displacement map,
// not just a blur, see components/glass/), split colour faintly at the edge,
// catch the light on a hairline rim, and move like liquid: springs, stretch,
// morphing capsules. Under the glass the song's own colours flow as a mesh
// gradient wallpaper (or its music video plays).
//
// The lyric idea: the line being sung sits on a capsule of glass that slides
// and reshapes to each new line, and a droplet of glass glides under it word
// by word, behind the word being sung, tinted in the singer's colour and
// stretching as it moves.
//
// Type is the system face (San Francisco on the Mac that runs the stage).
//
// Kept in sync with packages/shared/src/themes/liquid-glass.ts.

import type { CSSProperties } from 'react'
import type { Theme } from './theme'
import { LIQUID_GLASS_TOKENS } from '@karaoke/shared'

export const LG = {
    FONT: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', 'Helvetica Neue', Arial, sans-serif",
    WHITE: '#FFFFFF',
    SOFT: 'rgba(255,255,255,0.72)',
    FAINT: 'rgba(255,255,255,0.46)',
    INK: '#0B0D18',
    BLUE: '#2E7BFF',
    digits: { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif", fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em' } as CSSProperties,
} as const

/** San Francisco at a weight, white unless told otherwise. */
export function sf(size: number, weight = 600, color: string = LG.WHITE, extra?: CSSProperties): CSSProperties {
    return { fontFamily: LG.FONT, fontWeight: weight, fontSize: size, color, letterSpacing: size >= 40 ? '-0.022em' : size >= 20 ? '-0.012em' : '0', lineHeight: 1.1, ...extra }
}

// ── Global CSS ───────────────────────────────────────────────────────────────
// Stage-window only (see ThemeContext). The lyric treatment lives in
// karaoke.css under LIQUID GLASS STAGE.
//
// NOTE: no backticks anywhere in this string (a stray one ends the template
// literal early and globalCss silently becomes NaN).
const GLOBAL_CSS = `
[data-theme="liquid-glass"] * {
  font-family: ${LG.FONT};
}
[data-theme="liquid-glass"] .k-line,
[data-theme="liquid-glass"] .k-line * {
  font-family: ${LG.FONT};
  font-weight: 700;
  letter-spacing: -0.018em;
}
[data-theme="liquid-glass"] .karaoke-stage {
  background: #0B1240;
}
[data-theme="liquid-glass"] ::selection {
  background: rgba(46,123,255,0.4);
  color: #fff;
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
const T = LIQUID_GLASS_TOKENS
const glass = 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)'
const rim = 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 1px rgba(255,255,255,0.12), 0 10px 30px rgba(0,0,0,0.25)'

export const LIQUID_GLASS: Theme = {
    ...T,
    globalCss: GLOBAL_CSS,
    fontDisplay: LG.FONT,
    fontBody: LG.FONT,

    page: {
        background: 'transparent',
        color: LG.WHITE,
        minHeight: '100%',
        padding: '32px 40px 64px',
        maxWidth: 1040,
        margin: '0 auto',
        fontFamily: LG.FONT,
        position: 'relative',
        zIndex: 2,
    },

    card: {
        background: glass,
        backdropFilter: 'blur(24px) saturate(1.6)',
        border: 'none',
        borderRadius: 26,
        boxShadow: rim,
        color: LG.WHITE,
    },

    cardHover: {
        background: 'linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.1) 100%)',
        transform: 'translateY(-1px)',
    },

    input: {
        background: 'rgba(255,255,255,0.12)',
        border: 'none',
        borderRadius: 999,
        color: LG.WHITE,
        fontFamily: LG.FONT,
        outline: 'none',
        caretColor: LG.BLUE,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
    },

    select: {
        background: 'rgba(255,255,255,0.12)',
        border: 'none',
        borderRadius: 999,
        color: LG.WHITE,
        fontFamily: LG.FONT,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none' as const,
    },

    // Tinted glass: the prominent action.
    btnPrimary: {
        background: 'linear-gradient(180deg, rgba(64,140,255,0.9) 0%, rgba(30,104,240,0.86) 100%)',
        color: LG.WHITE,
        border: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 22px rgba(30,104,240,0.35)',
        borderRadius: 999,
        fontFamily: LG.FONT,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },

    btnSecondary: {
        background: glass,
        color: LG.WHITE,
        border: 'none',
        boxShadow: rim,
        borderRadius: 999,
        fontFamily: LG.FONT,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },

    btnOutline: {
        background: 'transparent',
        color: LG.WHITE,
        border: '1px solid rgba(255,255,255,0.35)',
        boxShadow: 'none',
        borderRadius: 999,
        fontFamily: LG.FONT,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },

    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: 'none',
        background: glass,
        color: LG.WHITE,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        boxShadow: rim,
    },

    iconBtnHover: {
        background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.14) 100%)',
        color: LG.WHITE,
    },

    stickerLabel: {
        position: 'absolute',
        fontFamily: LG.FONT,
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: '0.01em',
        padding: '6px 14px',
        border: 'none',
        boxShadow: rim,
        color: LG.WHITE,
        background: glass,
        backdropFilter: 'blur(20px) saturate(1.6)',
        borderRadius: 999,
    },
}
