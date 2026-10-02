// Steampunk: "THE VOX ENGINE". A brass steam engine that runs on your voice.
//
// The stage is one great machine in a Victorian engine house: brass and copper
// gears that genuinely mesh, a pressure gauge, a station clock, copper pipes
// venting steam, riveted plates and a porthole, tall arched windows with
// airships drifting past. It is DRIVEN BY THE SINGERS: the louder the room
// sings, the faster the gears turn, the higher the gauge needles climb, and a
// held, belted note blows off steam (components/steampunk/engine.ts).
//
// Every metal part is a rendered sprite (packages/mobile/scripts/generate-
// steampunk-assets.py): height maps lit as real brass, copper and steel with
// bevels, polished wear, grime and verdigris. Flat vector gears and faint
// outlines were what made earlier versions look cheap.
//
// The lyric idea: the active line is cast on an ENGINE NAMEPLATE (deep green
// Victorian enamel in a riveted brass frame). Its letters are cold until sung;
// each syllable then glows hot in its singer's colour, and the engine CHUFFS:
// a little puff of steam rises from the word, like a locomotive taking a beat.
//
// Type: Abril Fatface (the fat face of every Victorian playbill and
// nameplate) for display, numerals and lyrics; Old Standard TT (a
// nineteenth-century book face) for reading and engraved capitals.
//
// Kept in sync with packages/shared/src/themes/steampunk.ts.

import type { Theme } from './theme'
import { STEAMPUNK_TOKENS } from '@karaoke/shared'
import frameBrass from '../assets/steampunk/frame-brass.png'
import steam0 from '../assets/steampunk/steam-0.png'
import rivet from '../assets/steampunk/rivet.png'

// ── Palette ──────────────────────────────────────────────────────────────────
export const ST = {
    HOUSE: '#120D0A',
    HOUSE_2: '#1A1410',
    ENAMEL: '#16231D',
    ENAMEL_HI: '#22352C',
    ENAMEL_LO: '#0C1511',
    BRASS_LO: '#4A3312',
    BRASS_DEEP: '#7E5A22',
    BRASS: '#C9A15A',
    BRASS_HI: '#E9C77F',
    BRASS_SHEEN: '#FFF0C8',
    COPPER: '#B4643A',
    VERDIGRIS: '#5FA08A',
    LAMP: '#F6C66B',
    PARCHMENT: '#F1E4C6',
    PARCHMENT_DIM: '#A8977A',
    INK: '#2A1B0E',
    RED: '#C9452F',
    FONT_DISPLAY: "'Abril Fatface', 'Didot', 'Bodoni 72', Georgia, serif",
    FONT_BODY: "'Old Standard TT', 'Iowan Old Style', Georgia, serif",
} as const

/** Deterministic 0..1 from a string, for stable per-item variation. */
export function stHash(key: string, salt = 0): number {
    let h = 2166136261 ^ salt
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return ((h >>> 0) % 100000) / 100000
}

// ── Global CSS ───────────────────────────────────────────────────────────────
// Stage-window only (see ThemeContext). The stage's structure and lyric
// treatment live in karaoke.css under VOX ENGINE STAGE.
//
// NOTE: no backticks anywhere in this string (a stray one ends the template
// literal early and globalCss silently becomes NaN).
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap');

[data-theme="steampunk"] * {
  font-family: ${ST.FONT_BODY};
}
[data-theme="steampunk"] h1,
[data-theme="steampunk"] h2,
[data-theme="steampunk"] h3 {
  font-family: ${ST.FONT_DISPLAY};
  font-weight: 400;
  letter-spacing: 0.01em;
}

/* Lyrics are cast in the fat face. The descendant selector matters: the
   glyphs live in .k-syl__word, which the universal rule above matches
   directly. Abril Fatface has one weight, so no synthesised bold (the base
   .k-syl--now asks for 900). */
[data-theme="steampunk"] .k-line,
[data-theme="steampunk"] .k-line * {
  font-family: ${ST.FONT_DISPLAY};
  font-weight: 400;
  font-synthesis: none;
  letter-spacing: 0.012em;
}

[data-theme="steampunk"] .karaoke-stage {
  background: ${ST.HOUSE};
}

/* Rendered parts karaoke.css needs (it can't import assets). */
:root {
  --st-frame: url("${frameBrass}");
  --st-steam: url("${steam0}");
  --st-rivet: url("${rivet}");
}

