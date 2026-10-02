// Barbie: "BARBIE LAND". A pink, sunny day on a painted movie set.
//
// Barbie Land is artificial and proud of it, and every surface here says so:
//
//   1. PAINTED SKY. The sky is a backdrop, painted flat: pool blue at the top,
//      pink through the middle, peach at the horizon. Clouds are cumulus in two
//      flat tones (white, and a lilac-pink shadow side), lit along their tops
//      by the sun. Nothing is photographic and nothing is blurred.
//   2. THE SUN. A painted disc with a retro two-tone sunburst. It is the theme's
//      one clock (components/barbie/sunshine.ts): it brightens with the room's
//      voices, and a glint of its light sweeps across every glossy surface at
//      the same instant, the way the light catches everything when the sun
//      comes out from behind a cloud.
//   3. PINK PLASTIC. The candy-bright gloss of the whole town: Barbie pink with
//      a white rim and one crisp specular, never a soft neon glow.
//   4. PALM SPRINGS. Breeze-block screens, awning scallops, boomerang curves
//      and a pool whose ripples are painted on in white.
//   5. GLITTER. Light is always a four-point twinkle.
//
// The SCALLOP is the structural signature (an awning valance, a cloud's puffs,
// the sun's rays): plates and tabs end in it, so nothing is a plain rectangle.
//
// Lettering is sign-painted: Shrikhand, a heavy retro italic, with a white
// outline and a deep pink extrusion underneath. Yellowtail is the brush script
// for the odd flourish; Poppins carries everything else.
//
// The stage tells one day: the painted town in the morning sun waiting for
// singers (idle), the next song rising like the sun (up next), and the
// performance lit by sunshine with every line written on a cloud (playing).
//
// Kept in sync with packages/shared/src/themes/barbie.ts.

import type React from 'react'
import type { Theme } from './theme'
import { BARBIE_TOKENS } from '@karaoke/shared'

// ── Palette ──────────────────────────────────────────────────────────────────
export const BARB = {
    // Pinks, deepest to palest
    PLUM: '#4B0A35', // ink
    PLUM_SOFT: '#7A2A5E',
    RASPBERRY: '#B0115E', // the extrusion under lettering
    PINK: '#E0218A', // Barbie pink
    HOT: '#FF3FA4',
    BUBBLE: '#FF5DB1',
    CANDY: '#FFA6D5',
    BLUSH: '#FFD3E8',
    SHELL: '#FFF0F7',
    WHITE: '#FFFFFF',
    MUTED: '#A0567F',
    // Sunshine
    SUN: '#FFD23F',
    SUN_HI: '#FFF1A8',
    SUN_CORE: '#FFFBE6',
    PEACH: '#FFB38A',
    CORAL: '#FF7A6B',
    // Painted sky, top to horizon
    SKY_TOP: '#8FD8F2',
    SKY_MID: '#C4E9F4',
    SKY_PINK: '#FFC6DF',
    SKY_PEACH: '#FFD9BC',
    // Clouds
    CLOUD: '#FFFFFF',
    CLOUD_SHADE: '#F3CBE6',
    CLOUD_DEEP: '#E3AEDB',
    // Pool
    POOL: '#4FCFE6',
    POOL_DEEP: '#1FA8CC',
    POOL_LINE: '#E9FBFF',
    // Distant mountains
    HILL_FAR: '#E6B6E0',
    HILL_NEAR: '#D497D2',
    LILAC: '#C9A7F0',
    AQUA: '#2FCFC0',
    FONT_DISPLAY: "'Shrikhand', 'Cooper Black', Georgia, serif",
    FONT_SCRIPT: "'Yellowtail', 'Brush Script MT', cursive",
    FONT_BODY: "'Poppins', 'Helvetica Neue', Arial, sans-serif",
} as const

