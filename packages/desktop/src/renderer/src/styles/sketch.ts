// Sketch: "FOLLOW THE BOUNCING BALL". An animator's pencil test on a light
// table.
//
// The stage is a sheet of animation bond pinned on the pegbar and lit from
// underneath. A ball drawn in graphite (its colour worked in with the singer's
// coloured pencil) bounces from syllable to syllable over the lyrics, exactly
// the way the old bouncing-ball sing-along cartoons did, its onion skins and
// spacing chart drawn in blue pencil behind it. Lines still to come are
// blue-pencil roughs on lettering guidelines; each word is inked the moment
// the ball lands on it, and underlined in the singer's colour while it's sung.
// A music video plays UNDER the sheet, the way an animator traces live action
// on a light table (rotoscoping).
//
// Every mark is a drawn sprite (packages/mobile/scripts/generate-sketch-
// assets.py): pencil strokes with pressure, wobble and paper tooth, a steel
// pegbar, real pencils, masking tape. The blob radii and SVG wobble filter of
// the earlier version were what made it look generic.
//
// Type: Shantell Sans (an artist's marker hand: legible across a room) for
// lyrics and lettering; Just Another Hand for the animator's pencil notes.
//
// Kept in sync with packages/shared/src/themes/sketch.ts.

import type { Theme } from './theme'
import { SKETCH_TOKENS } from '@karaoke/shared'
import grain from '../assets/sketch/grain.png'
import under0 from '../assets/sketch/under-0.png'
import under1 from '../assets/sketch/under-1.png'
import paper from '../assets/sketch/paper.jpg'

// ── Palette ──────────────────────────────────────────────────────────────────
export const SK = {
    PAPER: '#EFEBE2',
    PAPER_HI: '#F7F4EC',
    PAPER_LO: '#E2DDD1',
    SHEET: '#FAF8F2',
    INK: '#1C1B1F',
    GRAPHITE: '#3C3C41',
    GRAPHITE_SOFT: '#76757A',
    BLUE: '#4F8FD0',
    BLUE_PALE: '#9DC1E6',
    RED: '#CF4540',
    FORM: '#4F8A84',
    LACQUER: '#F2B51E',
    DESK: '#2E3331',
    FONT_LETTER: "'Shantell Sans', 'Chalkboard SE', 'Comic Neue', cursive",
    FONT_NOTE: "'Just Another Hand', 'Shantell Sans', cursive",
} as const

/** Deterministic 0..1 from a string, for stable per-item variation. */
export function skHash(key: string, salt = 0): number {
    let h = 2166136261 ^ salt
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return ((h >>> 0) % 100000) / 100000
}

// ── Global CSS ───────────────────────────────────────────────────────────────
// Stage-window only (see ThemeContext). The stage's lyric treatment lives in
// karaoke.css under PENCIL TEST STAGE.
//
// NOTE: no backticks anywhere in this string (a stray one ends the template
// literal early and globalCss silently becomes NaN).
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Shantell+Sans:ital,wght@0,400;0,500;0,700;0,800;1,500&family=Just+Another+Hand&display=swap');

[data-theme="sketch"] * {
  font-family: ${SK.FONT_LETTER};
}

/* The lyrics are lettered by hand. The descendant selector matters: the
   glyphs live in .k-syl__word, which the universal rule above matches. */
[data-theme="sketch"] .k-line,
[data-theme="sketch"] .k-line * {
  font-family: ${SK.FONT_LETTER};
  font-weight: 800;
  letter-spacing: 0.005em;
}

[data-theme="sketch"] .karaoke-stage {
  background: ${SK.PAPER} url("${paper}") center / cover no-repeat;
}

/* Drawn parts karaoke.css needs (it can't import assets). */
:root {
  --sk-grain: url("${grain}");
  --sk-underline-0: url("${under0}");
  --sk-underline-1: url("${under1}");
}

[data-theme="sketch"] ::selection {
  background: rgba(90,155,216,0.3);
  color: ${SK.INK};
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
const T = SKETCH_TOKENS

const sheet = `linear-gradient(180deg, ${SK.SHEET} 0%, #F5F2EA 100%)`

export const SKETCH: Theme = {
    ...T,
    // The desktop ring and picker keep their own order and label.
    nextThemeName: 'urban',
    displayName: 'Hand-Drawn',
    globalCss: GLOBAL_CSS,
    fontDisplay: SK.FONT_LETTER,
    fontBody: SK.FONT_LETTER,

    page: {
        background: 'transparent',
        color: SK.INK,
        minHeight: '100%',
        padding: '32px 40px 64px',
        maxWidth: 1040,
        margin: '0 auto',
        fontFamily: SK.FONT_LETTER,
        position: 'relative',
        zIndex: 2,
    },

    // A fresh sheet laid on the desk.
    card: {
        background: sheet,
        border: '1px solid rgba(28,27,31,0.16)',
        borderRadius: 2,
        boxShadow: '0 1px 1px rgba(40,34,24,0.12), 0 6px 16px rgba(40,34,24,0.12)',
        color: SK.INK,
    },

    cardHover: {
        boxShadow: '0 1px 1px rgba(40,34,24,0.14), 0 10px 22px rgba(40,34,24,0.18)',
        transform: 'translateY(-1px)',
    },

    input: {
        background: SK.SHEET,
        border: 'none',
        borderBottom: `2px solid ${SK.GRAPHITE}`,
        borderRadius: 0,
        color: SK.INK,
        fontFamily: SK.FONT_LETTER,
        outline: 'none',
        caretColor: SK.BLUE,
    },

    select: {
        background: SK.SHEET,
        border: `1px solid rgba(28,27,31,0.35)`,
        borderRadius: 2,
        color: SK.INK,
        fontFamily: SK.FONT_LETTER,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none' as const,
    },

    // A strip of masking tape with the legend inked on it.
    btnPrimary: {
        background: 'linear-gradient(180deg, #EDE5CD 0%, #E3D9BC 100%)',
        color: SK.INK,
        border: 'none',
        boxShadow: '0 1px 2px rgba(40,34,24,0.25)',
        borderRadius: 1,
        fontFamily: SK.FONT_LETTER,
        fontWeight: 700,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },

    btnSecondary: {
        background: 'transparent',
        color: SK.INK,
        border: `2px solid ${SK.GRAPHITE}`,
        boxShadow: 'none',
        borderRadius: 2,
        fontFamily: SK.FONT_LETTER,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },

    btnOutline: {
        background: 'transparent',
        color: SK.GRAPHITE,
        border: `1px solid rgba(28,27,31,0.4)`,
        boxShadow: 'none',
        borderRadius: 2,
        fontFamily: SK.FONT_LETTER,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },

    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: `2px solid ${SK.GRAPHITE}`,
        background: SK.SHEET,
        color: SK.INK,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        boxShadow: 'none',
    },

    iconBtnHover: {
        background: '#FFFFFF',
        color: SK.BLUE,
        border: `2px solid ${SK.BLUE}`,
    },

    // A scrap of masking tape, pencilled on.
    stickerLabel: {
        position: 'absolute',
        fontFamily: SK.FONT_NOTE,
        fontWeight: 400,
        fontSize: 18,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '2px 12px',
        border: 'none',
        boxShadow: '0 1px 2px rgba(40,34,24,0.25)',
        color: SK.INK,
        background: 'rgba(233,225,200,0.92)',
        borderRadius: 1,
    },
}