[data-theme="steampunk"] ::selection {
  background: rgba(226,165,75,0.4);
  color: ${ST.PARCHMENT};
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
const T = STEAMPUNK_TOKENS

// Deep green engine enamel, with the soft sheen of a varnished panel.
const enamelFill = `linear-gradient(180deg, ${ST.ENAMEL_HI} 0%, ${ST.ENAMEL} 45%, ${ST.ENAMEL_LO} 100%)`
// Polished brass plate lit from above.
const brassFill = `linear-gradient(180deg, ${ST.BRASS_SHEEN} 0%, ${ST.BRASS_HI} 16%, ${ST.BRASS} 50%, ${ST.BRASS_DEEP} 86%, #9C7531 100%)`

export const STEAMPUNK: Theme = {
    ...T,
    globalCss: GLOBAL_CSS,
    fontDisplay: ST.FONT_DISPLAY,
    fontBody: ST.FONT_BODY,

    page: {
        background: 'transparent',
        color: ST.PARCHMENT,
        minHeight: '100%',
        padding: '32px 40px 64px',
        maxWidth: 1040,
        margin: '0 auto',
        fontFamily: ST.FONT_BODY,
        position: 'relative',
        zIndex: 2,
    },

    // A riveted enamel panel: deep green, a brass edge, a brass hairline inside.
    card: {
        background: enamelFill,
        border: `2px solid ${ST.BRASS_DEEP}`,
        borderRadius: 6,
        boxShadow: `0 10px 26px rgba(0,0,0,0.62), inset 0 0 0 1px rgba(233,199,127,0.28), inset 0 1px 0 rgba(255,236,200,0.12)`,
        color: ST.PARCHMENT,
    },

    cardHover: {
        border: `2px solid ${ST.BRASS}`,
        boxShadow: `0 14px 32px rgba(0,0,0,0.72), inset 0 0 0 1px rgba(233,199,127,0.4), inset 0 1px 0 rgba(255,236,200,0.16)`,
        transform: 'translateY(-1px)',
    },

    input: {
        background: '#0D0A08',
        border: `1px solid ${ST.BRASS_DEEP}`,
        borderRadius: 4,
        color: ST.PARCHMENT,
        fontFamily: ST.FONT_BODY,
        outline: 'none',
        caretColor: ST.LAMP,
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.7)',
    },

    select: {
        background: '#0D0A08',
        border: `1px solid ${ST.BRASS_DEEP}`,
        borderRadius: 4,
        color: ST.PARCHMENT,
        fontFamily: ST.FONT_BODY,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none' as const,
    },

    // A polished brass plate, its legend engraved and filled with black wax.
    btnPrimary: {
        background: brassFill,
        color: '#2A1B08',
        border: `1px solid ${ST.BRASS_LO}`,
        boxShadow: '0 6px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,246,220,0.75), inset 0 -2px 0 rgba(74,51,18,0.4)',
        borderRadius: 4,
        fontFamily: ST.FONT_BODY,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        textShadow: '0 1px 0 rgba(255,240,205,0.55)',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
    },

    // An enamel plate in a brass bezel.
    btnSecondary: {
        background: enamelFill,
        color: ST.LAMP,
        border: `1px solid ${ST.BRASS}`,
        boxShadow: '0 6px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,236,200,0.12)',
        borderRadius: 4,
        fontFamily: ST.FONT_BODY,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
    },

    btnOutline: {
        background: 'transparent',
        color: ST.PARCHMENT,
        border: `1px solid ${ST.BRASS_DEEP}`,
        boxShadow: 'none',
        borderRadius: 4,
        fontFamily: ST.FONT_BODY,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
    },

    iconBtn: {
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: `1px solid ${ST.BRASS_LO}`,
        background: `radial-gradient(circle at 38% 32%, ${ST.BRASS_SHEEN} 0%, ${ST.BRASS_HI} 22%, ${ST.BRASS} 55%, ${ST.BRASS_DEEP} 100%)`,
        color: '#2A1B08',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.18s ease',
        boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
    },

    iconBtnHover: {
        background: `radial-gradient(circle at 38% 32%, #FFFFFF 0%, ${ST.BRASS_SHEEN} 22%, ${ST.BRASS_HI} 55%, ${ST.BRASS} 100%)`,
        color: '#1A1006',
        border: `1px solid ${ST.BRASS_DEEP}`,
    },

    // A small brass tag, its legend engraved.
    stickerLabel: {
        position: 'absolute',
        fontFamily: ST.FONT_BODY,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        padding: '4px 12px',
        border: `1px solid ${ST.BRASS_LO}`,
        boxShadow: '0 3px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,246,220,0.6)',
        color: '#2A1B08',
        background: brassFill,
        borderRadius: 3,
    },
}