// ── Textures ─────────────────────────────────────────────────────────────────
// Pre-rasterised SVG, used as plain image URLs so nothing re-runs a filter per
// frame.
const dataUri = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`
const svgUri = (svg: string): string => `url("${dataUri(svg)}")`

/** A Palm Springs breeze block: circles at the corners (they meet across
 *  blocks to make whole rings) and a diamond in the middle, pierced right
 *  through, so each hole shows its own shadow on the upper edge. */
export function breezeBlock(face: string, hole: string, shade: string, size = 64): string {
    const s = size
    const r = s * 0.34
    const c = s / 2
    const d = s * 0.27
    const corner = (x: number, y: number) => `<circle cx='${x}' cy='${y}' r='${r}' fill='${hole}'/>`
    return svgUri(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${s}' height='${s}'>` +
            `<rect width='${s}' height='${s}' fill='${face}'/>` +
            corner(0, 0) + corner(s, 0) + corner(0, s) + corner(s, s) +
            `<path d='M ${c} ${c - d} L ${c + d} ${c} L ${c} ${c + d} L ${c - d} ${c} Z' fill='${hole}'/>` +
            // the shadow each hole's top lip casts inside it
            `<path d='M ${c} ${c - d} L ${c + d} ${c} L ${c + d * 0.72} ${c + d * 0.08} L ${c} ${c - d * 0.62} L ${c - d * 0.72} ${c + d * 0.08} L ${c - d} ${c} Z' fill='${shade}'/>` +
            `<path d='M ${-r} ${s - r * 0.02} A ${r} ${r} 0 0 1 ${r} ${s - r * 0.02} L ${r * 0.86} ${s + r * 0.26} A ${r * 0.9} ${r * 0.9} 0 0 0 ${-r * 0.86} ${s + r * 0.26} Z' fill='${shade}'/>` +
            `<path d='M ${s - r} ${s - r * 0.02} A ${r} ${r} 0 0 1 ${s + r} ${s - r * 0.02} L ${s + r * 0.86} ${s + r * 0.26} A ${r * 0.9} ${r * 0.9} 0 0 0 ${s - r * 0.86} ${s + r * 0.26} Z' fill='${shade}'/>` +
            '</svg>',
    )
}

/** Gouache: the faint, uneven tooth of paint on a flat backdrop. */
const PAINT_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>" +
    "<filter id='f' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 -0.18'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#f)'/></svg>"

/** Long soft brush drag, for painted gradients that should not look digital. */
const BRUSH_SVG =
    "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'>" +
    "<filter id='f' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.002 0.04' numOctaves='3' seed='12' stitchTiles='stitch'/>" +
    "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 -0.42'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#f)'/></svg>"

export const BARB_TEX = { paint: dataUri(PAINT_SVG), brush: dataUri(BRUSH_SVG) }
export const BARB_PAINT = svgUri(PAINT_SVG)

// ── Lettering ────────────────────────────────────────────────────────────────

/** A ring of zero-blur text-shadows: a round-jointed outline (text-stroke
 *  mitres into spikes on Shrikhand's sharp terminals; a ring doesn't). */
export function ringShadow(color: string, r: number, n = 12, unit = 'em'): string {
    const out: string[] = []
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        out.push(`${(Math.cos(a) * r).toFixed(3)}${unit} ${(Math.sin(a) * r).toFixed(3)}${unit} 0 ${color}`)
    }
    return out.join(', ')
}

/**
 * Sign-painted 3D lettering: a fill, a white outline (a text-shadow ring) and
 * an extrusion. The extrusion is a chain of drop-shadow FILTERS, not more
 * text-shadows, because a filter shadows the already-outlined silhouette: the
 * outline gets extruded too, so the letters read as one solid cut-out.
 */
export function retroType(opts: {
    fill?: string
    outline?: string
    outlineW?: number
    depth?: number
    depthColor?: string
    steps?: number
    soft?: string | null
} = {}): React.CSSProperties {
    const {
        fill = BARB.PINK,
        outline = BARB.WHITE,
        outlineW = 0.055,
        depth = 0.1,
        depthColor = BARB.RASPBERRY,
        steps = 4,
        soft = 'rgba(122,16,78,0.35)',
    } = opts
    const step = depth / steps
    const chain = Array.from({ length: steps }, () => `drop-shadow(${(step * 0.42).toFixed(3)}em ${step.toFixed(3)}em 0 ${depthColor})`)
    if (soft) chain.push(`drop-shadow(0 ${(depth * 1.2).toFixed(3)}em ${(depth * 2.4).toFixed(3)}em ${soft})`)
    return {
        fontFamily: BARB.FONT_DISPLAY,
        fontWeight: 400,
        fontSynthesis: 'none',
        color: fill,
        textShadow: outlineW > 0 ? ringShadow(outline, outlineW) : 'none',
        filter: chain.join(' '),
    }
}

// ── Geometry ─────────────────────────────────────────────────────────────────

// ── Small helpers ────────────────────────────────────────────────────────────

/** Deterministic 0..1 from a string, for stable per-item variation. */
export function barbHash(key: string, salt = 0): number {
    let h = 2166136261 ^ salt
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return ((h >>> 0) % 100000) / 100000
}

// ── Global CSS ───────────────────────────────────────────────────────────────
// Stage-window only (see ThemeContext). The stage's structure and lyric
// treatment live in karaoke.css under BARBIE STAGE; this sheet carries what is
// keyed to data-theme: the faces and the universal font rules.
//
// NOTE: no backticks anywhere in this string (a stray one ends the template
// literal early and globalCss silently becomes NaN).
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Shrikhand&family=Yellowtail&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600;1,700&display=swap');

[data-theme="barbie"] * {
  font-family: ${BARB.FONT_BODY};
}
[data-theme="barbie"] h1,
[data-theme="barbie"] h2,
[data-theme="barbie"] h3 {
  font-family: ${BARB.FONT_DISPLAY};
  font-weight: 400;
  font-synthesis: none;
}

/* Lyrics are sign-painted Shrikhand. It ships ONE weight, so every weight
   change the base rules make (the sung syllable goes to 900) must be pinned
   back to 400, or the browser smears a fake bold over the letters. The
   descendant selector matters: the glyphs live in .k-syl__word, which the
   universal rule above matches directly. */
[data-theme="barbie"] .k-line,
[data-theme="barbie"] .k-line * {
  font-family: ${BARB.FONT_DISPLAY};
  font-weight: 400;
  font-synthesis: none;
  letter-spacing: 0.01em;
}

[data-theme="barbie"] .karaoke-stage {
  background: ${BARB.SKY_PINK};
}

[data-theme="barbie"] ::selection {
  background: ${BARB.BUBBLE};
  color: ${BARB.WHITE};
}
`

// ── Theme export ─────────────────────────────────────────────────────────────
const T = BARBIE_TOKENS

const pinkDrop = (y: number, blur: number, a: number) => `0 ${y}px ${blur}px rgba(176,17,94,${a})`
const gloss = 'inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(122,16,78,0.22)'

export const BARBIE: Theme = {
    ...T,
    globalCss: GLOBAL_CSS,
    fontDisplay: BARB.FONT_DISPLAY,
    fontBody: BARB.FONT_BODY,

    page: {
        background: 'transparent',
        color: BARB.PLUM,
        minHeight: '100%',
        padding: '32px 40px 64px',
        maxWidth: 1000,
        margin: '0 auto',
        fontFamily: BARB.FONT_BODY,
        position: 'relative',
        zIndex: 2,
    },

    card: {
        background: BARB.WHITE,
        border: `2px solid ${BARB.BLUSH}`,
        borderRadius: 22,
        boxShadow: `${pinkDrop(8, 22, 0.16)}, inset 0 -4px 0 ${BARB.SHELL}`,
        color: BARB.PLUM,
    },

    cardHover: {
        border: `2px solid ${BARB.BUBBLE}`,
        boxShadow: `${pinkDrop(14, 30, 0.24)}, inset 0 -4px 0 ${BARB.SHELL}`,
        transform: 'translateY(-2px)',
    },

    input: {
        background: BARB.WHITE,
        border: `2px solid ${BARB.CANDY}`,
        borderRadius: 999,
        color: BARB.PLUM,
        fontFamily: BARB.FONT_BODY,
        fontWeight: 500,
        outline: 'none',
        caretColor: BARB.PINK,
    },

    select: {
        background: BARB.WHITE,
        border: `2px solid ${BARB.CANDY}`,
        borderRadius: 14,
        color: BARB.PLUM,
        fontFamily: BARB.FONT_BODY,
        fontWeight: 600,
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none' as const,
    },

    // Primary is glossy Barbie-pink plastic with a white rim.
    btnPrimary: {
        background: `linear-gradient(180deg, ${BARB.BUBBLE} 0%, ${BARB.PINK} 58%, #C4127A 100%)`,
        color: BARB.WHITE,
        border: `2px solid ${BARB.WHITE}`,
        boxShadow: `${pinkDrop(6, 16, 0.3)}, ${gloss}`,
        borderRadius: 999,
        fontFamily: BARB.FONT_DISPLAY,
        fontWeight: 400,
        letterSpacing: '0.02em',
        textShadow: '0 2px 0 rgba(122,16,78,0.45)',
        cursor: 'pointer',
        transition: 'all 0.18s cubic-bezier(0.3, 1.6, 0.5, 1)',
    },

    // Secondary is sunshine.
    btnSecondary: {
        background: `linear-gradient(180deg, ${BARB.SUN_HI} 0%, ${BARB.SUN} 60%, #F2B21E 100%)`,
        color: BARB.PLUM,
        border: `2px solid ${BARB.WHITE}`,
        boxShadow: `${pinkDrop(6, 16, 0.24)}, inset 0 2px 0 rgba(255,255,255,0.7), inset 0 -3px 0 rgba(180,110,0,0.22)`,
        borderRadius: 999,
        fontFamily: BARB.FONT_DISPLAY,
        fontWeight: 400,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        transition: 'all 0.18s cubic-bezier(0.3, 1.6, 0.5, 1)',
    },

    btnOutline: {
        background: BARB.WHITE,
        color: BARB.PINK,
        border: `2px solid ${BARB.CANDY}`,
        borderRadius: 999,
        fontFamily: BARB.FONT_DISPLAY,
        fontWeight: 400,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
    },

    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `2px solid ${BARB.WHITE}`,
        background: `linear-gradient(180deg, ${BARB.WHITE}, ${BARB.SHELL})`,
        color: BARB.PINK,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `${pinkDrop(4, 12, 0.2)}, inset 0 -2px 0 ${BARB.BLUSH}`,
        transition: 'all 0.18s cubic-bezier(0.3, 1.6, 0.5, 1)',
    },

    iconBtnHover: {
        background: `linear-gradient(180deg, ${BARB.SUN_HI}, ${BARB.SUN})`,
        color: BARB.PLUM,
        transform: 'translateY(-2px) scale(1.04)',
        boxShadow: `${pinkDrop(8, 18, 0.26)}, inset 0 -2px 0 rgba(180,110,0,0.2)`,
    },

    stickerLabel: {
        position: 'absolute',
        fontFamily: BARB.FONT_DISPLAY,
        fontWeight: 400,
        fontSize: 13,
        letterSpacing: '0.02em',
        padding: '4px 14px',
        color: BARB.WHITE,
        background: BARB.PINK,
        border: `2px solid ${BARB.WHITE}`,
        borderRadius: 999,
        boxShadow: pinkDrop(4, 12, 0.3),
    },
}
