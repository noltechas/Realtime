import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useApp, useGuestsMap, singerFxKey, NEON_COLORS } from '../context/AppContext'
import type { MicSlotConfig, Singer, VoiceEffects } from '../context/AppContext'
import { useTheme, THEMES } from '../context/ThemeContext'
import type { Theme } from '../styles/theme'
import { AwardsRevealAnimation } from '../awards/AwardsRevealAnimation'
import { HiddenSongStagePanel, HiddenSongStageHeading } from '../components/HiddenSongCard'
import TomatoSplatterLayer, { TOMATO_EMOJI } from '../components/TomatoSplatterLayer'
import FlowerLayer, { FLOWER_EMOJI } from '../components/FlowerLayer'
import { SpaceOutboard } from '../components/SpaceOutboard'
import { LiquidLight } from '../components/LiquidLight'
import { PSY, psyPoured, psyStroke } from '../styles/psychedelic'

import { VoiceEffectsEngine } from '../audio/VoiceEffectsEngine'
import OSCARS_MUSIC_URL from '../assets/oscars.mp3'

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/
    ]
    for (const p of patterns) {
        const m = url.match(p)
        if (m) return m[1]
    }
    return null
}

// Viewport-relative font size for stage text. The mid value scales with the
// rendering surface so AirPlay to a TV (which gets a larger virtual display)
// keeps text proportional, not visually shrunken. Floor/ceiling guard against
// extreme window sizes. `px` is the laptop-reference size at ~900px viewport.
const stageFont = (px: number): string => {
    const min = Math.round(px * 0.82)
    const mid = +((px / 9).toFixed(2))
    const max = Math.round(px * 2.2)
    return `clamp(${min}px, ${mid}vh, ${max}px)`
}

// ── Neo-Brutal stage vocabulary ─────────────────────────────────────────────
// The neo-brutal stage is a printed gig poster: flat cream sheets, ink borders,
// hard offset shadows, and vivid color plates. These helpers keep every lyric
// combination readable no matter which singer colors get mixed on one line.
const NB_INK = '#1A1A1A'
const NB_CREAM = '#FFF8EE'

// Relative luminance of a hex color (0..1) for text-contrast decisions.
function nbLuminance(hex: string): number {
    const m = (hex || '').replace('#', '')
    if (m.length < 6) return 0.5
    const [r, g, b] = [0, 2, 4].map((i) => {
        const c = parseInt(m.slice(i, i + 2), 16) / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Ink text on bright plates, cream text on dark ones. For mixed multi-singer
// plates, ink wins unless EVERY band is dark (big bold lyric text keeps
// contrast on mid-tone colors either way).
const nbTextOn = (colors: string[]): string =>
    colors.length > 0 && colors.every((c) => nbLuminance(c) < 0.22) ? NB_CREAM : '#141414'

// Hard-edged split background for shared lines: one crisp band per singer,
// separated by thin ink seams. Neo-brutal doesn't blend colors — it butts
// panels against each other.
function nbSplitBackground(colors: string[]): string {
    const uniq = colors.filter((c, i) => c && colors.indexOf(c) === i)
    if (uniq.length <= 1) return uniq[0] || NB_INK
    const seam = '0.09em'
    const stops: string[] = []
    uniq.forEach((c, i) => {
        const a = (i / uniq.length) * 100
        const b = ((i + 1) / uniq.length) * 100
        const from = i === 0 ? `${a}%` : `calc(${a}% + ${seam})`
        const to = i === uniq.length - 1 ? `${b}%` : `calc(${b}% - ${seam})`
        stops.push(`${c} ${from} ${to}`)
        if (i < uniq.length - 1) stops.push(`${NB_INK} calc(${b}% - ${seam}) calc(${b}% + ${seam})`)
    })
    return `linear-gradient(100deg, ${stops.join(', ')})`
}

// Shrink display type as the text gets longer so any title length sits on one
// clean plate (still viewport-relative via stageFont).
const nbFitFont = (base: number, text: string, min = 24): string =>
    stageFont(Math.max(min, Math.round(base - Math.max(0, (text || '').length - 14) * 0.9)))

// Chunky three-bar equalizer (pure CSS animation, inherits currentColor).
function NbEq({ color, fontSize }: { color: string; fontSize: string | number }) {
    return (
        <span className="nb-eq" style={{ color, fontSize }}>
            <span /><span /><span />
        </span>
    )
}

// Ink music-note icon (no emoji on stage chrome — inline SVG only).
function NbNote({ size = 26, color = NB_INK }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M9 18.5a2.6 2.6 0 1 1-1.6-2.4V6.2a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 1.24.97v11.3a2.6 2.6 0 1 1-1.6-2.4V7.28l-6.8 1.7v9.52Z" fill={color} />
        </svg>
    )
}

// ── Psychedelic stage vocabulary ────────────────────────────────────────────
// The psychedelic stage is a printed handbill laid over real liquid-light footage:
// plates of the projector's own footage, ink keylines, and cream type stroked in ink. It
// shares its whole palette with the mobile app (see PSY in styles/psychedelic.ts) so the
// phone in a guest's hand and the screen on the wall are the same design.
//
// The neo-brutal helpers above already solve the one hard problem this idiom has —
// choosing ink or cream type for an arbitrary singer colour, and butting several
// singer colours into one plate without blending — so they are reused verbatim rather
// than reimplemented (`nbTextOn`, `nbSplitBackground`, `nbLuminance`).

/** A poster plate: opaque dye, ink keyline, poured corners. */
function psyPlate(dye: string, seed = 0, base = 22): React.CSSProperties {
    return {
        background: dye,
        border: `${PSY.LINE}px solid ${PSY.INK}`,
        borderRadius: psyPoured(seed, base),
        boxShadow: '0 14px 40px rgba(0,0,0,0.55)',
    }
}

// Print-registration crop mark (corner L), rotated per corner.
function NbCropMark({ style, rotate = 0 }: { style: React.CSSProperties; rotate?: number }) {
    return (
        <svg width="26" height="26" viewBox="0 0 26 26" style={{ position: 'absolute', opacity: 0.45, transform: `rotate(${rotate}deg)`, ...style }}>
            <path d="M2 25 V2 H25" stroke={NB_INK} strokeWidth="3" fill="none" />
        </svg>
    )
}

// Full-bleed cream poster sheet behind the Up Next lockup — portaled to <body>
// so it paints between the blurred album backdrop (z 0) and the lyric/chrome
// layers (z 10/20), same trick as the tropical beach backdrop.
function NeoBrutalPosterBackdrop({ showVideo = false }: { showVideo?: boolean }) {
    const blocks: Array<React.CSSProperties & { rot: number; dur: number }> = [
        { top: '9%', left: '4%', width: 110, height: 110, background: '#FFD60A', rot: -9, dur: 7 },
        { top: '15%', right: '6%', width: 84, height: 84, background: '#B388FF', rot: 11, dur: 8.5 },
        { bottom: '18%', left: '8%', width: 70, height: 70, background: '#00E676', rot: 6, dur: 9.5 },
        { bottom: '24%', right: '9%', width: 96, height: 96, background: '#FF3B30', rot: -7, dur: 8 },
    ]
    // When a music video plays behind the lockup, drop the opaque cream sheet
    // and the full-bleed print texture so the clip shows through; keep the
    // floating ink-bordered color blocks — they read great over video.
    const sheet = (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden', background: showVideo ? 'transparent' : NB_CREAM }}>
            {!showVideo && <div className="nb-print-grid" style={{ position: 'absolute', inset: 0 }} />}
            {!showVideo && <div className="nb-dots" style={{ position: 'absolute', top: -110, right: -80, width: 460, height: 460, transform: 'rotate(10deg)' }} />}
            {!showVideo && <div className="nb-dots" style={{ position: 'absolute', bottom: -130, left: -90, width: 520, height: 520, transform: 'rotate(-7deg)' }} />}
            {blocks.map(({ rot, dur, ...pos }, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        border: `3px solid ${NB_INK}`,
                        boxShadow: `6px 6px 0 ${NB_INK}`,
                        ['--nb-rot' as string]: `${rot}deg`,
                        animation: `nb-float ${dur}s ease-in-out ${i * 0.7}s infinite`,
                        ...pos,
                    }}
                />
            ))}
        </div>
    )
    return createPortal(sheet, document.body)
}

// ── Neo-Brutal "Up Next" stage screen ───────────────────────────────────────
// A printed gig poster: cream print sheet behind, a slammed-in ink "UP NEXT"
// plate on a yellow offset block, the album art mounted on a rotated violet
// panel with a note sticker, the title on a white plate with a marker
// highlight (auto-sized to any length), and one color-flagged ticket per
// singer, all rising in with a stagger.
function NeoBrutalUpNext({
    theme,
    art,
    track,
    singers,
    np,
    roles,
    guestsMap,
    showVideo = false,
}: {
    theme: any
    art: string | null
    track: any
    singers: any[]
    np: any
    roles: string[]
    guestsMap: Map<string, any>
    showVideo?: boolean
}) {
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000)
              .toString()
              .padStart(2, '0')}`
        : ''
    const title = np?.isHidden ? 'SECRET SONG' : track?.name || ''
    return (
        <div style={{ width: '100%', maxWidth: 1160, margin: '0 auto', padding: '0 48px', position: 'relative' }}>
            <NeoBrutalPosterBackdrop showVideo={showVideo} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
                {/* UP NEXT plate on a yellow offset block */}
                <div style={{ position: 'relative', ['--nb-rot' as string]: '-2deg', animation: 'nb-slam 0.5s var(--ease-bounce) both' }}>
                    <div style={{ position: 'absolute', inset: 0, transform: 'translate(9px, 9px)', background: '#FFD60A', border: `3px solid ${NB_INK}` }} />
                    <div style={{ position: 'relative', background: NB_INK, padding: '10px 34px 12px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <NbEq color="#FFD60A" fontSize={stageFont(20)} />
                        <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(28), letterSpacing: '0.26em', color: NB_CREAM }}>
                            UP NEXT
                        </span>
                    </div>
                </div>

                {/* Album art on a rotated violet offset panel */}
                {np?.isHidden ? (
                    <div className="nb-rise" style={{ animationDelay: '0.08s', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, transform: 'translate(12px, 12px) rotate(1.6deg)', background: '#B388FF', border: `3px solid ${NB_INK}` }} />
                        <div
                            className="nb-dots"
                            style={{
                                position: 'relative', width: 312, height: 312, background: NB_INK,
                                border: `4px solid ${NB_INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(130), color: '#FFD60A' }}>?</span>
                        </div>
                    </div>
                ) : art ? (
                    <div className="nb-rise" style={{ animationDelay: '0.08s', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, transform: 'translate(12px, 12px) rotate(1.6deg)', background: '#B388FF', border: `3px solid ${NB_INK}` }} />
                        <div style={{ position: 'relative', padding: 10, background: '#FFFFFF', border: `4px solid ${NB_INK}` }}>
                            <img src={art} alt="" style={{ width: 292, height: 292, display: 'block', objectFit: 'cover', border: `3px solid ${NB_INK}` }} />
                        </div>
                        <div
                            style={{
                                position: 'absolute', top: -22, right: -24, width: 62, height: 62,
                                background: '#FFD60A', border: `3px solid ${NB_INK}`, boxShadow: `4px 4px 0 ${NB_INK}`,
                                transform: 'rotate(10deg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <NbNote size={32} />
                        </div>
                    </div>
                ) : null}

                {/* Title plate with singer tickets */}
                <div className="nb-rise" style={{ animationDelay: '0.16s', position: 'relative', maxWidth: 920 }}>
                    <div style={{ position: 'absolute', inset: 0, transform: 'translate(10px, 10px)', background: NB_INK }} />
                    <div style={{ position: 'relative', background: '#FFFFFF', border: `4px solid ${NB_INK}`, padding: '28px 48px 30px', textAlign: 'center' }}>
                        <div
                            style={{
                                position: 'absolute', top: -15, left: 26, background: '#00E676',
                                border: `3px solid ${NB_INK}`, boxShadow: `3px 3px 0 ${NB_INK}`, padding: '2px 12px',
                                fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 12, letterSpacing: '0.22em', color: NB_INK,
                            }}
                        >
                            READY
                        </div>
                        <h1 style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: nbFitFont(46, title), lineHeight: 1.12, color: NB_INK, margin: 0, letterSpacing: '-0.01em' }}>
                            <span
                                style={{
                                    background: 'linear-gradient(transparent 60%, rgba(255,214,10,0.9) 60%, rgba(255,214,10,0.9) 94%, transparent 94%)',
                                    WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone', padding: '0 0.14em',
                                } as React.CSSProperties}
                            >
                                {title}
                            </span>
                        </h1>
                        {!np?.isHidden && (
                            <p
                                style={{
                                    fontFamily: theme.fontBody, fontWeight: 700, fontSize: stageFont(16), color: '#555555',
                                    margin: '12px 0 0', textTransform: 'uppercase', letterSpacing: '0.12em',
                                }}
                            >
                                {track.artists.map((a: any) => a.name).join(', ')}
                                {dur ? `  /  ${dur}` : ''}
                            </p>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 24 }}>
                            {singers.map((s: any, idx: number) => {
                                const roleStr =
                                    !np?.isHidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                        ? s.roleIndices.map((ri: number) => roles[ri]).filter(Boolean).join(' & ')
                                        : ''
                                const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                                const nm = g?.name ?? s.name
                                const pic = g?.profile_picture ?? null
                                const rot = idx % 2 === 0 ? -1.2 : 1.2
                                return (
                                    <div
                                        key={s.id}
                                        className="nb-rise"
                                        style={{
                                            animationDelay: `${0.26 + idx * 0.07}s`,
                                            ['--nb-rot' as string]: `${rot}deg`,
                                            display: 'inline-flex', alignItems: 'stretch',
                                            background: '#FFFFFF', border: `3px solid ${NB_INK}`, boxShadow: `5px 5px 0 ${NB_INK}`,
                                        }}
                                    >
                                        <div style={{ width: 14, background: s.color, borderRight: `3px solid ${NB_INK}` }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px' }}>
                                            {pic ? (
                                                <img src={pic} alt="" style={{ width: 40, height: 40, objectFit: 'cover', border: `2.5px solid ${NB_INK}` }} />
                                            ) : (
                                                <span style={{ width: 14, height: 14, background: s.color, border: `2px solid ${NB_INK}`, display: 'inline-block' }} />
                                            )}
                                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(25), color: NB_INK, lineHeight: 1.08 }}>
                                                    {nm}
                                                </span>
                                                {roleStr && (
                                                    <span style={{ fontFamily: theme.fontBody, fontWeight: 700, fontSize: stageFont(11), letterSpacing: '0.16em', textTransform: 'uppercase', color: '#555555' }}>
                                                        {roleStr}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Urban / Hip-Hop stage vocabulary ────────────────────────────────────────
// The urban stage is a city wall after dark: streetlight vignette, spray
// stencils with turbulence-rough edges and wet drips, wheatpasted paper
// flyers with tape, and a flickering neon accent. Oswald = stencil type,
// Permanent Marker = the tag hand.
const URB_VOID = '#050505'
const URB_GREEN = '#D4FF00'
const URB_CYAN = '#00F0FF'
const URB_RED = '#FF1E1E'
const URB_ASH = '#B0B0B0'
const URB_PAPER = '#F2EFE6'
const URB_STENCIL = "'Oswald', sans-serif"
const URB_MARKER = "'Permanent Marker', cursive"

// Ink for text sitting ON a spray plate of the given singer color(s).
const urbanTextOn = (colors: string[]): string =>
    colors.length > 0 && colors.every((c) => nbLuminance(c) < 0.22) ? '#FFFFFF' : '#0A0A0A'

// Local turbulence filter — the idle screen early-returns before the main
// stage's <defs>, so screens that need the rough-spray edge carry their own.
function UrbanRoughDefs({ id }: { id: string }) {
    return (
        <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
                <filter id={id}>
                    <feTurbulence type="fractalNoise" baseFrequency="0.04 0.15" numOctaves="3" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </defs>
        </svg>
    )
}

// Soft over-spray splat — a color cloud with satellite droplets.
function UrbanSplat({ color, size, style, opacity = 0.11 }: { color: string; size: number; style: React.CSSProperties; opacity?: number }) {
    return (
        <div
            style={{
                position: 'absolute', width: size, height: size, pointerEvents: 'none', opacity,
                background:
                    `radial-gradient(circle at 46% 52%, ${color} 0%, transparent 46%), ` +
                    `radial-gradient(circle at 74% 28%, ${color} 0%, transparent 10%), ` +
                    `radial-gradient(circle at 22% 24%, ${color} 0%, transparent 8%), ` +
                    `radial-gradient(circle at 82% 66%, ${color} 0%, transparent 7%), ` +
                    `radial-gradient(circle at 30% 82%, ${color} 0%, transparent 9%)`,
                ...style,
            }}
        />
    )
}

// Hand-scrawled king's crown — the classic tag signature.
function UrbanCrown({ size = 74, color = 'rgba(255,255,255,0.28)', style }: { size?: number; color?: string; style?: React.CSSProperties }) {
    return (
        <svg width={size} height={size * 0.7} viewBox="0 0 100 70" style={{ position: 'absolute', ...style }}>
            <path
                d="M10 58 L14 26 L32 42 L50 14 L68 42 L86 26 L90 58 Z"
                fill="none" stroke={color} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round"
            />
            <path d="M14 64 L86 64" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
        </svg>
    )
}

// Strip of packing tape holding paper to the wall.
function UrbanTape({ style, rotate = -3, width = 88 }: { style: React.CSSProperties; rotate?: number; width?: number }) {
    return (
        <div
            style={{
                position: 'absolute', width, height: 24, transform: `rotate(${rotate}deg)`,
                background: 'rgba(240, 238, 228, 0.32)', boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                ...style,
            }}
        />
    )
}

// Flickering neon tube sign (bad-bodega-tube stutter via .urban-neon).
function UrbanNeonSign({ text, color = URB_CYAN, fontSize }: { text: string; color?: string; fontSize: string }) {
    return (
        <div
            className="urban-neon"
            style={{
                display: 'inline-block', padding: '10px 28px',
                border: `2.5px solid ${color}`, borderRadius: 12,
                color, fontFamily: URB_STENCIL, fontWeight: 300, letterSpacing: '0.45em',
                textTransform: 'uppercase', fontSize,
                boxShadow: `0 0 18px ${color}59, inset 0 0 16px ${color}38`,
                textShadow: `0 0 8px ${color}D9, 0 0 24px ${color}80`,
            }}
        >
            {text}
        </div>
    )
}

// Spray-stencil plate: a rough neon block (turbulence-displaced underlay)
// with stencil text on top, optionally dripping wet paint off its bottom edge.
function UrbanSprayPlate({
    color, ink = '#0A0A0A', filterId, rotate = -2, drips = true, style, children,
}: {
    color: string; ink?: string; filterId: string; rotate?: number; drips?: boolean; style?: React.CSSProperties; children: React.ReactNode
}) {
    return (
        <span style={{ position: 'relative', display: 'inline-block', transform: `rotate(${rotate}deg)`, ...style }}>
            <span style={{ position: 'absolute', inset: 0, background: color, filter: `url(#${filterId})` }} />
            {drips && (
                <span
                    style={{
                        position: 'absolute', left: '8%', right: '8%', top: '90%', height: '0.6em', pointerEvents: 'none',
                        background:
                            `linear-gradient(${color}, ${color}) 7% 0 / 0.09em 90% no-repeat, ` +
                            `linear-gradient(${color}, ${color}) 18% 0 / 0.055em 55% no-repeat, ` +
                            `linear-gradient(${color}, ${color}) 63% 0 / 0.07em 40% no-repeat, ` +
                            `linear-gradient(${color}, ${color}) 86% 0 / 0.08em 100% no-repeat`,
                        filter: `url(#${filterId})`,
                    }}
                />
            )}
            <span style={{ position: 'relative', display: 'inline-block', color: ink }}>{children}</span>
        </span>
    )
}

// Shared night-wall layers: streetlight pool + vignette, faint block courses,
// grunge noise, over-spray splats, and a slow drift of the light.
function UrbanWallLayers({ noiseId }: { noiseId: string }) {
    return (
        <>
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 26%, rgba(255,255,255,0.055) 0%, transparent 55%), radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)',
            }} />
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.5,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '100% 44px, 88px 44px',
            }} />
            <div style={{
                position: 'absolute', inset: '-10%', pointerEvents: 'none',
                background: 'radial-gradient(ellipse 42% 58% at 32% 22%, rgba(255,255,255,0.045), transparent 70%)',
                animation: 'urban-spot 13s ease-in-out infinite alternate',
            }} />
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, mixBlendMode: 'overlay' as const }}>
                <filter id={noiseId}><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" /></filter>
                <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
            </svg>
            <UrbanSplat color={URB_GREEN} size={300} style={{ top: '10%', left: '5%' }} />
            <UrbanSplat color={URB_CYAN} size={230} style={{ bottom: '14%', right: '7%' }} />
            <UrbanSplat color={URB_RED} size={170} style={{ top: '56%', left: '11%', opacity: 0.09 } as React.CSSProperties} />
            <UrbanCrown style={{ top: '16%', right: '13%', transform: 'rotate(12deg)' }} />
            <UrbanCrown size={46} color="rgba(212,255,0,0.3)" style={{ bottom: '24%', left: '18%', transform: 'rotate(-9deg)' }} />
        </>
    )
}

// Full-bleed night wall behind the Up Next lockup — portaled to <body> so it
// paints between the blurred album backdrop (z 0) and the lyric/chrome layers.
function UrbanPosterBackdrop({ showVideo = false }: { showVideo?: boolean }) {
    // Over a music video: swap the solid night-wall for a translucent dark
    // wash (keeps the after-dark mood + marker-title legibility) and drop the
    // opaque wall texture so the clip reads through.
    const wall = (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden', background: showVideo ? 'linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.32) 40%, rgba(5,5,5,0.62) 100%)' : URB_VOID }}>
            {!showVideo && <UrbanWallLayers noiseId="urban-poster-noise" />}
        </div>
    )
    return createPortal(wall, document.body)
}

// ── Urban "Up Next" stage screen ────────────────────────────────────────────
// A show bill wheatpasted to the night wall: spray-stencil "UP NEXT" plate,
// the album art as a taped paper poster with a torn bottom edge, the title
// tagged in marker with the lead singer's glow, and slashed backstage chips
// for everyone on the mic.
function UrbanUpNext({
    theme, art, track, singers, np, roles, guestsMap, showVideo = false,
}: {
    theme: any; art: string | null; track: any; singers: any[]; np: any; roles: string[]; guestsMap: Map<string, any>; showVideo?: boolean
}) {
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
        : ''
    const title = np?.isHidden ? 'SURPRISE JOINT' : track?.name || ''
    const leadColor = singers[0]?.color || URB_GREEN
    const tornPaper = 'polygon(0 0, 100% 0, 100% 95%, 92% 100%, 78% 96%, 55% 100%, 34% 96.5%, 14% 100%, 0 96%)'
    return (
        <div style={{ width: '100%', maxWidth: 1160, margin: '0 auto', padding: '0 48px', position: 'relative' }}>
            <UrbanPosterBackdrop showVideo={showVideo} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
                {/* UP NEXT spray stencil */}
                <div style={{ animation: 'urban-spray-in 0.45s ease-out both' }}>
                    <UrbanSprayPlate color={URB_GREEN} filterId="urban-rough-filter" rotate={-2} style={{ padding: '6px 26px 8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '4px 6px' }}>
                            <NbEq color="#0A0A0A" fontSize={stageFont(19)} />
                            <span style={{ fontFamily: URB_STENCIL, fontWeight: 700, fontSize: stageFont(27), letterSpacing: '0.42em', textTransform: 'uppercase' }}>
                                Up Next
                            </span>
                        </span>
                    </UrbanSprayPlate>
                </div>

                {/* Wheatpasted poster (or the blacked-out surprise bill) */}
                {np?.isHidden ? (
                    <div className="nb-rise" style={{ animationDelay: '0.08s', position: 'relative', transform: 'rotate(1.4deg)' }}>
                        <div style={{
                            width: 316, height: 316, background: '#0D0D0D', clipPath: tornPaper,
                            boxShadow: '0 22px 50px rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 6,
                            border: '1px solid rgba(255,255,255,0.07)',
                        }}>
                            <span style={{ fontFamily: URB_MARKER, fontSize: stageFont(120), color: URB_GREEN, textShadow: `0 0 26px ${URB_GREEN}66`, transform: 'rotate(-6deg)' }}>?</span>
                        </div>
                        <UrbanTape style={{ top: -12, left: 24 }} rotate={-5} />
                        <UrbanTape style={{ top: -10, right: 20 }} rotate={4} />
                    </div>
                ) : art ? (
                    <div className="nb-rise" style={{ animationDelay: '0.08s', position: 'relative', transform: 'rotate(1.4deg)' }}>
                        <div style={{ background: URB_PAPER, padding: '12px 12px 20px', clipPath: tornPaper, boxShadow: '0 22px 50px rgba(0,0,0,0.85)' }}>
                            <img src={art} alt="" style={{ width: 292, height: 292, display: 'block', objectFit: 'cover' }} />
                        </div>
                        <UrbanTape style={{ top: -12, left: 24 }} rotate={-5} />
                        <UrbanTape style={{ top: -10, right: 20 }} rotate={4} />
                    </div>
                ) : null}

                {/* Title tagged straight onto the wall */}
                <div className="nb-rise" style={{ animationDelay: '0.16s', textAlign: 'center', maxWidth: 940 }}>
                    <h1 style={{
                        fontFamily: URB_MARKER, fontWeight: 400, fontSize: nbFitFont(48, title, 26), lineHeight: 1.15,
                        color: '#FFFFFF', margin: 0, transform: 'rotate(-1.6deg)',
                        textShadow: `0.05em 0.05em 0 #000, 0 0 30px ${leadColor}59`,
                    }}>
                        {title}
                    </h1>
                    {!np?.isHidden && (
                        <p style={{
                            fontFamily: URB_STENCIL, fontWeight: 300, fontSize: stageFont(16), color: URB_ASH,
                            margin: '12px 0 0', textTransform: 'uppercase', letterSpacing: '0.32em',
                        }}>
                            {track.artists.map((a: any) => a.name).join(', ')}
                            {dur ? `  —  ${dur}` : ''}
                        </p>
                    )}
                </div>

                {/* ON THE MIC — slashed backstage chips */}
                <div className="nb-rise" style={{ animationDelay: '0.24s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontFamily: URB_STENCIL, fontWeight: 700, fontSize: stageFont(12), letterSpacing: '0.5em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                        On The Mic
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
                        {singers.map((s: any, idx: number) => {
                            const roleStr =
                                !np?.isHidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                    ? s.roleIndices.map((ri: number) => roles[ri]).filter(Boolean).join(' & ')
                                    : ''
                            const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                            const nm = g?.name ?? s.name
                            const pic = g?.profile_picture ?? null
                            return (
                                <div
                                    key={s.id}
                                    className="nb-rise"
                                    style={{
                                        animationDelay: `${0.3 + idx * 0.07}s`,
                                        display: 'inline-flex', alignItems: 'center', gap: 12,
                                        background: 'rgba(12,12,12,0.82)', backdropFilter: 'blur(10px)',
                                        borderLeft: `6px solid ${s.color}`,
                                        clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
                                        padding: '12px 30px 12px 16px',
                                        boxShadow: '0 12px 28px rgba(0,0,0,0.7)',
                                        transform: `rotate(${idx % 2 === 0 ? -0.8 : 0.8}deg)`,
                                    }}
                                >
                                    {pic ? (
                                        <img src={pic} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${s.color}` }} />
                                    ) : (
                                        <span style={{ width: 13, height: 13, borderRadius: '50%', background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                                    )}
                                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <span style={{ fontFamily: URB_STENCIL, fontWeight: 700, fontSize: stageFont(24), color: '#FFFFFF', lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {nm}
                                        </span>
                                        {roleStr && (
                                            <span style={{ fontFamily: URB_STENCIL, fontWeight: 300, fontSize: stageFont(11), letterSpacing: '0.28em', textTransform: 'uppercase', color: URB_ASH }}>
                                                {roleStr}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Comic-Book "Up Next" stage screen ───────────────────────────────────────
// A bespoke, comic-original waiting screen: a halftone-printed page with a
// pop-art "UP NEXT!" starburst banner, the album art mounted in a heavy inked
// frame with a corner star sticker, the title knocked out in BadaBoom with a
// yellow comic offset, and each singer in a tilted yellow speech panel — every
// surface dotted with Ben-Day halftone. Replaces the generic ready layout for
// the comic theme only.
const COMIC_STAR_CLIP =
    'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
const COMIC_BURST_CLIP =
    'polygon(50% 0%,60% 18%,79% 10%,75% 31%,96% 35%,79% 50%,96% 65%,75% 69%,79% 90%,60% 82%,50% 100%,40% 82%,21% 90%,25% 69%,4% 65%,21% 50%,4% 35%,25% 31%,21% 10%,40% 18%)'
const COMIC_DOTS = 'radial-gradient(rgba(22,22,29,0.12) 1.5px, transparent 1.8px)'

function ComicUpNext({
    theme,
    art,
    track,
    singers,
    np,
    roles,
    guestsMap,
}: {
    theme: any
    art: string | null
    track: any
    singers: any[]
    np: any
    roles: string[]
    guestsMap: Map<string, any>
}) {
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000)
              .toString()
              .padStart(2, '0')}`
        : ''
    return (
        <div
            className="anim-enter"
            style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 48px', position: 'relative' }}
        >
            {/* Static action speed-lines radiating behind the whole lockup */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '42%',
                    width: '150vmax',
                    height: '150vmax',
                    transform: 'translate(-50%, -50%)',
                    background:
                        'repeating-conic-gradient(from 0deg, rgba(22,22,29,0.05) 0deg 2deg, transparent 2deg 4deg)',
                    zIndex: 0,
                    pointerEvents: 'none',
                }}
            />
            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 30,
                }}
            >
                {/* UP NEXT! starburst banner */}
                <div
                    style={{
                        position: 'relative',
                        width: 300,
                        height: 104,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        filter: 'drop-shadow(5px 5px 0 #16161D)',
                    }}
                >
                    <div style={{ position: 'absolute', inset: 0, clipPath: COMIC_BURST_CLIP, background: '#16161D' }} />
                    <div
                        style={{
                            position: 'absolute',
                            inset: 7,
                            clipPath: COMIC_BURST_CLIP,
                            background: '#FFD400',
                            backgroundImage: COMIC_DOTS,
                            backgroundSize: '8px 8px',
                        }}
                    />
                    <span
                        style={{
                            position: 'relative',
                            fontFamily: theme.fontDisplay,
                            fontSize: stageFont(34),
                            color: '#FF1F4B',
                            WebkitTextStroke: '2px #16161D',
                            textShadow: '2px 2px 0 #16161D',
                            transform: 'rotate(-3deg)',
                            letterSpacing: 1,
                        }}
                    >
                        UP NEXT!
                    </span>
                </div>

                {/* Album art — heavy inked frame with a corner star sticker */}
                {np?.isHidden ? (
                    <div
                        style={{
                            width: 320,
                            height: 320,
                            background: '#16161D',
                            backgroundImage: 'radial-gradient(rgba(255,212,0,0.18) 2px, transparent 2.4px)',
                            backgroundSize: '14px 14px',
                            border: '5px solid #16161D',
                            boxShadow: '10px 10px 0 #16161D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <span style={{ fontFamily: theme.fontDisplay, fontSize: stageFont(130), color: '#FFD400' }}>?</span>
                    </div>
                ) : art ? (
                    <div
                        style={{
                            position: 'relative',
                            padding: 13,
                            background: '#FFFFFF',
                            backgroundImage: COMIC_DOTS,
                            backgroundSize: '8px 8px',
                            border: '5px solid #16161D',
                            boxShadow: '10px 10px 0 #16161D',
                        }}
                    >
                        <img
                            src={art}
                            alt=""
                            style={{ width: 316, height: 316, display: 'block', border: '3px solid #16161D', objectFit: 'cover' }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                top: -24,
                                right: -24,
                                width: 80,
                                height: 80,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: 'rotate(13deg)',
                                filter: 'drop-shadow(3px 3px 0 #16161D)',
                            }}
                        >
                            <div style={{ position: 'absolute', inset: 0, clipPath: COMIC_STAR_CLIP, background: '#16161D' }} />
                            <div style={{ position: 'absolute', inset: 6, clipPath: COMIC_STAR_CLIP, background: '#FF1F4B' }} />
                            <span
                                style={{
                                    position: 'relative',
                                    fontFamily: theme.fontDisplay,
                                    fontSize: stageFont(22),
                                    color: '#FFFFFF',
                                    WebkitTextStroke: '1px #16161D',
                                }}
                            >
                                ★
                            </span>
                        </div>
                    </div>
                ) : null}

                {/* Title + singers panel */}
                <div
                    style={{
                        textAlign: 'center',
                        maxWidth: 860,
                        background: '#FFFFFF',
                        backgroundImage: COMIC_DOTS,
                        backgroundSize: '8px 8px',
                        border: '5px solid #16161D',
                        borderRadius: 10,
                        boxShadow: '8px 8px 0 #16161D',
                        padding: '26px 44px 30px',
                    }}
                >
                    <h1
                        style={{
                            fontFamily: theme.fontDisplay,
                            fontSize: stageFont(46),
                            color: '#16161D',
                            margin: 0,
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            textShadow: '3px 3px 0 #FFD400',
                        }}
                    >
                        {np?.isHidden ? 'SECRET SONG!' : track.name}
                    </h1>
                    {!np?.isHidden && (
                        <p
                            style={{
                                fontFamily: theme.fontBody,
                                fontWeight: 800,
                                fontSize: stageFont(17),
                                color: '#5A5A66',
                                margin: '8px 0 0',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                            }}
                        >
                            {track.artists.map((a: any) => a.name).join(', ')}
                            {dur ? `  ·  ${dur}` : ''}
                        </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 22 }}>
                        {singers.map((s: any) => {
                            const roleStr =
                                !np?.isHidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                    ? s.roleIndices.map((idx: number) => roles[idx]).filter(Boolean).join(' & ')
                                    : ''
                            const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                            const nm = g?.name ?? s.name
                            const pic = g?.profile_picture ?? null
                            return (
                                <div
                                    key={s.id}
                                    style={{
                                        position: 'relative',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '12px 24px',
                                        background: '#FFD400',
                                        backgroundImage: COMIC_DOTS,
                                        backgroundSize: '7px 7px',
                                        border: '4px solid #16161D',
                                        borderRadius: 8,
                                        boxShadow: '4px 4px 0 #16161D',
                                        transform: 'rotate(-1.5deg)',
                                    }}
                                >
                                    {pic && (
                                        <img
                                            src={pic}
                                            alt=""
                                            style={{ width: 34, height: 34, borderRadius: '50%', border: '2.5px solid #16161D', objectFit: 'cover' }}
                                        />
                                    )}
                                    <span
                                        style={{
                                            fontFamily: theme.fontDisplay,
                                            fontSize: stageFont(24),
                                            color: s.color,
                                            WebkitTextStroke: '1.5px #16161D',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        {roleStr ? `${nm} · ${roleStr}` : nm}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Tropical scene vocabulary (shared by the Up Next + live stage) ──────────
// Reusable beach primitives so the stage speaks the same tiki language as the
// idle "Catch a Wave" screen. Keyframes (tropSun/tropCloud/tropWave/
// tropPalmTrunk/tropFlame/tropFlameCore/tropEmber) live in tropical.ts globalCss,
// which is injected whenever the tropical theme is active.
const TROP_FROND_ANGLES = [-162, -124, -86, -48, -8, 30, 66]

function TropHibiscus({ size = 64, rotate = 0, style }: { size?: number; rotate?: number; style?: React.CSSProperties }) {
    return (
        <svg width={size} height={size} viewBox="0 0 70 70" style={{ transform: `rotate(${rotate}deg)`, filter: 'drop-shadow(0 4px 6px rgba(14,46,41,0.3))', ...style }}>
            {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="35" cy="17" rx="13" ry="17" fill="#FF3D81" stroke="#E02468" strokeWidth="1.5" transform={`rotate(${a} 35 35)`} />
            ))}
            <circle cx="35" cy="35" r="7.5" fill="#FFC83D" />
            <circle cx="35" cy="35" r="3" fill="#FF8A3C" />
        </svg>
    )
}

function TropPalm({ flip, swayDur, scale = 1, style }: { flip?: boolean; swayDur: number; scale?: number; style?: React.CSSProperties }) {
    return (
        <div style={{ position: 'absolute', transformOrigin: 'bottom center', animation: `tropPalmTrunk ${swayDur}s ease-in-out infinite`, ...style }}>
            <svg width={360 * scale} height={470 * scale} viewBox="0 0 360 470" style={{ display: 'block', transform: flip ? 'scaleX(-1)' : 'none', filter: 'drop-shadow(0 10px 16px rgba(14,46,41,0.28))' }}>
                <path d="M168 470 C 158 360 132 262 196 176 C 202 168 216 172 210 186 C 160 266 182 366 196 470 Z" fill="#A9764A" />
                <path d="M168 470 C 160 360 138 262 196 176 C 200 170 207 172 206 180 C 162 266 174 366 182 470 Z" fill="#C28F5A" />
                <circle cx="196" cy="186" r="12" fill="#5C3F22" />
                <circle cx="216" cy="194" r="11" fill="#6B4A2A" />
                <circle cx="202" cy="204" r="11" fill="#4A3119" />
                {TROP_FROND_ANGLES.map((a, i) => (
                    <path
                        key={i}
                        transform={`translate(204 176) rotate(${a})`}
                        d="M0 0 C 50 -22 116 -20 172 6 C 162 2 162 14 172 20 C 116 8 56 13 0 0 Z"
                        fill={i % 2 === 0 ? '#1FA85C' : '#178A4A'}
                        stroke="#0E6B39"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                ))}
                <path transform="translate(204 176) rotate(-100)" d="M0 0 C 18 -64 16 -130 4 -182 C -4 -130 -12 -64 0 0 Z" fill="#23B85F" stroke="#0E6B39" strokeWidth="2" />
            </svg>
        </div>
    )
}

function TropTorch({ style }: { style?: React.CSSProperties }) {
    return (
        <div style={{ position: 'absolute', width: 90, height: 300, ...style }}>
            <div style={{ position: 'absolute', top: -26, left: '50%', width: 180, height: 180, transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(255,170,60,0.55) 0%, transparent 64%)', animation: 'tropSun 2.2s ease-in-out infinite', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 6, left: '50%', width: 62, height: 86, transform: 'translateX(-50%)', zIndex: 2 }}>
                <svg width="62" height="86" viewBox="0 0 62 86" style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', animation: 'tropFlame 0.9s ease-in-out infinite' }}>
                    <path d="M31 84 C 7 64 5 38 31 4 C 57 38 55 64 31 84 Z" fill="#FF6B2C" />
                </svg>
                <svg width="40" height="58" viewBox="0 0 40 58" style={{ position: 'absolute', left: 11, bottom: 10, transformOrigin: '50% 100%', animation: 'tropFlameCore 0.7s ease-in-out infinite' }}>
                    <path d="M20 56 C 6 44 6 24 20 4 C 34 24 34 44 20 56 Z" fill="#FFD23F" />
                </svg>
            </div>
            {[0, 1, 2].map((i) => (
                <div key={i} style={{ position: 'absolute', top: 36, left: 38 + i * 6, width: 5, height: 5, borderRadius: '50%', background: i % 2 ? '#FFD23F' : '#FF8A3C', ['--ember-x' as string]: `${(i - 1) * 18}px`, animation: `tropEmber ${1.9 + i * 0.5}s ease-in ${i * 0.45}s infinite`, pointerEvents: 'none' }} />
            ))}
            <svg width="90" height="300" viewBox="0 0 90 300" style={{ position: 'absolute', bottom: 0, left: 0, filter: 'drop-shadow(0 8px 12px rgba(14,46,41,0.25))' }}>
                <rect x="34" y="86" width="22" height="214" rx="7" fill="#CDA85A" />
                <rect x="38" y="86" width="6" height="214" fill="#E2C684" opacity="0.7" />
                {[120, 162, 204, 246].map((ny, i) => (
                    <rect key={i} x="31" y={ny} width="28" height="6" rx="2.5" fill="#9A7536" />
                ))}
                <path d="M18 88 q 27 30 54 0 q -9 -20 -27 -20 q -18 0 -27 20 Z" fill="#6B4A2A" stroke="#4A3119" strokeWidth="2.5" />
                <path d="M18 88 q 27 12 54 0" stroke="#3A2614" strokeWidth="3" fill="none" />
            </svg>
        </div>
    )
}

function TropClouds() {
    const clouds = [
        { x: '7%', y: '8%', s: 1.0, d: 26 },
        { x: '58%', y: '5%', s: 1.25, d: 34 },
        { x: '33%', y: '15%', s: 0.8, d: 30 },
    ]
    return (
        <>
            {clouds.map((c, i) => (
                <div key={i} style={{ position: 'absolute', left: c.x, top: c.y, transform: `scale(${c.s})`, animation: `tropCloud ${c.d}s ease-in-out infinite alternate` }}>
                    <div style={{ position: 'relative', width: 180, height: 50 }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 180, height: 36, borderRadius: 30, background: 'rgba(255,255,255,0.92)' }} />
                        <div style={{ position: 'absolute', bottom: 8, left: 32, width: 62, height: 62, borderRadius: '50%', background: 'rgba(255,255,255,0.92)' }} />
                        <div style={{ position: 'absolute', bottom: 6, left: 84, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.92)' }} />
                    </div>
                </div>
            ))}
        </>
    )
}

// Full-bleed beach scene, portaled to <body> so it paints between the blurred
// album backdrop (z-index 0) and the lyric/chrome layers (z 10/20) without being
// clipped by the lyric mask. `live` dims it to a subtle sunset wash + palm
// silhouettes during playback so lyrics stay readable.
function TropBeachBackdrop({ live = false, showVideo = false }: { live?: boolean; showVideo?: boolean }) {
    // Over a music video the sky/sun/clouds/waves would look broken, so we drop
    // them and let the clip fill the frame under a soft aqua-tinted scrim, then
    // anchor the palms as dark silhouettes so it still reads as the tiki stage.
    const scene = (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2,
                pointerEvents: 'none',
                overflow: 'hidden',
                background: showVideo
                    ? 'linear-gradient(180deg, rgba(20,46,41,0.35) 0%, rgba(20,46,41,0.12) 45%, rgba(14,46,41,0.6) 100%)'
                    : live
                    ? 'linear-gradient(180deg, rgba(20,46,41,0) 0%, rgba(20,46,41,0) 55%, rgba(14,46,41,0.55) 100%)'
                    : 'linear-gradient(180deg, #38B6E8 0%, #5ECBE8 28%, #2FC4C0 50%, #7FE0D6 58%, #F4E2B8 70%, #FFF4DE 100%)',
            }}
        >
            {!live && !showVideo && (
                <>
                    <div style={{ position: 'absolute', top: '9%', right: '12%', width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, #FFE27A 0%, #FFC83D 58%, #FFB02E 100%)', animation: 'tropSun 6s ease-in-out infinite' }} />
                    <TropClouds />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '11%', opacity: 0.5, backgroundImage: 'repeating-linear-gradient(95deg, rgba(255,255,255,0.6) 0 3px, transparent 3px 24px)', animation: 'tropWave 6s linear infinite' }} />
                </>
            )}
            {/* palms anchored bottom corners — full color for Up Next, dark silhouettes when live or over video */}
            <div style={{ position: 'absolute', inset: 0, opacity: (live || showVideo) ? 0.4 : 1, filter: (live || showVideo) ? 'brightness(0.35) saturate(0.7)' : 'none' }}>
                <TropPalm swayDur={7} style={{ left: -96, bottom: -40 }} scale={(live || showVideo) ? 0.8 : 0.92} />
                <TropPalm flip swayDur={8.5} style={{ right: -96, bottom: -40 }} scale={(live || showVideo) ? 0.8 : 0.92} />
            </div>
            {!live && !showVideo && (
                <>
                    <TropTorch style={{ bottom: '14%', left: '15%' }} />
                    <TropTorch style={{ bottom: '14%', right: '15%' }} />
                </>
            )}
        </div>
    )
    return createPortal(scene, document.body)
}

// ── Tropical "Up Next" stage screen ─────────────────────────────────────────
// A full tiki-beach lockup: the live beach scene fills the stage behind a carved
// "UP NEXT" bamboo sign, the album art mounted in a bamboo frame with a hibiscus
// sticker, the title on a sun-lit wooden plank, and each singer on a lei pill.
function TropicalUpNext({
    theme,
    art,
    track,
    singers,
    np,
    roles,
    guestsMap,
    showVideo = false,
}: {
    theme: any
    art: string | null
    track: any
    singers: any[]
    np: any
    roles: string[]
    guestsMap: Map<string, any>
    showVideo?: boolean
}) {
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
        : ''
    const woodGrain = 'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 16px)'
    return (
        <div className="anim-enter" style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 48px', position: 'relative' }}>
            <TropBeachBackdrop showVideo={showVideo} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
                {/* Carved UP NEXT sign hanging on bamboo */}
                <div style={{ position: 'relative', background: 'linear-gradient(165deg, #8A5A2F, #6E4423)', border: '5px solid #CDA85A', borderRadius: 18, padding: '12px 40px', boxShadow: '0 16px 34px rgba(14,46,41,0.4)', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: woodGrain, pointerEvents: 'none' }} />
                    <span style={{ position: 'relative', fontFamily: theme.fontDisplay, fontSize: stageFont(44), color: '#FFF1C4', letterSpacing: 1, textShadow: '0 2px 0 rgba(0,0,0,0.35), 0 0 22px rgba(255,200,61,0.4)' }}>
                        Up Next
                    </span>
                </div>

                {/* Album art in a bamboo frame with a hibiscus sticker */}
                {np?.isHidden ? (
                    <div style={{ width: 332, height: 332, borderRadius: 22, background: 'linear-gradient(165deg, #8A5A2F, #6E4423)', border: '6px solid #CDA85A', boxShadow: '0 20px 44px rgba(14,46,41,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: theme.fontDisplay, fontSize: stageFont(150), color: '#FFF1C4' }}>?</span>
                    </div>
                ) : art ? (
                    <div style={{ position: 'relative', padding: 12, borderRadius: 22, background: 'linear-gradient(135deg, #E2C684, #CDA85A 55%, #9A7536)', boxShadow: '0 20px 44px rgba(14,46,41,0.42)' }}>
                        <img src={art} alt="" style={{ width: 312, height: 312, display: 'block', borderRadius: 12, objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: -26, right: -26, transform: 'rotate(-16deg)' }}>
                            <TropHibiscus size={78} />
                        </div>
                    </div>
                ) : null}

                {/* Title plank */}
                <div style={{ position: 'relative', textAlign: 'center', maxWidth: 880, background: 'linear-gradient(165deg, #8A5A2F, #6E4423)', border: '5px solid #CDA85A', borderRadius: 18, padding: '24px 46px 28px', boxShadow: '0 16px 36px rgba(14,46,41,0.4)', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: woodGrain, pointerEvents: 'none' }} />
                    <h1 style={{ position: 'relative', fontFamily: theme.fontDisplay, fontSize: stageFont(58), color: '#FFF8E6', margin: 0, lineHeight: 1.05, textShadow: '0 3px 0 rgba(0,0,0,0.35), 0 0 26px rgba(255,200,61,0.35)' }}>
                        {np?.isHidden ? 'Island Mystery' : track.name}
                    </h1>
                    {!np?.isHidden && (
                        <p style={{ position: 'relative', fontFamily: theme.fontBody, fontWeight: 700, fontSize: stageFont(17), color: '#FFE9C2', margin: '8px 0 0', letterSpacing: '0.04em' }}>
                            {track.artists.map((a: any) => a.name).join(', ')}
                            {dur ? `  ·  ${dur}` : ''}
                        </p>
                    )}
                    <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 20 }}>
                        {singers.map((s: any) => {
                            const roleStr =
                                !np?.isHidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                    ? s.roleIndices.map((idx: number) => roles[idx]).filter(Boolean).join(' & ')
                                    : ''
                            const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                            const nm = g?.name ?? s.name
                            const pic = g?.profile_picture ?? null
                            return (
                                <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', background: '#FFF7EA', border: '3px solid #CDA85A', borderRadius: 999, boxShadow: '0 6px 14px rgba(14,46,41,0.22)' }}>
                                    {pic ? (
                                        <img src={pic} alt="" style={{ width: 34, height: 34, borderRadius: '50%', border: `2.5px solid ${s.color}`, objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: s.color, border: '2px solid rgba(255,255,255,0.85)' }} />
                                    )}
                                    <span style={{ fontFamily: theme.fontDisplay, fontSize: stageFont(30), color: '#0E2E29', letterSpacing: 0.3 }}>
                                        {roleStr ? `${nm} · ${roleStr}` : nm}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Zen / Japanese garden stage vocabulary ──────────────────────────────────
// The zen stage is a tokonoma alcove at dusk: warm stone dark, washi paper,
// kintsugi gold, and the singer's color used the way a calligrapher uses a
// hanko seal — a small vivid accent on quiet paper. Every treatment below is
// built from that vocabulary so any singer-color combination stays serene and
// readable (colors are accents on ink-on-paper, never the text fill itself).
const ZEN_INK = '#241f16'
const ZEN_WASHI = '#F0E6D3'
const ZEN_WASHI_DIM = '#B8A898'
const ZEN_GOLD = '#C9A84C'
const ZEN_VERM = '#D4442A'
const ZEN_SAKURA = '#E8A0BF'
const ZEN_SERIF = "'Cormorant Garamond', Georgia, serif"
const ZEN_SANS = "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif"
const ZEN_PAPER = 'linear-gradient(168deg, #F7EEDC 0%, #F0E6D3 55%, #E7DAC2 100%)'

// Shrink the display serif as titles get longer so any length sits on one or
// two calm lines (still viewport-relative via stageFont).
const zenFitFont = (base: number, text: string, min = 26): string =>
    stageFont(Math.max(min, Math.round(base - Math.max(0, (text || '').length - 16) * 0.75)))

// Enso brush circle. Pass `progress` (0..1) to draw that fraction of the
// stroke (count-in / interlude rings get a smooth 0.28s glide between ticks);
// omit it for the endlessly re-drawing meditative loop.
function ZenEnso({ size = 44, color = ZEN_GOLD, strokeWidth = 6, progress, style }: {
    size?: number; color?: string; strokeWidth?: number; progress?: number; style?: React.CSSProperties
}) {
    const C = 2 * Math.PI * 38
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
            <circle
                cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
                strokeDasharray={C}
                transform="rotate(-80 50 50)"
                style={progress !== undefined
                    ? { strokeDashoffset: C * (1 - Math.min(1, Math.max(0, progress))), transition: 'stroke-dashoffset 0.28s linear' }
                    : { animation: 'zenEnsoDraw 6s ease-in-out infinite alternate', strokeDashoffset: 240 }}
            />
        </svg>
    )
}

// Falling sakura petals. Deterministic layout (no Math.random — stable across
// re-renders); each petal loops its own fall with sway + tumble.
const ZEN_PETALS: Array<{ x: string; size: number; dur: number; delay: number; o: number }> = [
    { x: '6%', size: 13, dur: 17, delay: 0, o: 0.32 },
    { x: '16%', size: 9, dur: 21, delay: 6, o: 0.22 },
    { x: '27%', size: 11, dur: 19, delay: 11, o: 0.26 },
    { x: '38%', size: 8, dur: 23, delay: 3, o: 0.2 },
    { x: '49%', size: 12, dur: 18, delay: 14, o: 0.28 },
    { x: '60%', size: 9, dur: 22, delay: 8, o: 0.2 },
    { x: '71%', size: 13, dur: 17.5, delay: 1.5, o: 0.3 },
    { x: '82%', size: 10, dur: 20, delay: 10, o: 0.24 },
    { x: '92%', size: 8, dur: 24, delay: 5, o: 0.18 },
]
function ZenPetalField({ dim = 1 }: { dim?: number }) {
    return (
        <>
            {ZEN_PETALS.map((p, i) => (
                <svg
                    key={i} width={p.size} height={p.size} viewBox="0 0 10 10"
                    style={{
                        position: 'absolute', left: p.x, top: '-6%', opacity: 0,
                        ['--petal-o' as string]: String(+(p.o * dim).toFixed(3)),
                        animation: `zen-petal-live ${p.dur}s linear ${p.delay}s infinite`,
                    }}
                >
                    <path d="M5 0.6 C7.6 1.4 8.8 3.7 8.1 6.2 C7.5 8.5 5.7 9.5 5 9.5 C4.3 9.5 2.5 8.5 1.9 6.2 C1.2 3.7 2.4 1.4 5 0.6 Z" fill={ZEN_SAKURA} />
                </svg>
            ))}
        </>
    )
}

// Stone garden lantern (tōrō) with a warm breathing candle glow.
function ZenLantern({ style, scale = 1 }: { style?: React.CSSProperties; scale?: number }) {
    return (
        <div style={{ position: 'absolute', width: 120 * scale, height: 190 * scale, ...style }}>
            <div style={{
                position: 'absolute', left: '50%', top: '34%', width: 96 * scale, height: 96 * scale,
                marginLeft: -48 * scale, borderRadius: '50%', filter: 'blur(2px)',
                background: 'radial-gradient(circle, rgba(255,196,110,0.35) 0%, rgba(255,180,90,0.12) 45%, transparent 70%)',
                animation: 'zen-lantern-glow 5s ease-in-out infinite',
            }} />
            <svg width={120 * scale} height={190 * scale} viewBox="0 0 120 190" style={{ position: 'relative' }}>
                <circle cx="60" cy="14" r="7" fill="#3a332a" />
                <path d="M14 52 Q60 18 106 52 L92 58 L28 58 Z" fill="#3a332a" />
                <rect x="36" y="58" width="48" height="40" rx="4" fill="#2c261e" />
                <rect x="46" y="64" width="28" height="28" rx="3" fill="#FFC46E" opacity="0.85" style={{ animation: 'zen-lantern-glow 5s ease-in-out infinite' }} />
                <line x1="60" y1="64" x2="60" y2="92" stroke="#2c261e" strokeWidth="3" />
                <line x1="46" y1="78" x2="74" y2="78" stroke="#2c261e" strokeWidth="3" />
                <rect x="40" y="98" width="40" height="8" rx="3" fill="#3a332a" />
                <rect x="50" y="106" width="20" height="52" fill="#332c23" />
                <path d="M26 178 Q60 158 94 178 L94 190 L26 190 Z" fill="#3a332a" />
            </svg>
        </div>
    )
}

// Full-bleed dusk garden behind the Up Next lockup, portaled to <body> so it
// paints between the blurred album backdrop (z 0) and the lyric/chrome layers
// (z 10/20) — same trick as the tropical beach + neo-brutal poster backdrops.
function ZenUpNextBackdrop({ showVideo = false }: { showVideo?: boolean }) {
    // Over a music video: keep the dusk mood with a translucent ink scrim so
    // the candlelit serif + gold decor stay legible, while the clip shows
    // through. The garden decorations (lanterns, enso, petals) stay as framing.
    const scene = (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden',
            background: showVideo
                ? 'linear-gradient(180deg, rgba(14,12,9,0.62) 0%, rgba(26,24,20,0.38) 45%, rgba(18,16,12,0.66) 100%)'
                : 'linear-gradient(180deg, #0e0c09 0%, #1a1814 34%, #201b14 62%, #12100c 100%)',
        }}>
            {/* drifting gold-ink wash */}
            <div style={{
                position: 'absolute', inset: '-20%', opacity: 0.05, filter: 'blur(40px)',
                background: 'radial-gradient(ellipse 60% 50% at 25% 30%, rgba(201,168,76,0.5) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 70% 60%, rgba(139,107,74,0.4) 0%, transparent 70%)',
                animation: 'zenInkDrift 30s ease-in-out infinite',
            }} />
            {/* ink mountains, two depths */}
            <svg style={{ position: 'absolute', bottom: '8%', left: 0, width: '100%', height: '42%', opacity: 0.08 }} viewBox="0 0 1200 400" preserveAspectRatio="none">
                <path d="M0 400 L0 280 Q150 120 300 220 Q450 100 600 180 Q750 60 900 200 Q1050 130 1200 250 L1200 400 Z" fill="#B8A898" />
            </svg>
            <svg style={{ position: 'absolute', bottom: '5%', left: 0, width: '100%', height: '36%', opacity: 0.05 }} viewBox="0 0 1200 400" preserveAspectRatio="none">
                <path d="M0 400 L0 320 Q200 180 400 280 Q550 150 700 240 Q850 170 1000 260 Q1100 200 1200 300 L1200 400 Z" fill="#8B7B6B" />
            </svg>
            {/* drifting mist */}
            <div style={{
                position: 'absolute', top: '42%', left: '-100%', width: '300%', height: 80, filter: 'blur(9px)',
                background: 'linear-gradient(90deg, transparent 0%, rgba(240,230,211,0.03) 20%, rgba(240,230,211,0.05) 50%, rgba(240,230,211,0.03) 80%, transparent 100%)',
                animation: 'zenMistDrift 35s linear infinite',
            }} />
            <div style={{
                position: 'absolute', top: '62%', left: '-100%', width: '300%', height: 60, filter: 'blur(13px)',
                background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.02) 30%, rgba(201,168,76,0.04) 50%, rgba(201,168,76,0.02) 70%, transparent 100%)',
                animation: 'zenMistDrift 25s linear infinite reverse',
            }} />
            {/* enso watermark, endlessly re-drawing */}
            <ZenEnso size={130} color="rgba(201,168,76,0.6)" strokeWidth={4} style={{ position: 'absolute', top: '7%', right: '9%', opacity: 0.14 }} />
            {/* glowing stone lanterns */}
            <ZenLantern style={{ left: '6%', bottom: '5%' }} />
            <ZenLantern style={{ right: '6%', bottom: '5%' }} scale={0.78} />
            <ZenPetalField />
        </div>
    )
    return createPortal(scene, document.body)
}

// Quiet ambience over the LIVE zen stage: a handful of drifting petals and a
// low mist band. Sits above the art/video backdrop (z 0) and below the
// reactions (z 5) and lyrics (z 10) so it never fights the words.
function ZenAmbient() {
    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
            <ZenPetalField dim={0.65} />
            <div style={{
                position: 'absolute', left: '-100%', bottom: 0, width: '300%', height: 110, filter: 'blur(10px)',
                background: 'linear-gradient(90deg, transparent, rgba(240,230,211,0.045) 30%, rgba(240,230,211,0.07) 50%, rgba(240,230,211,0.045) 70%, transparent)',
                animation: 'zenMistDrift 40s linear infinite',
            }} />
        </div>
    )
}

// ── Zen "Up Next" stage screen ──────────────────────────────────────────────
// A tokonoma alcove at dusk: the garden scene behind, a vermillion seal +
// gold-ruled "UP NEXT" header, the album art mounted on a hanging kakemono
// scroll with dark wood rollers, the title in candlelit serif (auto-sized to
// any length), a kintsugi vein divider, and each singer on a washi tag
// hanging from its own gold pin, swaying gently. Everything unrolls in with a
// soft staggered rise.
function ZenUpNext({
    theme,
    art,
    track,
    singers,
    np,
    roles,
    guestsMap,
    showVideo = false,
}: {
    theme: any
    art: string | null
    track: any
    singers: any[]
    np: any
    roles: string[]
    guestsMap: Map<string, any>
    showVideo?: boolean
}) {
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
        : ''
    const roller = (shadow: string) => (
        <div style={{ width: 360, height: 14, borderRadius: 999, background: 'linear-gradient(180deg, #4a4036, #2c261e)', boxShadow: shadow, position: 'relative' }}>
            <div style={{ position: 'absolute', left: -9, top: 2, width: 10, height: 10, borderRadius: '50%', background: ZEN_GOLD, boxShadow: '0 0 8px rgba(201,168,76,0.5)' }} />
            <div style={{ position: 'absolute', right: -9, top: 2, width: 10, height: 10, borderRadius: '50%', background: ZEN_GOLD, boxShadow: '0 0 8px rgba(201,168,76,0.5)' }} />
        </div>
    )
    return (
        <div className="anim-enter" style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 48px', position: 'relative' }}>
            <ZenUpNextBackdrop showVideo={showVideo} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                {/* Header: vermillion seal + gold rules */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, width: 'min(560px, 82%)', animation: 'zen-scroll-in 0.6s ease-out both' }}>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.55))' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 6, background: ZEN_VERM, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(212,68,42,0.45), inset 0 0 0 1.5px rgba(247,238,220,0.35)' }}>
                            <span style={{ fontFamily: ZEN_SANS, fontWeight: 700, fontSize: 16, color: '#F7EEDC', lineHeight: 1 }}>次</span>
                        </div>
                        <span style={{ fontFamily: ZEN_SANS, fontWeight: 500, fontSize: stageFont(15), letterSpacing: '0.5em', marginRight: '-0.5em', textTransform: 'uppercase', color: ZEN_GOLD, textShadow: '0 0 12px rgba(201,168,76,0.35)' }}>
                            Up Next
                        </span>
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(201,168,76,0.55), transparent)' }} />
                </div>

                {/* Kakemono hanging scroll with the album art */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'zen-scroll-in 0.65s ease-out 0.08s both' }}>
                    {roller('0 3px 8px rgba(0,0,0,0.5)')}
                    <div style={{ width: 336, padding: 16, background: ZEN_PAPER, boxShadow: '0 26px 54px rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center' }}>
                        {np?.isHidden ? (
                            <div style={{ width: 304, height: 304, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, border: '1px solid rgba(60,50,38,0.25)' }}>
                                <ZenEnso size={140} color="#2c261e" strokeWidth={5} />
                                <span style={{ fontFamily: ZEN_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: stageFont(22), color: '#3c3226' }}>a secret song</span>
                            </div>
                        ) : art ? (
                            <img src={art} alt="" style={{ width: 304, height: 304, objectFit: 'cover', display: 'block', border: '1px solid rgba(60,50,38,0.3)' }} />
                        ) : null}
                    </div>
                    {roller('0 8px 14px rgba(0,0,0,0.55)')}
                </div>

                {/* Title + artist + kintsugi vein */}
                <div style={{ textAlign: 'center', maxWidth: 940, animation: 'zen-scroll-in 0.65s ease-out 0.16s both' }}>
                    <h1 style={{
                        fontFamily: ZEN_SERIF, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.12, margin: 0,
                        fontSize: zenFitFont(58, np?.isHidden ? 'A Surprise Awaits' : track.name),
                        color: ZEN_WASHI, letterSpacing: '0.02em',
                        textShadow: '0 0 30px rgba(201,168,76,0.28), 0 0 60px rgba(201,168,76,0.12)',
                    }}>
                        {np?.isHidden ? 'A Surprise Awaits' : track.name}
                    </h1>
                    {!np?.isHidden && (
                        <p style={{ fontFamily: ZEN_SANS, fontWeight: 500, fontSize: stageFont(15), letterSpacing: '0.32em', textTransform: 'uppercase', color: ZEN_WASHI_DIM, margin: '14px 0 0' }}>
                            {track.artists.map((a: any) => a.name).join(', ')}{dur ? '  ·  ' + dur : ''}
                        </p>
                    )}
                    <svg width="320" height="12" viewBox="0 0 320 12" style={{ marginTop: 16, opacity: 0.8 }}>
                        <path d="M0 7 L74 7 L92 3.5 L118 8.5 L166 5 L208 8 L242 4.5 L320 6.5" fill="none" stroke={ZEN_GOLD} strokeWidth="1.4" strokeLinecap="round" />
                        <circle cx="92" cy="3.5" r="1.8" fill={ZEN_GOLD} />
                        <circle cx="242" cy="4.5" r="1.8" fill={ZEN_GOLD} />
                    </svg>
                </div>

                {/* Singers: washi tags hanging from gold pins, gently swaying */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 30, maxWidth: 980 }}>
                    {singers.map((s: any, i: number) => {
                        const roleStr =
                            !np?.isHidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                ? s.roleIndices.map((idx: number) => roles[idx]).filter(Boolean).join(' & ')
                                : ''
                        const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                        const nm = g?.name ?? s.name
                        const pic = g?.profile_picture ?? null
                        return (
                            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `zen-scroll-in 0.6s ease-out ${0.24 + i * 0.07}s both` }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: ZEN_GOLD, boxShadow: '0 0 8px rgba(201,168,76,0.6)' }} />
                                <div style={{ transformOrigin: 'top center', animation: `zen-tag-sway ${5.5 + (i % 3)}s ease-in-out ${i * 0.4}s infinite`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ width: 2, height: 16, background: 'rgba(201,168,76,0.55)' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px 12px 18px', background: ZEN_PAPER, borderLeft: `5px solid ${s.color}`, borderRadius: 6, boxShadow: '0 12px 26px rgba(0,0,0,0.45)' }}>
                                        {pic ? (
                                            <img src={pic} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${s.color}` }} />
                                        ) : (
                                            <span style={{ width: 14, height: 14, borderRadius: 4, background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                                        )}
                                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <span style={{ fontFamily: ZEN_SERIF, fontWeight: 600, fontSize: stageFont(27), color: ZEN_INK, lineHeight: 1.12 }}>{nm}</span>
                                            {roleStr && (
                                                <span style={{ fontFamily: ZEN_SANS, fontWeight: 500, fontSize: stageFont(11), letterSpacing: '0.22em', textTransform: 'uppercase', color: '#8a7a64' }}>{roleStr}</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ── Steampunk / Victorian engine-room stage vocabulary ──────────────────────
// The steampunk stage is a music-hall engine room: cast iron, riveted brass,
// gaslight, and pressure gauges. The singer's color is treated as LIGHT — an
// Edison-filament lettering color and an enamel indicator band on machinery —
// so any color (or combination on shared lines) stays bright on dark iron.
const STM_BRASS = '#C8973E'
const STM_COPPER = '#E07040'
const STM_RUST = '#B84030'
const STM_PARCH = '#E8DCC8'
const STM_MID = '#A89878'
const STM_HEADING = "'Cinzel Decorative', 'Cinzel', serif"
const STM_SERIF = "'Spectral', Georgia, serif"
const STM_PLATE_BG = 'linear-gradient(180deg, #262019, #17130e)'

// Shrink the display serif as titles get longer so any length fits the board.
const stmFitFont = (base: number, text: string, min = 24): string =>
    stageFont(Math.max(min, Math.round(base - Math.max(0, (text || '').length - 14) * 0.85)))

// Point on a dial: angle in degrees measured clockwise from 12 o'clock.
const stmPt = (deg: number, r: number, cx = 50, cy = 50): [number, number] => {
    const rad = (deg * Math.PI) / 180
    return [cx + Math.sin(rad) * r, cy - Math.cos(rad) * r]
}

// Toothed gear, spinning forever. Reused across the backdrop, ambience and
// chrome; teeth/size/speed parametrized so neighbouring gears interlock.
function SteamGear({ size = 120, color = STM_BRASS, teeth = 12, dur = 30, reverse = false, opacity = 0.08, style }: {
    size?: number; color?: string; teeth?: number; dur?: number; reverse?: boolean; opacity?: number; style?: React.CSSProperties
}) {
    return (
        <svg
            width={size} height={size} viewBox="0 0 200 200"
            style={{ opacity, animation: `${reverse ? 'steamGearSpinReverse' : 'steamGearSpin'} ${dur}s linear infinite`, ...style }}
        >
            <circle cx="100" cy="100" r="60" fill="none" stroke={color} strokeWidth="3" />
            <circle cx="100" cy="100" r="25" fill="none" stroke={color} strokeWidth="2" />
            <circle cx="100" cy="100" r="8" fill={color} fillOpacity="0.35" />
            {Array.from({ length: teeth }).map((_, i) => {
                const a = (i / teeth) * Math.PI * 2
                return (
                    <line
                        key={i}
                        x1={100 + Math.cos(a) * 60} y1={100 + Math.sin(a) * 60}
                        x2={100 + Math.cos(a) * 78} y2={100 + Math.sin(a) * 78}
                        stroke={color} strokeWidth="10" strokeLinecap="round"
                    />
                )
            })}
        </svg>
    )
}

// Pressure gauge. `progress` (0..1) sweeps the copper needle from -120° to
// +120° with a smooth glide between ticks; the last 30% of the dial is the
// red zone, so the needle "hits red" right as the song lands.
function SteamGauge({ size = 90, progress = 0, style }: { size?: number; progress?: number; style?: React.CSSProperties }) {
    const p = Math.min(1, Math.max(0, progress))
    const [rx1, ry1] = stmPt(48, 34)
    const [rx2, ry2] = stmPt(120, 34)
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
            <circle cx="50" cy="50" r="45" fill="#1a1510" stroke={STM_BRASS} strokeWidth="3" />
            <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(200,151,62,0.25)" strokeWidth="1" />
            <path d={`M ${rx1} ${ry1} A 34 34 0 0 1 ${rx2} ${ry2}`} fill="none" stroke={STM_RUST} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
            {Array.from({ length: 9 }).map((_, i) => {
                const deg = -120 + i * 30
                const [x1, y1] = stmPt(deg, 34)
                const [x2, y2] = stmPt(deg, 39)
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STM_BRASS} strokeWidth="1.6" />
            })}
            <line
                x1="50" y1="50" x2="50" y2="19" stroke={STM_COPPER} strokeWidth="3" strokeLinecap="round"
                style={{ transformOrigin: '50px 50px', transform: `rotate(${-120 + p * 240}deg)`, transition: 'transform 0.28s linear' }}
            />
            <circle cx="50" cy="50" r="4.5" fill={STM_BRASS} />
        </svg>
    )
}

// Four brass corner rivets for iron plates.
function SteamRivets({ inset = 7 }: { inset?: number }) {
    const dot: React.CSSProperties = {
        position: 'absolute', width: 7, height: 7, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #F0DFBE 0%, #C8973E 40%, #6d4f1c 100%)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.7)',
    }
    return (
        <>
            <div style={{ ...dot, top: inset, left: inset }} />
            <div style={{ ...dot, top: inset, right: inset }} />
            <div style={{ ...dot, bottom: inset, left: inset }} />
            <div style={{ ...dot, bottom: inset, right: inset }} />
        </>
    )
}

// Brass pipe run with bolted joints and steam wisps rising from them.
function SteamPipe({ bottom, joints }: { bottom: string; joints: string[] }) {
    return (
        <>
            <div style={{ position: 'absolute', bottom, left: 0, width: '100%', height: 3, background: 'rgba(200,151,62,0.12)' }} />
            {joints.map((x, i) => (
                <div key={i} style={{ position: 'absolute', bottom: `calc(${bottom} - 4px)`, left: x, width: 11, height: 11, borderRadius: '50%', border: '1.5px solid rgba(200,151,62,0.2)', background: 'rgba(200,151,62,0.07)' }} />
            ))}
            {joints.map((x, i) => (
                <div key={`w-${i}`} style={{
                    position: 'absolute', bottom: `calc(${bottom} + 8px)`, left: x, width: 6, height: 6, borderRadius: '50%',
                    background: 'rgba(212,206,192,0.16)', filter: 'blur(2px)',
                    animation: `steamPuff 9s ease-out ${i * 2.3}s infinite`,
                }} />
            ))}
        </>
    )
}

// Full-bleed engine-room wall behind the Up Next lockup, portaled to <body>
// so it paints between the blurred album backdrop (z 0) and the lyric/chrome
// layers (z 10/20) — same trick as the other themed backdrops.
function SteampunkUpNextBackdrop({ showVideo = false }: { showVideo?: boolean }) {
    // Over a music video: keep the gaslit-boiler-room mood with a translucent
    // iron scrim so the brass plates + gauges stay legible while the clip
    // shows through. Gears, pipes and lanterns stay as framing.
    const scene = (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden',
            background: showVideo
                ? 'linear-gradient(180deg, rgba(14,11,9,0.62) 0%, rgba(20,17,15,0.4) 45%, rgba(16,13,10,0.66) 100%)'
                : 'linear-gradient(180deg, #0e0b09 0%, #14110F 35%, #1a1510 65%, #100d0a 100%)',
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(200,151,62,0.03) 0%, transparent 50%, rgba(0,0,0,0.45) 100%)' }} />
            {/* interlocking gear train */}
            <SteamGear size={290} teeth={12} dur={36} opacity={0.08} style={{ position: 'absolute', top: -70, right: -50 }} />
            <SteamGear size={170} teeth={8} dur={24} reverse opacity={0.06} color={STM_COPPER} style={{ position: 'absolute', top: 96, right: 170 }} />
            <SteamGear size={210} teeth={10} dur={30} reverse opacity={0.06} color={STM_COPPER} style={{ position: 'absolute', bottom: -40, left: -30 }} />
            <SteamGear size={110} teeth={6} dur={18} opacity={0.05} color="#5A9E8F" style={{ position: 'absolute', bottom: 120, left: 150 }} />
            {/* pipe run with venting joints */}
            <SteamPipe bottom="16%" joints={['7%', '24%', '46%', '68%', '88%']} />
            {/* scrollwork corners */}
            <svg style={{ position: 'absolute', top: 20, left: 20, width: 80, height: 80, opacity: 0.1 }} viewBox="0 0 80 80">
                <path d="M5 5 Q5 25 15 18 Q28 8 22 22 Q16 36 28 28 Q40 20 34 34" fill="none" stroke={STM_BRASS} strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="8" cy="8" r="2" fill="rgba(200,151,62,0.4)" />
            </svg>
            <svg style={{ position: 'absolute', bottom: 20, right: 20, width: 80, height: 80, opacity: 0.1, transform: 'rotate(180deg)' }} viewBox="0 0 80 80">
                <path d="M5 5 Q5 25 15 18 Q28 8 22 22 Q16 36 28 28 Q40 20 34 34" fill="none" stroke={STM_BRASS} strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="8" cy="8" r="2" fill="rgba(200,151,62,0.4)" />
            </svg>
            {/* flanking gaslight lanterns */}
            {(['8%', '92%'] as const).map((left, i) => (
                <div key={i} style={{ position: 'absolute', top: '18%', left, width: 30, marginLeft: -15 }}>
                    <div style={{
                        position: 'absolute', top: 6, left: -20, width: 70, height: 70, borderRadius: '50%', filter: 'blur(4px)',
                        background: 'radial-gradient(circle, rgba(232,184,76,0.22) 0%, rgba(232,184,76,0.07) 50%, transparent 70%)',
                        animation: 'steamFlicker 4s ease-in-out infinite',
                    }} />
                    <svg width="30" height="50" viewBox="0 0 30 50" style={{ position: 'relative', opacity: 0.35 }}>
                        <line x1="15" y1="0" x2="15" y2="10" stroke={STM_BRASS} strokeWidth="1.5" />
                        <rect x="8" y="10" width="14" height="20" rx="2" fill="none" stroke={STM_BRASS} strokeWidth="1.5" />
                        <ellipse cx="15" cy="22" rx="3" ry="5" fill="rgba(232,184,76,0.55)" style={{ animation: 'steamFlicker 3s ease-in-out infinite' }} />
                        <line x1="6" y1="30" x2="24" y2="30" stroke={STM_BRASS} strokeWidth="1.5" />
                    </svg>
                </div>
            ))}
        </div>
    )
    return createPortal(scene, document.body)
}

// Quiet machinery over the LIVE steampunk stage: two faint slow gears in the
// corners and steam wisps venting along the bottom. Above the art/video (z 0),
// below the reactions (z 5) and lyrics (z 10).
function SteamAmbient() {
    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
            <SteamGear size={240} teeth={12} dur={44} opacity={0.05} style={{ position: 'absolute', top: -60, right: -60 }} />
            <SteamGear size={170} teeth={8} dur={30} reverse opacity={0.04} color={STM_COPPER} style={{ position: 'absolute', bottom: -50, left: -40 }} />
            {['12%', '34%', '58%', '80%'].map((x, i) => (
                <div key={i} style={{
                    position: 'absolute', bottom: 12, left: x, width: 7, height: 7, borderRadius: '50%',
                    background: 'rgba(212,206,192,0.13)', filter: 'blur(2.5px)',
                    animation: `steamPuff ${10 + i * 2}s ease-out ${i * 2.7}s infinite`,
                }} />
            ))}
        </div>
    )
}

// ── Steampunk "Up Next" stage screen ────────────────────────────────────────
// A Victorian programme board in the engine room: gear train + pipe run
// behind, a gaslit "UP NEXT" masthead, the album art bolted into a riveted
// brass porthole, the title in candlelit Cinzel (auto-sized to any length),
// a pipe divider, and each singer on an engraved brass nameplate with a
// glowing enamel indicator lamp in their color. Everything rises in with a
// mechanical stagger.
// ── Psychedelic "Up Next" — the projector bill ──────────────────────────────
// The song about to play, on the same plate the join screen uses: filled with the
// liquid-light footage at its own offset, with the artwork punched into a dye-matted ink
// window and the singers as filled dye plates.
//
// EVERY PIECE OF TYPE IS EITHER STROKED OR SOLID-BACKED, because the footage behind runs
// from near-black to pure white and no flat text colour survives that. The title is cream
// over an ink stroke; the label is an amber tab; the artist line is cream with a hard ink
// shadow; the singers sit on their own dye plates. An earlier version of this bill was
// cream stock with ink lettering, which read beautifully and shared nothing with the
// projector the rest of the theme is built around.
//
// The generic fallback this replaced rendered from raw tokens — a `stickerLabel` chip, art
// in `theme.radius` with `theme.border`, a `theme.card` block — which on a dark-shell theme
// comes out as grey text on a grey panel.
function PsyUpNext({
    theme,
    art,
    track,
    singers,
    np,
    roles,
    guestsMap,
}: {
    theme: any
    art: string | null
    track: any
    singers: any[]
    np: any
    roles: string[]
    guestsMap: Map<string, any>
}) {
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
        : ''
    const title = np?.isHidden ? 'A Secret Song' : track.name

    return (
        <div className="anim-enter" style={{
            width: '100%', maxWidth: 1180, margin: '0 auto', padding: '0 48px',
            display: 'flex', justifyContent: 'center',
        }}>
            <div style={{
                position: 'relative', overflow: 'hidden',
                border: `${PSY.LINE}px solid ${PSY.INK}`,
                borderRadius: psyPoured(0, 30),
                boxShadow: `0 0 0 6px ${PSY.CREAM}, 0 24px 64px rgba(0,0,0,0.68)`,
                animation: 'psy-stamp-in 0.5s cubic-bezier(0.2,0.9,0.3,1) both',
            }}>
                {/* Three-quarters through the clip, so this bill never shows the same moment
                    as the join screen's plate (0.5) or the count-in's (0.25). */}
                <LiquidLight phase={0.75} filter="saturate(1.5) contrast(1.1) brightness(0.46)" />

                <div style={{
                    position: 'relative', padding: '40px 48px 44px',
                    display: 'flex', alignItems: 'center', gap: 46,
                }}>
                    {/* Artwork, or the hidden-song panel for a surprise */}
                    {np?.isHidden ? (
                        <div style={{ flexShrink: 0 }}>
                            <HiddenSongStagePanel theme={theme} />
                        </div>
                    ) : art ? (
                        <div style={{
                            flexShrink: 0, padding: 14,
                            background: PSY.DYES[2],
                            border: `${PSY.LINE}px solid ${PSY.INK}`,
                            borderRadius: psyPoured(1, 24),
                        }}>
                            <img src={art} alt="" style={{
                                width: 296, height: 296, display: 'block', objectFit: 'cover',
                                border: `${PSY.LINE}px solid ${PSY.INK}`, borderRadius: 10,
                            }} />
                        </div>
                    ) : null}

                    <div style={{ minWidth: 0, flex: 1 }}>
                        {/* The label is a dye tab, not a bordered chip — it has to read as
                            printed onto the paper. */}
                        <span style={{
                            display: 'inline-block',
                            background: PSY.DYES[1], color: PSY.INK,
                            border: `${PSY.LINE}px solid ${PSY.INK}`, borderRadius: 999,
                            fontFamily: PSY.FONT_BODY, fontWeight: 800,
                            fontSize: stageFont(13), letterSpacing: '0.2em',
                            textTransform: 'uppercase', padding: '4px 18px 5px',
                        }}>
                            Up Next
                        </span>

                        <h1 style={{
                            fontFamily: PSY.FONT_DISPLAY, fontWeight: 400,
                            fontSize: nbFitFont(58, title, 30), lineHeight: 1.02,
                            margin: '16px 0 0', letterSpacing: '0.01em',
                            ...psyStroke(0.045),
                        } as React.CSSProperties}>
                            {title}
                        </h1>

                        {!np?.isHidden && (
                            <p style={{
                                fontFamily: PSY.FONT_BODY, fontWeight: 800,
                                fontSize: stageFont(19), color: PSY.CREAM, margin: '10px 0 0',
                                // Hard ink shadow: at 19px a stroke would clog the letterforms,
                                // but bare cream vanishes the moment a pale frame drifts past.
                                textShadow: '0 2px 0 rgba(8,6,12,0.95), 0 0 16px rgba(8,6,12,0.9)',
                            }}>
                                {track.artists.map((a: any) => a.name).join(', ')}{dur ? '  ·  ' + dur : ''}
                            </p>
                        )}

                        {np?.isHidden && (
                            <div style={{ marginTop: 10 }}>
                                <HiddenSongStageHeading theme={theme} />
                            </div>
                        )}

                        {/* Singers as dye plates. Each walks the palette by position so no
                            two adjacent nameplates share a colour, and each carries its own
                            singer colour as a dot — the same split the phone's chips use. */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
                            {singers.map((sg: any, i: number) => {
                                const roleStr =
                                    !np?.isHidden && sg.roleIndices && sg.roleIndices.length > 0 && roles.length > 0
                                        ? sg.roleIndices.map((idx: number) => roles[idx]).filter(Boolean).join(' & ')
                                        : ''
                                const g = sg.guestId ? guestsMap.get(sg.guestId) : undefined
                                const nm = g?.name ?? sg.name
                                const pic = g?.profile_picture ?? null
                                const dye = PSY.DYES[i % PSY.DYES.length]
                                return (
                                    <div key={sg.id} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 11,
                                        padding: '9px 18px 10px 10px',
                                        background: dye,
                                        border: `${PSY.LINE}px solid ${PSY.INK}`,
                                        borderRadius: psyPoured(i, 18, 8),
                                        animation: `psy-stamp-in 0.42s cubic-bezier(0.2,0.9,0.3,1) ${0.12 + i * 0.07}s both`,
                                    }}>
                                        {pic ? (
                                            <img src={pic} alt="" style={{
                                                width: 38, height: 38, borderRadius: '50%', objectFit: 'cover',
                                                border: `2.5px solid ${PSY.INK}`,
                                            }} />
                                        ) : (
                                            <span style={{
                                                width: 38, height: 38, borderRadius: '50%',
                                                background: sg.color, border: `2.5px solid ${PSY.INK}`,
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                fontFamily: PSY.FONT_DISPLAY, fontSize: 18, color: PSY.INK,
                                            }}>
                                                {(nm || '?').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.12 }}>
                                            <span style={{
                                                fontFamily: PSY.FONT_DISPLAY, fontSize: stageFont(23), color: PSY.INK,
                                            }}>
                                                {nm}
                                            </span>
                                            {roleStr && (
                                                <span style={{
                                                    fontFamily: PSY.FONT_BODY, fontWeight: 800, fontSize: stageFont(12),
                                                    letterSpacing: '0.14em', textTransform: 'uppercase', color: PSY.INK_SOFT,
                                                }}>
                                                    {roleStr}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SteampunkUpNext({
    theme,
    art,
    track,
    singers,
    np,
    roles,
    guestsMap,
    showVideo = false,
}: {
    theme: any
    art: string | null
    track: any
    singers: any[]
    np: any
    roles: string[]
    guestsMap: Map<string, any>
    showVideo?: boolean
}) {
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
        : ''
    return (
        <div className="anim-enter" style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 48px', position: 'relative' }}>
            <SteampunkUpNextBackdrop showVideo={showVideo} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                {/* Masthead: brass rules + gaslit UP NEXT */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, width: 'min(620px, 84%)', animation: 'steam-rise 0.55s ease-out both' }}>
                    <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, transparent, rgba(200,151,62,0.5))', position: 'relative' }}>
                        <div style={{ position: 'absolute', right: -3, top: -3, width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(200,151,62,0.5)' }} />
                    </div>
                    <span style={{
                        fontFamily: STM_HEADING, fontWeight: 700, fontSize: stageFont(26), letterSpacing: '0.34em', marginRight: '-0.34em',
                        textTransform: 'uppercase', color: STM_BRASS,
                        textShadow: '0 0 14px rgba(200,151,62,0.45), 0 0 34px rgba(224,112,64,0.18)',
                        animation: 'steamFlicker 4s ease-in-out infinite',
                    }}>
                        Up Next
                    </span>
                    <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, rgba(200,151,62,0.5), transparent)', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: -3, top: -3, width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(200,151,62,0.5)' }} />
                    </div>
                </div>

                {/* Album art bolted into a riveted brass porthole */}
                <div style={{ position: 'relative', animation: 'steam-rise 0.6s ease-out 0.08s both' }}>
                    <div style={{
                        position: 'relative', width: 330, height: 330, borderRadius: '50%', padding: 15,
                        background: 'conic-gradient(from 30deg, #8a6524, #E0B360, #C8973E, #7a5418, #D8AC5A, #8a6524)',
                        boxShadow: '0 22px 50px rgba(0,0,0,0.6), 0 0 30px rgba(200,151,62,0.18), inset 0 2px 3px rgba(255,235,180,0.5), inset 0 -2px 3px rgba(0,0,0,0.6)',
                    }}>
                        {np?.isHidden ? (
                            <div style={{
                                width: 300, height: 300, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                                background: 'radial-gradient(circle at 38% 32%, #2e3d38 0%, #1a2320 60%, #101614 100%)',
                                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.7)',
                            }}>
                                <span style={{ fontFamily: STM_HEADING, fontWeight: 700, fontSize: stageFont(120), color: 'rgba(90,158,143,0.75)', textShadow: '0 0 24px rgba(90,158,143,0.4)', lineHeight: 1 }}>?</span>
                                <span style={{ fontFamily: STM_SERIF, fontStyle: 'italic', fontSize: stageFont(16), color: STM_MID, letterSpacing: '0.1em' }}>contents under pressure</span>
                            </div>
                        ) : art ? (
                            <img src={art} alt="" style={{ width: 300, height: 300, borderRadius: '50%', objectFit: 'cover', display: 'block', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6)' }} />
                        ) : null}
                        {/* porthole bolts */}
                        {Array.from({ length: 8 }).map((_, i) => {
                            const [x, y] = stmPt(i * 45, 157.5, 165, 165)
                            return (
                                <div key={i} style={{
                                    position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: '50%',
                                    background: 'radial-gradient(circle at 35% 30%, #F0DFBE 0%, #C8973E 40%, #5d431a 100%)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                }} />
                            )
                        })}
                    </div>
                </div>

                {/* Title + artist + pipe divider */}
                <div style={{ textAlign: 'center', maxWidth: 940, animation: 'steam-rise 0.6s ease-out 0.16s both' }}>
                    <h1 style={{
                        fontFamily: STM_HEADING, fontWeight: 700, lineHeight: 1.14, margin: 0,
                        fontSize: stmFitFont(52, np?.isHidden ? 'A Mystery Machine' : track.name),
                        color: STM_PARCH, letterSpacing: '0.03em',
                        textShadow: '0 0 20px rgba(200,151,62,0.35), 0 0 50px rgba(200,151,62,0.12), 0 2px 0 rgba(0,0,0,0.5)',
                    }}>
                        {np?.isHidden ? 'A Mystery Machine' : track.name}
                    </h1>
                    {!np?.isHidden && (
                        <p style={{ fontFamily: STM_SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: stageFont(16), letterSpacing: '0.26em', textTransform: 'uppercase', color: STM_MID, margin: '12px 0 0' }}>
                            {track.artists.map((a: any) => a.name).join(', ')}{dur ? '  ·  ' + dur : ''}
                        </p>
                    )}
                    <svg width="340" height="14" viewBox="0 0 340 14" style={{ marginTop: 14, opacity: 0.7 }}>
                        <line x1="0" y1="7" x2="340" y2="7" stroke={STM_BRASS} strokeWidth="2" />
                        {[60, 170, 280].map((x, i) => (
                            <circle key={i} cx={x} cy="7" r="4.5" fill="#17130e" stroke={STM_BRASS} strokeWidth="1.5" />
                        ))}
                    </svg>
                </div>

                {/* Singers: engraved brass nameplates with enamel indicator lamps */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 18, maxWidth: 980 }}>
                    {singers.map((s: any, i: number) => {
                        const roleStr =
                            !np?.isHidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                ? s.roleIndices.map((idx: number) => roles[idx]).filter(Boolean).join(' & ')
                                : ''
                        const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                        const nm = g?.name ?? s.name
                        const pic = g?.profile_picture ?? null
                        return (
                            <div key={s.id} style={{
                                position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 14, padding: '14px 26px',
                                background: STM_PLATE_BG, borderRadius: 5, border: '2px solid #0c0a07',
                                boxShadow: `inset 0 0 0 2px ${STM_BRASS}, inset 0 0 16px rgba(0,0,0,0.5), 0 12px 26px rgba(0,0,0,0.55), 0 0 14px color-mix(in srgb, ${s.color}, transparent 65%)`,
                                animation: `steam-rise 0.55s ease-out ${0.24 + i * 0.07}s both`,
                            }}>
                                <SteamRivets />
                                {pic ? (
                                    <img src={pic} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${s.color}`, boxShadow: `0 0 10px color-mix(in srgb, ${s.color}, transparent 50%)` }} />
                                ) : (
                                    <span style={{
                                        width: 15, height: 15, borderRadius: '50%',
                                        background: `radial-gradient(circle at 35% 30%, #FFF3D6 0%, ${s.color} 45%, color-mix(in srgb, ${s.color}, #000 45%) 100%)`,
                                        boxShadow: `0 0 12px ${s.color}`,
                                    }} />
                                )}
                                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: stageFont(26), color: STM_PARCH, lineHeight: 1.18, textShadow: '0 0 10px rgba(200,151,62,0.25), 0 1px 0 rgba(0,0,0,0.5)' }}>{nm}</span>
                                    {roleStr && (
                                        <span style={{ fontFamily: STM_SERIF, fontStyle: 'italic', fontWeight: 500, fontSize: stageFont(12), letterSpacing: '0.2em', textTransform: 'uppercase', color: STM_MID }}>{roleStr}</span>
                                    )}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ---- Singer Mic Processing Hook ----
function useSingerMic(deviceId: string, enabled: boolean, effects: any, mainOutputId: string) {
    const [level, setLevel] = useState(0)
    const animRef = useRef<number>(0)
    const engineRef = useRef<VoiceEffectsEngine | null>(null)

    // Re-apply effects smoothly when they change
    useEffect(() => {
        if (engineRef.current && effects) {
            engineRef.current.apply(effects)
        }
    }, [effects])

    useEffect(() => {
        if (!enabled || !deviceId) {
            setLevel(0)
            if (engineRef.current) {
                engineRef.current.destroy()
                engineRef.current = null
            }
            return
        }

        let cancelled = false
        const engine = new VoiceEffectsEngine()
        engineRef.current = engine
        if (effects) engine.apply(effects)

        const start = async () => {
            const success = await engine.startLivePreview(deviceId, mainOutputId)
            if (cancelled) { engine.destroy(); return }

            if (success) {
                const dataArray = new Uint8Array(engine.analyser.frequencyBinCount)
                let lastUpdate = 0
                const METER_INTERVAL = 66 // ~15fps — visually smooth for level meters
                const tick = (now: number) => {
                    if (cancelled) return
                    if (now - lastUpdate >= METER_INTERVAL) {
                        lastUpdate = now
                        engine.analyser.getByteFrequencyData(dataArray)
                        let sum = 0
                        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i]
                        const rms = Math.sqrt(sum / dataArray.length) / 255
                        setLevel(rms)
                    }
                    animRef.current = requestAnimationFrame(tick)
                }
                animRef.current = requestAnimationFrame(tick)
            }
        }
        start()

        return () => {
            cancelled = true
            cancelAnimationFrame(animRef.current)
            engine.destroy()
            engineRef.current = null
            setLevel(0)
        }
    }, [deviceId, enabled, mainOutputId]) // Recreate on output device change

    return level
}

// Apply a singer's Vocal FX / Autotune toggle to their effects object. Returns
// the SAME reference when both are on (no change) so the engine doesn't need to
// re-apply. "Vocal FX off" force-disables every processing block EXCEPT pitch
// correction; "Autotune off" disables only pitch correction — the two switches
// are independent, matching the mobile companion's two toggles.
function applyFxToggles(fx: any, vocalFx: boolean, autotune: boolean): any {
    if (!fx || (vocalFx && autotune)) return fx
    const out: any = { ...fx }
    if (!vocalFx) {
        const off = (block: any) => (block ? { ...block, enabled: false } : block)
        out.compressor = off(fx.compressor)
        out.eq = off(fx.eq)
        out.reverb = off(fx.reverb)
        out.chorus = off(fx.chorus)
        out.delay = off(fx.delay)
        out.distortion = off(fx.distortion)
        out.noiseGate = off(fx.noiseGate)
        if (fx.vocoder) out.vocoder = off(fx.vocoder)
        if (fx.doubler) out.doubler = off(fx.doubler)
    }
    if (!autotune && fx.pitchCorrection) {
        out.pitchCorrection = { ...fx.pitchCorrection, enabled: false }
    }
    return out
}

// ---- Mic Meter Component ----
function MicMeter({ singer, active, effects, vocalFx = true, autotune = true, mainOutputId, theme }: { singer: { name: string; color: string; micDeviceId: string; guestId?: string }; active: boolean; effects: any; vocalFx?: boolean; autotune?: boolean; mainOutputId: string; theme: any }) {
    // Layer the guest's per-mic FX/autotune toggle on top of the song's effects.
    // Memoized on the (stable) effects ref + the two booleans so the engine only
    // re-applies when something actually changes — not on every render.
    const fxEffects = useMemo(() => applyFxToggles(effects, vocalFx, autotune), [effects, vocalFx, autotune])
    const level = useSingerMic(singer.micDeviceId, active, fxEffects, mainOutputId)
    const guests = useGuestsMap()
    const bars = 8
    const activeBars = Math.round(level * bars * 2.5)

    // Resolve the singer's live name + avatar from the canonical guest record.
    const guest = singer.guestId ? guests.get(singer.guestId) : undefined
    const pic = guest?.profile_picture ?? null
    const displayName = guest?.name ?? singer.name

    // Fallback for dark bars if background is bright
    const inactiveColor = theme.appBg === '#FFF8EE' || theme.appBg === '#faf4ed' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {pic && (
                <img src={pic} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 12, fontFamily: theme.fontDisplay, fontWeight: 600, color: 'inherit', letterSpacing: 0.5 }}>
                {displayName}
            </span>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 2, height: 16,
            }}>
                {Array.from({ length: bars }, (_, i) => {
                    const isActive = i < activeBars
                    const h = 4 + (i / bars) * 12
                    return (
                        <div key={i} style={{
                            width: 3, height: h, borderRadius: 2,
                            background: isActive ? singer.color : inactiveColor,
                            transition: 'background 0.08s ease',
                            boxShadow: isActive ? `0 0 4px ${singer.color}` : 'none',
                        }} />
                    )
                })}
            </div>
        </div>
    )
}

// ---- Open (unclaimed) Mics ----
// Every configured mic slot stays live for the whole song, not just the ones a
// signed-up singer occupies, so anyone can grab a spare mic and hop in mid-song.
// A spare mic runs the FIRST singer's effects chain (nobody owns it, so it gets
// the lead treatment) at its own slot level.

// Resolve the effects entry a singer index maps to. Songs store either one
// VoiceEffects object (uniform) or one per role; a singer's first roleIndex
// picks their entry, falling back to the first.
function resolveSingerEffects(
    effects: VoiceEffects | VoiceEffects[] | null,
    singer: Singer | undefined
): VoiceEffects | null {
    if (!effects) return null
    if (!Array.isArray(effects)) return effects
    const index = singer?.roleIndices && singer.roleIndices.length > 0 ? singer.roleIndices[0] : 0
    return effects[index] || effects[0] || null
}

// One unclaimed mic. Renders nothing — it just owns the mic engine lifecycle
// via useSingerMic, exactly like a singer's MicMeter does.
function OpenMic({ deviceId, effects, mainOutputId, active }: {
    deviceId: string
    effects: VoiceEffects | null
    mainOutputId: string
    active: boolean
}) {
    useSingerMic(deviceId, active && !!deviceId, effects, mainOutputId)
    return null
}

// Mounts an engine for every configured mic device no singer in this song is
// already using. Same lifetime as the singers' mics (ready + playing), so the
// spares warm up on deck and stay open until the song leaves the stage.
function OpenMics({ micSlots, singers, voiceEffects, vocalFx, autotune, mainOutputId, active }: {
    micSlots: MicSlotConfig[]
    singers: Singer[]
    voiceEffects: VoiceEffects | VoiceEffects[] | null
    vocalFx: boolean
    autotune: boolean
    mainOutputId: string
    active: boolean
}) {
    // Devices already driven by a singer's own MicMeter — never double-open one.
    // Compared as full slot ids (including any `#ch=N` suffix) so two channels
    // of the same interface still count as two separate mics.
    const claimedKey = singers.map(s => s.micDeviceId).filter(Boolean).join('|')
    const slotsKey = micSlots.map(s => `${s.micDeviceId}@${s.micLevel ?? 1}`).join('|')
    const openMics = useMemo(() => {
        const claimed = new Set(claimedKey ? claimedKey.split('|') : [])
        const seen = new Set<string>()
        const out: { deviceId: string; micLevel: number; slotIndex: number }[] = []
        micSlots.forEach((slot, slotIndex) => {
            const deviceId = slot.micDeviceId
            if (!deviceId || claimed.has(deviceId) || seen.has(deviceId)) return
            seen.add(deviceId)
            out.push({ deviceId, micLevel: slot.micLevel ?? 1.0, slotIndex })
        })
        return out
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slotsKey, claimedKey])

    // Whose treatment each open mic borrows: the singer holding that slot if the
    // song has one (a singer whose mic the host cleared), otherwise the FIRST
    // singer. Keyed by the resolved role index so the memo below only recomputes
    // when the mapping really changes.
    const roleKey = openMics
        .map(m => {
            const owner = singers[m.slotIndex] ?? singers[0]
            return owner?.roleIndices && owner.roleIndices.length > 0 ? owner.roleIndices[0] : 0
        })
        .join(',')

    // One stable effects object per open mic — the borrowed chain at the slot's
    // own level — so the engine only re-applies when something actually changed.
    // An open mic has no owner, so its FX/autotune toggles come from the host's
    // session flags, not a singer's personal (guest-keyed) override.
    const perMicEffects = useMemo(
        () => openMics.map(m => {
            const owner = singers[m.slotIndex] ?? singers[0]
            const fx = applyFxToggles(resolveSingerEffects(voiceEffects, owner), vocalFx, autotune)
            return fx ? { ...fx, micLevel: m.micLevel } : null
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [openMics, voiceEffects, roleKey, vocalFx, autotune]
    )

    return (
        <>
            {openMics.map((m, i) => (
                <OpenMic
                    key={m.deviceId}
                    deviceId={m.deviceId}
                    effects={perMicEffects[i]}
                    mainOutputId={mainOutputId}
                    active={active}
                />
            ))}
        </>
    )
}

// Clean "stage speech" mic chain — no autotune, gentle compression, a touch of
// room reverb, and a noise gate. Used for award-winner speeches.
const SPEECH_EFFECTS = {
    pitchCorrection: { enabled: false, strength: 0 },
    compressor: { enabled: true, threshold: -18, ratio: 3, attack: 0.003, release: 0.25 },
    eq: { enabled: false, lowGain: 0, midGain: 0, highGain: 0 },
    chorus: { enabled: false, rate: 1, depth: 0, mix: 0 },
    delay: { enabled: false, time: 0, feedback: 0, mix: 0 },
    reverb: { enabled: true, decay: 1.1, preDelay: 8, mix: 10 },
    distortion: { enabled: false, drive: 0, mix: 0 },
    noiseGate: { enabled: true, threshold: -45 }
}

// Live "main mic" used during an award-winner speech. Runs ONLY on the stage
// window (the one wired to the speakers), so we never double-open the device.
// Renders nothing — it just owns the mic engine lifecycle via useSingerMic.
function SpeechMic({ deviceId, outputId, enabled }: { deviceId: string; outputId: string; enabled: boolean }) {
    const isStage = !!window.electronAPI?.isStageWindow
    useSingerMic(deviceId, isStage && enabled && !!deviceId, SPEECH_EFFECTS, outputId)
    return null
}

// Looping Oscars score under the awards reveal. Stage-window only (the window
// wired to the speakers). Fades in on mount, ducks under the winner's speech so
// they can be heard, and stops when the reveal closes. Renders nothing.
function AwardsBgMusic({ duck, outputId }: { duck: boolean; outputId: string }) {
    const ref = useRef<HTMLAudioElement | null>(null)
    useEffect(() => {
        if (!window.electronAPI?.isStageWindow) return
        const a = new Audio(OSCARS_MUSIC_URL)
        a.loop = true
        a.volume = 0
        ref.current = a
        const setSinkId = (a as unknown as { setSinkId?: (id: string) => Promise<void> }).setSinkId
        if (outputId && typeof setSinkId === 'function') setSinkId.call(a, outputId).catch(() => {})
        a.play().catch(() => {})
        return () => { a.pause(); a.src = ''; ref.current = null }
    }, [outputId])
    // Smoothly ramp the volume toward the target whenever the duck state changes
    // (and on the initial mount, which fades up from 0).
    useEffect(() => {
        const a = ref.current
        if (!a) return
        const target = duck ? 0.08 : 0.3
        let raf = 0
        const step = () => {
            const cur = a.volume
            const d = target - cur
            if (Math.abs(d) < 0.004) { a.volume = target; return }
            a.volume = Math.max(0, Math.min(1, cur + d * 0.12))
            raf = requestAnimationFrame(step)
        }
        step()
        return () => cancelAnimationFrame(raf)
    }, [duck])
    return null
}

// ---- Reactions Overlay (floats above video, behind lyrics) ----
interface ReactionData {
    id: string
    reactionType: 'emoji' | 'text' | 'meme' | 'photo'
    content: string
    senderName: string
    senderProfilePicture?: string | null
    senderGuestId?: string | null
    x: number // offset from the anchored edge (%)
    side: 'left' | 'right'
}

function ReactionsOverlay() {
    const [reactions, setReactions] = useState<ReactionData[]>([])
    // Clients send only the guest id (the base64 photo is too big for a Realtime
    // broadcast); resolve the avatar from the locally-loaded guest roster.
    const guestsMap = useGuestsMap()

    useEffect(() => {
        if (!window.electronAPI?.onReaction) return

        const handler = window.electronAPI.onReaction((reaction: any) => {
            // Tomatoes (splatter) and flowers (thrown + settle) have their own
            // canvas layers — don't also render them as floating emoji bubbles.
            if (reaction?.content === TOMATO_EMOJI || reaction?.content === FLOWER_EMOJI) return
            const side = Math.random() < 0.5 ? 'left' as const : 'right' as const
            const r: ReactionData = {
                ...reaction,
                side,
                x: 2 + Math.random() * 18 // 2%-20% offset from the anchored edge
            }
            setReactions(prev => {
                const next = [...prev, r]
                return next.length > 15 ? next.slice(-15) : next
            })
            // Text, photo, and meme reactions persist for twice as long as
            // emoji reactions. The matching animation duration lives on
            // .reaction-bubble--persistent so the bubble actually stays
            // visible the whole time (not just sitting in the DOM at opacity 0).
            const duration = (reaction.reactionType === 'text' || reaction.reactionType === 'photo' || reaction.reactionType === 'meme') ? 9000 : 4500
            setTimeout(() => {
                setReactions(prev => prev.filter(item => item.id !== r.id))
            }, duration)
        })

        return () => {
            window.electronAPI?.offReaction(handler)
        }
    }, [])

    if (reactions.length === 0) return null

    const renderAvatar = (r: ReactionData) => {
        // Prefer the locally-known photo for the guest id; fall back to any photo
        // sent inline (legacy/website), then to the sender's initial.
        const pic = (r.senderGuestId && guestsMap.get(r.senderGuestId)?.profile_picture) || r.senderProfilePicture
        return pic ? (
            <img className="reaction-bubble__avatar" src={pic} alt="" />
        ) : (
            <div className="reaction-bubble__avatar-initial">
                {(r.senderName || '?').charAt(0).toUpperCase()}
            </div>
        )
    }

    // Stable per-sender accent from the universal singer palette, so each guest's
    // bubble keeps a consistent identity color across all their reactions.
    const accentFor = (r: ReactionData) => {
        const key = r.senderGuestId || r.senderName || r.id
        let h = 0
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
        return NEON_COLORS[h % NEON_COLORS.length]
    }

    // Larger, ringed avatar used by the text speech bubble.
    const renderTextAvatar = (r: ReactionData) => {
        const pic = (r.senderGuestId && guestsMap.get(r.senderGuestId)?.profile_picture) || r.senderProfilePicture
        return (
            <div className="rxn-text__avatar">
                {pic ? (
                    <img className="rxn-text__avatar-img" src={pic} alt="" />
                ) : (
                    <div className="rxn-text__avatar-initial">
                        {(r.senderName || '?').charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="k-reactions-overlay">
            {reactions.map(r => {
                const pos = r.side === 'left'
                    ? { left: r.x + '%' } as React.CSSProperties
                    : { right: r.x + '%' } as React.CSSProperties

                if (r.reactionType === 'text') {
                    const accent = accentFor(r)
                    const sideClass = r.side === 'right' ? ' rxn-text--right' : ' rxn-text--left'
                    const textStyle: React.CSSProperties = {
                        ...pos,
                        ['--rxn-accent' as string]: accent.color,
                        ['--rxn-glow' as string]: accent.colorGlow,
                    } as React.CSSProperties
                    return (
                        <div key={r.id}
                            className={'reaction-bubble reaction-bubble--persistent rxn-text' + sideClass}
                            style={textStyle}
                        >
                            {renderTextAvatar(r)}
                            <div className="rxn-text__bubble">
                                {r.senderName ? <div className="rxn-text__name">{r.senderName}</div> : null}
                                <div className="rxn-text__msg">{r.content}</div>
                            </div>
                        </div>
                    )
                }
                const isPersistentMedia = r.reactionType === 'meme' || r.reactionType === 'photo'
                return (
                    <div key={r.id} className={'reaction-bubble' + (isPersistentMedia ? ' reaction-bubble--persistent' : '')} style={pos}>
                        {r.reactionType === 'emoji' && (
                            <span className="reaction-bubble__emoji">{r.content}</span>
                        )}
                        {(r.reactionType === 'meme' || r.reactionType === 'photo') && (
                            <img className="reaction-bubble__image" src={r.content} alt="" />
                        )}
                        {renderAvatar(r)}
                        <span className="reaction-bubble__name">{r.senderName}</span>
                    </div>
                )
            })}
        </div>
    )
}

// ── Idle "join the party" stage screen ─────────────────────────────────────
// The themed waiting screen the stage shows whenever no song is up: every
// theme gets its own scene (ending in the Urban fallback for unthemed names).
// Lives at module scope, driven ONLY by its props, so Lobby Mode can mount a
// screen for any theme — not just the active one — and crossfade between them.
function IdleStageScreen({ theme, qrUrl, sessionCode }: {
    theme: Theme
    qrUrl: string | null
    sessionCode: string | null
}) {

    // ---- Neo-Brutal idle ----
    // A printed gig poster at rest: print grid + halftone fields, floating
    // color blocks, scrolling ink tickers top and bottom, a two-layer
    // display headline, and a QR plate that periodically "presses" itself
    // to pull eyes to the code.
    if (theme.name === 'neo-brutal') {
        const heading = 'ADD A SONG'
        const idleBlocks: Array<React.CSSProperties & { rot: number; dur: number }> = [
            { top: '13%', left: '6%', width: 120, height: 120, background: '#FFD60A', rot: -8, dur: 7 },
            { bottom: '15%', right: '7%', width: 92, height: 92, background: '#B388FF', rot: 12, dur: 8.5 },
            { top: '22%', right: '13%', width: 62, height: 62, background: '#00E676', rot: -3, dur: 9.5 },
            { bottom: '22%', left: '12%', width: 74, height: 74, background: '#FF3B30', rot: 6, dur: 8 },
        ]
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: NB_CREAM, position: 'relative', overflow: 'hidden',
            }}>
                <div className="nb-print-grid" style={{ position: 'absolute', inset: 0 }} />
                <div className="nb-dots" style={{ position: 'absolute', top: -120, right: -90, width: 480, height: 480, transform: 'rotate(9deg)' }} />
                <div className="nb-dots" style={{ position: 'absolute', bottom: -140, left: -100, width: 540, height: 540, transform: 'rotate(-6deg)' }} />
                {idleBlocks.map(({ rot, dur, ...pos }, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute', border: `3px solid ${NB_INK}`, boxShadow: `6px 6px 0 ${NB_INK}`,
                            ['--nb-rot' as string]: `${rot}deg`,
                            animation: `nb-float ${dur}s ease-in-out ${i * 0.6}s infinite`,
                            ...pos,
                        }}
                    />
                ))}
                <NbCropMark style={{ top: 26, left: 26 }} />
                <NbCropMark style={{ top: 26, right: 26 }} rotate={90} />
                <NbCropMark style={{ bottom: 26, right: 26 }} rotate={180} />
                <NbCropMark style={{ bottom: 26, left: 26 }} rotate={270} />

                <div style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
                    {/* Ink chip above the headline */}
                    <div className="nb-rise" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: NB_INK, padding: '7px 20px', marginBottom: 22, transform: 'rotate(-1.4deg)' }}>
                        <NbEq color="#FFD60A" fontSize={stageFont(15)} />
                        <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(14), letterSpacing: '0.3em', color: NB_CREAM }}>
                            MIC IS OPEN
                        </span>
                    </div>
                    {/* Two-layer display headline: yellow offset print behind ink */}
                    <h1 className="nb-rise" style={{ position: 'relative', fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(88), lineHeight: 1.02, margin: '0 0 14px', animationDelay: '0.06s' }}>
                        <span aria-hidden style={{ position: 'absolute', left: '0.055em', top: '0.055em', color: '#FFD60A', WebkitTextStroke: `0.028em ${NB_INK}`, whiteSpace: 'nowrap' }}>
                            {heading}
                        </span>
                        <span style={{ position: 'relative', color: NB_INK, whiteSpace: 'nowrap' }}>{heading}</span>
                    </h1>
                    <p className="nb-rise" style={{ fontFamily: theme.fontBody, fontWeight: 700, fontSize: stageFont(17), color: NB_INK, opacity: 0.65, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 40, animationDelay: '0.12s' }}>
                        Scan the code to load the queue
                    </p>
                    {qrUrl && (
                        <div className="nb-rise" style={{ display: 'inline-block', animationDelay: '0.18s' }}>
                            <div style={{
                                padding: 18, background: '#FFFFFF', border: `4px solid ${NB_INK}`,
                                boxShadow: `10px 10px 0 ${NB_INK}`, animation: 'nb-qr-press 5.5s ease-in-out 2s infinite',
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 216, height: 216, display: 'block' }} />
                            </div>
                        </div>
                    )}
                    {sessionCode && (
                        <div className="nb-rise" style={{ display: 'flex', justifyContent: 'center', marginTop: 30, animationDelay: '0.24s' }}>
                            <div style={{
                                padding: '8px 28px', background: '#FFD60A', border: `3px solid ${NB_INK}`,
                                boxShadow: `5px 5px 0 ${NB_INK}`, transform: 'rotate(-1.5deg)',
                            }}>
                                <p style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(26), color: NB_INK, letterSpacing: '0.3em', margin: 0 }}>
                                    {sessionCode}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ---- Cyberpunk idle ----
    if (theme.name === 'cyberpunk') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: '#060610', position: 'relative', overflow: 'hidden',
            }}>
                {/* Dot grid background */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.15,
                    backgroundImage: 'radial-gradient(circle, #00ff88 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }} />
                {/* Scanline overlay */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.3) 2px, rgba(0,255,136,0.3) 4px)',
                }} />

                <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <p style={{
                        fontFamily: 'Share Tech Mono, monospace', fontSize: stageFont(16), color: '#00ff88', opacity: 0.5,
                        letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 12,
                    }}>
                        {'>'} system.queue.status
                    </p>
                    <h1 style={{
                        fontFamily: 'Share Tech Mono, monospace', fontSize: stageFont(56), fontWeight: 400, color: '#00ff88',
                        lineHeight: 1.2, marginBottom: 8,
                        textShadow: '0 0 20px rgba(0,255,136,0.6), 0 0 60px rgba(0,255,136,0.3)',
                    }}>
                        // AWAITING INPUT
                    </h1>
                    <p style={{
                        fontFamily: 'Share Tech Mono, monospace', fontSize: stageFont(14), color: '#00e5ff', opacity: 0.4,
                        marginBottom: 48,
                    }}>
                        scan_qr_code() to enqueue track
                    </p>
                    {qrUrl && (
                        <div style={{
                            display: 'inline-block', padding: 12,
                            border: '1px solid #00ff88',
                            boxShadow: '0 0 15px rgba(0,255,136,0.3), inset 0 0 15px rgba(0,255,136,0.1)',
                        }}>
                            <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, display: 'block' }} />
                        </div>
                    )}
                    {sessionCode && (
                        <p style={{
                            fontFamily: 'Share Tech Mono, monospace', fontSize: stageFont(22), color: '#00ff88',
                            letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 20,
                            textShadow: '0 0 10px rgba(0,255,136,0.5)',
                        }}>
                            [{sessionCode}]
                        </p>
                    )}
                </div>
            </div>
        )
    }

    // ---- Sketch (Hand-Drawn) idle ----
    if (theme.name === 'sketch') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: '#fdfbf7', position: 'relative', overflow: 'hidden',
            }}>
                {/* Dot paper background */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.3,
                    backgroundImage: 'radial-gradient(circle, #2d2d2d 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }} />

                {/* Hand-drawn doodle decorations */}
                <svg style={{ position: 'absolute', top: 80, left: 100, width: 60, height: 60, opacity: 0.2 }} viewBox="0 0 60 60">
                    <path d="M30 5 L35 20 L50 20 L38 30 L42 45 L30 36 L18 45 L22 30 L10 20 L25 20 Z" fill="none" stroke="#2d2d2d" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                <svg style={{ position: 'absolute', bottom: 100, right: 120, width: 50, height: 50, opacity: 0.15 }} viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#ff4d4d" strokeWidth="2.5" strokeDasharray="4 3" />
                </svg>
                <svg style={{ position: 'absolute', top: 160, right: 180, width: 40, height: 40, opacity: 0.2 }} viewBox="0 0 40 40">
                    <path d="M5 35 Q10 5 20 20 Q30 35 35 8" fill="none" stroke="#2d5da1" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <svg style={{ position: 'absolute', bottom: 140, left: 200, width: 45, height: 30, opacity: 0.2 }} viewBox="0 0 45 30">
                    <path d="M5 15 Q12 2 22 15 Q32 28 40 12" fill="none" stroke="#ff4d4d" strokeWidth="2" strokeLinecap="round" />
                </svg>

                <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <h1 style={{
                        fontFamily: 'Kalam, cursive', fontSize: stageFont(68), fontWeight: 700, color: '#2d2d2d',
                        lineHeight: 1.2, marginBottom: 8,
                        transform: 'rotate(-1.5deg)',
                    }}>
                        Add a song!
                    </h1>
                    <p style={{
                        fontFamily: 'Patrick Hand, cursive', fontSize: stageFont(22), color: '#2d2d2d', opacity: theme.name === 'sketch' ? 0.9 : 0.5,
                        marginBottom: 44, transform: 'rotate(0.5deg)',
                    }}>
                        Scan this to pick your tune
                    </p>
                    {qrUrl && (
                        <div style={{
                            display: 'inline-block', padding: 16,
                            background: 'white', border: '3px solid #2d2d2d',
                            borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
                            boxShadow: '4px 4px 0 rgba(0,0,0,0.12)',
                            transform: 'rotate(1deg)',
                        }}>
                            <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, display: 'block', borderRadius: 4 }} />
                        </div>
                    )}
                    {sessionCode && (
                        <p style={{
                            fontFamily: 'Kalam, cursive', fontSize: stageFont(26), fontWeight: 700, color: '#2d5da1',
                            letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 20,
                            transform: 'rotate(-0.8deg)',
                        }}>
                            {sessionCode}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    // ---- Deep Sea idle ----
    if (theme.name === 'deep-sea') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: 'linear-gradient(180deg, #020612 0%, #040918 30%, #071840 70%, #0a1a3a 100%)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Caustic light refraction */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.05,
                    background: 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(0,255,200,0.4) 0deg, transparent 30deg, rgba(180,77,255,0.3) 60deg, transparent 90deg)',
                    backgroundSize: '180px 180px',
                    filter: 'blur(30px)',
                    animation: 'dsCausticDrift 25s linear infinite',
                }} />

                {/* Jellyfish SVG — top left, drifting */}
                <svg style={{ position: 'absolute', top: 80, left: 100, width: 90, height: 120, opacity: 0.2, animation: 'dsBubbleRise 22s ease-in-out infinite alternate' }} viewBox="0 0 60 80">
                    <ellipse cx="30" cy="22" rx="22" ry="18" fill="none" stroke="rgba(180,77,255,0.7)" strokeWidth="1.5" />
                    <ellipse cx="30" cy="22" rx="22" ry="18" fill="rgba(180,77,255,0.08)" />
                    <path d="M12 34 Q14 50 10 70" fill="none" stroke="rgba(180,77,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M22 36 Q24 55 20 75" fill="none" stroke="rgba(180,77,255,0.35)" strokeWidth="1" strokeLinecap="round" />
                    <path d="M30 38 Q30 58 28 78" fill="none" stroke="rgba(180,77,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M38 36 Q36 55 40 75" fill="none" stroke="rgba(180,77,255,0.35)" strokeWidth="1" strokeLinecap="round" />
                    <path d="M48 34 Q46 50 50 70" fill="none" stroke="rgba(180,77,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
                </svg>

                {/* Jellyfish SVG — bottom right, different color */}
                <svg style={{ position: 'absolute', bottom: 100, right: 120, width: 70, height: 95, opacity: 0.15, animation: 'dsBubbleRise 28s ease-in-out infinite alternate-reverse' }} viewBox="0 0 60 80">
                    <ellipse cx="30" cy="22" rx="20" ry="16" fill="none" stroke="rgba(0,255,200,0.6)" strokeWidth="1.5" />
                    <ellipse cx="30" cy="22" rx="20" ry="16" fill="rgba(0,255,200,0.06)" />
                    <path d="M14 32 Q16 48 12 68" fill="none" stroke="rgba(0,255,200,0.35)" strokeWidth="1" strokeLinecap="round" />
                    <path d="M24 34 Q26 52 22 72" fill="none" stroke="rgba(0,255,200,0.3)" strokeWidth="1" strokeLinecap="round" />
                    <path d="M36 34 Q34 52 38 72" fill="none" stroke="rgba(0,255,200,0.3)" strokeWidth="1" strokeLinecap="round" />
                    <path d="M46 32 Q44 48 48 68" fill="none" stroke="rgba(0,255,200,0.35)" strokeWidth="1" strokeLinecap="round" />
                </svg>

                {/* Small jellyfish — top right */}
                <svg style={{ position: 'absolute', top: 200, right: 220, width: 45, height: 60, opacity: 0.12, animation: 'dsBubbleRise 18s ease-in-out infinite alternate' }} viewBox="0 0 60 80">
                    <ellipse cx="30" cy="22" rx="18" ry="14" fill="none" stroke="rgba(255,107,138,0.5)" strokeWidth="1.5" />
                    <ellipse cx="30" cy="22" rx="18" ry="14" fill="rgba(255,107,138,0.06)" />
                    <path d="M16 30 Q18 45 14 62" fill="none" stroke="rgba(255,107,138,0.3)" strokeWidth="1" strokeLinecap="round" />
                    <path d="M30 32 Q30 48 28 65" fill="none" stroke="rgba(255,107,138,0.3)" strokeWidth="1" strokeLinecap="round" />
                    <path d="M44 30 Q42 45 46 62" fill="none" stroke="rgba(255,107,138,0.3)" strokeWidth="1" strokeLinecap="round" />
                </svg>

                {/* Bubble clusters */}
                <svg style={{ position: 'absolute', bottom: 60, left: 200, width: 40, height: 80, opacity: 0.15, animation: 'dsBubbleRise 15s linear infinite' }} viewBox="0 0 40 80">
                    <circle cx="20" cy="60" r="8" fill="none" stroke="rgba(0,255,200,0.4)" strokeWidth="1" />
                    <circle cx="12" cy="40" r="5" fill="none" stroke="rgba(0,255,200,0.3)" strokeWidth="0.8" />
                    <circle cx="28" cy="25" r="3.5" fill="none" stroke="rgba(0,255,200,0.25)" strokeWidth="0.8" />
                    <circle cx="18" cy="10" r="2" fill="none" stroke="rgba(0,255,200,0.2)" strokeWidth="0.6" />
                </svg>
                <svg style={{ position: 'absolute', bottom: 40, right: 300, width: 35, height: 70, opacity: 0.12, animation: 'dsBubbleRise 20s linear infinite' }} viewBox="0 0 40 80">
                    <circle cx="22" cy="65" r="7" fill="none" stroke="rgba(180,77,255,0.35)" strokeWidth="1" />
                    <circle cx="15" cy="45" r="4.5" fill="none" stroke="rgba(180,77,255,0.3)" strokeWidth="0.8" />
                    <circle cx="25" cy="28" r="3" fill="none" stroke="rgba(180,77,255,0.25)" strokeWidth="0.8" />
                </svg>

                {/* Ambient light rays from above */}
                <div style={{
                    position: 'absolute', top: 0, left: '20%', width: '15%', height: '60%',
                    background: 'linear-gradient(180deg, rgba(0,255,200,0.04) 0%, transparent 100%)',
                    transform: 'skewX(-8deg)', transformOrigin: 'top',
                }} />
                <div style={{
                    position: 'absolute', top: 0, right: '25%', width: '10%', height: '50%',
                    background: 'linear-gradient(180deg, rgba(180,77,255,0.03) 0%, transparent 100%)',
                    transform: 'skewX(5deg)', transformOrigin: 'top',
                }} />

                <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <p style={{
                        fontFamily: 'Nunito, sans-serif', fontSize: stageFont(14), color: '#00ffc8', opacity: 0.4,
                        letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 10,
                    }}>
                        ~ now surfacing ~
                    </p>
                    <h1 style={{
                        fontFamily: 'Quicksand, sans-serif', fontSize: stageFont(68), fontWeight: 700, color: '#e0fff8',
                        lineHeight: 1.1, marginBottom: 8,
                        textShadow: '0 0 30px rgba(0,255,200,0.5), 0 0 60px rgba(0,255,200,0.25), 0 0 100px rgba(180,77,255,0.15)',
                    }}>
                        Add a Song
                    </h1>
                    <p style={{
                        fontFamily: 'Nunito, sans-serif', fontSize: stageFont(20), color: '#8ecfc2',
                        marginBottom: 44,
                    }}>
                        Scan to dive into the queue
                    </p>
                    {qrUrl && (
                        <div style={{
                            display: 'inline-block', padding: 16, position: 'relative',
                            border: '1px solid rgba(0,255,200,0.25)',
                            borderRadius: 16,
                            boxShadow: '0 0 25px rgba(0,255,200,0.15), 0 0 50px rgba(180,77,255,0.08), inset 0 0 30px rgba(0,255,200,0.03)',
                            background: 'rgba(4,9,24,0.7)',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 8 }} />
                        </div>
                    )}
                    {sessionCode && (
                        <p style={{
                            fontFamily: 'Quicksand, sans-serif', fontSize: stageFont(26), fontWeight: 700, color: '#00ffc8',
                            letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 24,
                            textShadow: '0 0 15px rgba(0,255,200,0.5), 0 0 30px rgba(0,255,200,0.2)',
                        }}>
                            {sessionCode}
                        </p>
                    )}
                </div>
            </div>
        )
    }
    // ---- Psychedelic ("Liquid Light") idle ----
    // THREE THINGS ONLY: the call to action, the QR, the room code. Earlier versions of
    // this screen also carried a "TONIGHT ONLY" kicker and a line of instructions, and
    // before that eight blurred gradient layers and five decorative SVGs. A join screen
    // is read from across a room in about a second; every word that isn't one of those
    // three is a word competing with them.
    //
    // ── The handbill is a SECOND PROJECTOR ──────────────────────────────────
    // Rather than paper, the plate is filled with the same footage as the backdrop at a
    // different point in the clip (see LiquidLight's `phase`), so the screen reads as two
    // dishes running at once — which is exactly what a real liquid light show looked
    // like. It also means the plate is never the same twice.
    //
    // That makes legibility the whole problem, because the footage runs from near-black
    // to pure white and no fixed text colour survives it. So EVERY readable element here
    // is its own solid object: the headline is cream with a fat ink stroke behind it, the
    // code is a dye pill with an ink keyline, and the QR sits on solid white inside an
    // ink frame. Nothing on this screen depends on the luminance of what's behind it.
    if (theme.name === 'psychedelic') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: PSY.INK, position: 'relative', overflow: 'hidden',
            }}>
                <LiquidLight />

                {/* Flat veil, not a vignette: a radial one leaves the corners bright and
                    the plate's edges dissolve into whatever frame is playing. */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                    background: 'rgba(8,6,12,0.42)',
                }} />

                <div style={{
                    position: 'relative', zIndex: 2, overflow: 'hidden',
                    border: `${PSY.LINE}px solid ${PSY.INK}`,
                    borderRadius: psyPoured(0, 34),
                    // Cream sticker ring outside the ink keyline, then a real shadow. The
                    // ink line alone is invisible where the footage behind is dark.
                    boxShadow: `0 0 0 6px ${PSY.CREAM}, 0 26px 70px rgba(0,0,0,0.7)`,
                    animation: 'psy-stamp-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) both',
                }}>
                    {/* The plate's own projector, half a clip away from the backdrop's and
                        pushed a little darker and richer so the type stays on top of it. */}
                    <LiquidLight phase={0.5} filter="saturate(1.5) contrast(1.1) brightness(0.5)" />

                    <div style={{
                        position: 'relative',
                        padding: '52px 60px',
                        display: 'flex', alignItems: 'center', gap: 62,
                    }}>
                        <div>
                            {/* Cream fill over an ink stroke — see psyStroke, which also
                                explains why the width is in em rather than px. */}
                            <h1 style={{
                                fontFamily: PSY.FONT_DISPLAY, fontWeight: 400,
                                fontSize: stageFont(96), lineHeight: 0.92, margin: 0,
                                ...psyStroke(0.042),
                            } as React.CSSProperties}>
                                Add<br />a Song
                            </h1>

                            {/* Footlights — each on its own period AND phase, so the row
                                ripples instead of blinking as one. */}
                            <div style={{ display: 'flex', gap: 13, margin: '26px 0 0' }}>
                                {PSY.DYES.map((dye, i) => (
                                    <span key={dye} style={{
                                        width: 22, height: 22, borderRadius: 999,
                                        background: dye, border: `${PSY.LINE}px solid ${PSY.INK}`,
                                        display: 'inline-block',
                                        animation: `psy-drift ${5.2 + i * 0.7}s ease-in-out ${i * 0.62}s infinite`,
                                    }} />
                                ))}
                            </div>

                            {sessionCode && (
                                <div style={{
                                    display: 'inline-block', marginTop: 26,
                                    background: PSY.DYES[0],
                                    border: `${PSY.LINE}px solid ${PSY.INK}`,
                                    borderRadius: 999,
                                    boxShadow: `0 0 0 4px ${PSY.CREAM}, 0 10px 26px rgba(0,0,0,0.5)`,
                                    padding: '4px 30px 8px',
                                }}>
                                    <span style={{
                                        fontFamily: PSY.FONT_DISPLAY, fontSize: stageFont(44),
                                        color: PSY.INK, letterSpacing: '0.12em',
                                    }}>
                                        {sessionCode}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* The QR must be solid white to scan reliably, so it gets a cream
                            mat and an ink frame rather than sitting on the footage. */}
                        {qrUrl && (
                            <div style={{
                                background: PSY.CREAM,
                                border: `${PSY.LINE}px solid ${PSY.INK}`,
                                borderRadius: psyPoured(1, 24),
                                boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
                                padding: 16,
                            }}>
                                <img
                                    src={qrUrl}
                                    alt="QR"
                                    style={{
                                        width: 262, height: 262, display: 'block',
                                        borderRadius: 8,
                                        border: `${PSY.LINE}px solid ${PSY.INK}`,
                                        background: '#FFFFFF',
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ---- Zen (Japanese Garden) idle ----
    if (theme.name === 'zen') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: 'linear-gradient(180deg, #0e0c09 0%, #1a1814 30%, #1f1b15 60%, #15120e 100%)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Ink wash background overlay */}
                <div style={{
                    position: 'absolute', inset: '-20%', opacity: 0.05,
                    background: 'radial-gradient(ellipse 60% 50% at 25% 30%, rgba(201,168,76,0.5) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 70% 60%, rgba(139,107,74,0.4) 0%, transparent 70%)',
                    filter: 'blur(40px)', animation: 'zenInkDrift 30s ease-in-out infinite',
                }} />

                {/* Mountain silhouettes — back layer */}
                <svg style={{ position: 'absolute', bottom: '18%', left: 0, width: '100%', height: '45%', opacity: 0.08 }} viewBox="0 0 1200 400" preserveAspectRatio="none">
                    <path d="M0 400 L0 280 Q150 120 300 220 Q450 100 600 180 Q750 60 900 200 Q1050 130 1200 250 L1200 400 Z" fill="#B8A898" />
                </svg>
                {/* Mountain silhouettes — mid layer */}
                <svg style={{ position: 'absolute', bottom: '15%', left: 0, width: '100%', height: '40%', opacity: 0.05 }} viewBox="0 0 1200 400" preserveAspectRatio="none">
                    <path d="M0 400 L0 320 Q200 180 400 280 Q550 150 700 240 Q850 170 1000 260 Q1100 200 1200 300 L1200 400 Z" fill="#8B7B6B" />
                </svg>

                {/* Drifting mist — layer 1 (slow) */}
                <div style={{
                    position: 'absolute', top: '35%', left: '-100%', width: '300%', height: 80,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(240,230,211,0.03) 20%, rgba(240,230,211,0.05) 50%, rgba(240,230,211,0.03) 80%, transparent 100%)',
                    animation: 'zenMistDrift 35s linear infinite', filter: 'blur(8px)',
                }} />
                {/* Drifting mist — layer 2 (faster) */}
                <div style={{
                    position: 'absolute', top: '50%', left: '-100%', width: '300%', height: 60,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(240,230,211,0.02) 30%, rgba(240,230,211,0.04) 50%, rgba(240,230,211,0.02) 70%, transparent 100%)',
                    animation: 'zenMistDrift 25s linear infinite reverse', filter: 'blur(12px)',
                }} />
                {/* Drifting mist — layer 3 (subtle) */}
                <div style={{
                    position: 'absolute', top: '65%', left: '-100%', width: '300%', height: 50,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.02) 25%, rgba(201,168,76,0.03) 50%, rgba(201,168,76,0.02) 75%, transparent 100%)',
                    animation: 'zenMistDrift 45s linear infinite', filter: 'blur(15px)',
                }} />

                {/* Bamboo stalks — left */}
                <svg style={{ position: 'absolute', left: 40, top: 0, height: '100%', width: 60, opacity: 0.12 }} viewBox="0 0 60 800">
                    {/* Main stalk */}
                    <line x1="20" y1="0" x2="20" y2="800" stroke="#7BA05B" strokeWidth="3" />
                    <line x1="20" y1="150" x2="20" y2="155" stroke="#5A7A3E" strokeWidth="5" />
                    <line x1="20" y1="350" x2="20" y2="355" stroke="#5A7A3E" strokeWidth="5" />
                    <line x1="20" y1="550" x2="20" y2="555" stroke="#5A7A3E" strokeWidth="5" />
                    {/* Leaves */}
                    <ellipse cx="35" cy="140" rx="18" ry="4" fill="#7BA05B" opacity="0.7" style={{ transformOrigin: '20px 140px', animation: 'zenBambooSway 6s ease-in-out infinite' }} />
                    <ellipse cx="5" cy="340" rx="16" ry="3.5" fill="#7BA05B" opacity="0.6" style={{ transformOrigin: '20px 340px', animation: 'zenBambooSway 7s ease-in-out infinite reverse' }} />
                    <ellipse cx="38" cy="540" rx="15" ry="3" fill="#7BA05B" opacity="0.5" style={{ transformOrigin: '20px 540px', animation: 'zenBambooSway 8s ease-in-out infinite' }} />
                    {/* Second stalk */}
                    <line x1="45" y1="100" x2="45" y2="800" stroke="#7BA05B" strokeWidth="2" opacity="0.6" />
                    <ellipse cx="55" cy="280" rx="12" ry="3" fill="#7BA05B" opacity="0.4" style={{ transformOrigin: '45px 280px', animation: 'zenBambooSway 9s ease-in-out infinite' }} />
                </svg>

                {/* Bamboo stalks — right */}
                <svg style={{ position: 'absolute', right: 40, top: 0, height: '100%', width: 60, opacity: 0.12 }} viewBox="0 0 60 800">
                    <line x1="40" y1="50" x2="40" y2="800" stroke="#7BA05B" strokeWidth="3" />
                    <line x1="40" y1="200" x2="40" y2="205" stroke="#5A7A3E" strokeWidth="5" />
                    <line x1="40" y1="450" x2="40" y2="455" stroke="#5A7A3E" strokeWidth="5" />
                    <line x1="40" y1="650" x2="40" y2="655" stroke="#5A7A3E" strokeWidth="5" />
                    <ellipse cx="25" cy="190" rx="17" ry="3.5" fill="#7BA05B" opacity="0.7" style={{ transformOrigin: '40px 190px', animation: 'zenBambooSway 7s ease-in-out infinite' }} />
                    <ellipse cx="52" cy="440" rx="14" ry="3" fill="#7BA05B" opacity="0.5" style={{ transformOrigin: '40px 440px', animation: 'zenBambooSway 8s ease-in-out infinite reverse' }} />
                    <line x1="15" y1="0" x2="15" y2="800" stroke="#7BA05B" strokeWidth="2" opacity="0.5" />
                    <ellipse cx="5" cy="350" rx="12" ry="2.5" fill="#7BA05B" opacity="0.35" style={{ transformOrigin: '15px 350px', animation: 'zenBambooSway 10s ease-in-out infinite' }} />
                </svg>

                {/* Torii Gate — SVG */}
                <svg style={{ position: 'absolute', bottom: '22%', left: '50%', transform: 'translateX(-50%)', width: 320, height: 260, opacity: 0.25 }} viewBox="0 0 320 260">
                    {/* Top beam (kasagi) — curved */}
                    <path d="M20 30 Q160 5 300 30" stroke="#D4442A" strokeWidth="10" fill="none" strokeLinecap="round" />
                    {/* Second beam (nuki) */}
                    <line x1="45" y1="55" x2="275" y2="55" stroke="#D4442A" strokeWidth="6" />
                    {/* Left pillar */}
                    <line x1="60" y1="30" x2="60" y2="260" stroke="#D4442A" strokeWidth="8" />
                    {/* Right pillar */}
                    <line x1="260" y1="30" x2="260" y2="260" stroke="#D4442A" strokeWidth="8" />
                    {/* Pillar caps */}
                    <circle cx="60" cy="25" r="6" fill="#D4442A" />
                    <circle cx="260" cy="25" r="6" fill="#D4442A" />
                </svg>

                {/* Reflection pool — mirrored torii below */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, width: '100%', height: '18%',
                    background: 'linear-gradient(180deg, transparent 0%, rgba(201,168,76,0.02) 100%)',
                    overflow: 'hidden',
                }}>
                    <svg style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) scaleY(-1)', width: 320, height: 260, opacity: 0.06, filter: 'blur(4px)' }} viewBox="0 0 320 260">
                        <path d="M20 30 Q160 5 300 30" stroke="#D4442A" strokeWidth="10" fill="none" strokeLinecap="round" />
                        <line x1="45" y1="55" x2="275" y2="55" stroke="#D4442A" strokeWidth="6" />
                        <line x1="60" y1="30" x2="60" y2="260" stroke="#D4442A" strokeWidth="8" />
                        <line x1="260" y1="30" x2="260" y2="260" stroke="#D4442A" strokeWidth="8" />
                    </svg>
                </div>

                {/* Enso circle — brush stroke drawing itself */}
                <svg style={{ position: 'absolute', top: '8%', right: '12%', width: 120, height: 120, opacity: 0.1 }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#C9A84C" strokeWidth="4" strokeLinecap="round"
                        strokeDasharray="240" strokeDashoffset="240"
                        style={{ animation: 'zenEnsoDraw 6s ease-in-out infinite alternate' }}
                    />
                    {/* Brush drip at end of stroke */}
                    <circle cx="88" cy="50" r="2" fill="#C9A84C" opacity="0.5" />
                </svg>

                {/* Cherry blossom petals — scattered SVGs */}
                {[
                    { x: '15%', y: '12%', size: 14, delay: 0, dur: 18, opacity: 0.15 },
                    { x: '75%', y: '20%', size: 10, delay: 4, dur: 22, opacity: 0.12 },
                    { x: '30%', y: '8%', size: 12, delay: 8, dur: 20, opacity: 0.1 },
                    { x: '60%', y: '15%', size: 8, delay: 12, dur: 24, opacity: 0.13 },
                    { x: '85%', y: '5%', size: 11, delay: 2, dur: 19, opacity: 0.11 },
                    { x: '45%', y: '25%', size: 9, delay: 6, dur: 21, opacity: 0.14 },
                ].map((p, i) => (
                    <svg key={`petal-${i}`} style={{
                        position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, opacity: p.opacity,
                        animation: `zenPetalFall ${p.dur}s linear ${p.delay}s infinite`,
                    }} viewBox="0 0 10 10">
                        <ellipse cx="5" cy="5" rx="4" ry="2.5" fill="#E8A0BF" transform="rotate(30 5 5)" />
                    </svg>
                ))}

                {/* Incense smoke wisps */}
                <div style={{
                    position: 'absolute', bottom: '25%', left: '48%', width: 2, height: 200,
                    background: 'linear-gradient(180deg, transparent 0%, rgba(240,230,211,0.06) 30%, rgba(240,230,211,0.03) 70%, transparent 100%)',
                    animation: 'zenSmoke 12s ease-in-out infinite', filter: 'blur(3px)',
                }} />
                <div style={{
                    position: 'absolute', bottom: '25%', left: '52%', width: 1.5, height: 150,
                    background: 'linear-gradient(180deg, transparent 0%, rgba(201,168,76,0.04) 40%, rgba(201,168,76,0.02) 70%, transparent 100%)',
                    animation: 'zenSmoke 15s ease-in-out 3s infinite', filter: 'blur(4px)',
                }} />

                {/* Content */}
                <div style={{ textAlign: 'center', zIndex: 2 }}>
                    <h1 style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: stageFont(72), color: '#F0E6D3',
                        fontWeight: 500, fontStyle: 'italic', lineHeight: 1.1, marginBottom: 8,
                        textShadow: '0 0 30px rgba(201,168,76,0.25), 0 0 60px rgba(201,168,76,0.1)',
                        letterSpacing: '0.05em',
                    }}>
                        Find Your Song
                    </h1>
                    <p style={{
                        fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: stageFont(16), color: '#B8A898',
                        letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 48,
                    }}>
                        Scan to begin
                    </p>
                    {qrUrl && (
                        <div style={{
                            display: 'inline-block', padding: 14,
                            border: '1px solid rgba(201,168,76,0.3)',
                            borderImage: 'linear-gradient(135deg, transparent 0%, rgba(201,168,76,0.5) 15%, transparent 25%, transparent 50%, rgba(201,168,76,0.4) 60%, transparent 70%, transparent 85%, rgba(201,168,76,0.5) 95%, transparent 100%) 1',
                            background: 'rgba(26,24,20,0.7)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: 8,
                        }}>
                            <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 4 }} />
                        </div>
                    )}
                    {sessionCode && (
                        <p style={{
                            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: stageFont(28), fontWeight: 600,
                            color: '#C9A84C', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 20,
                            textShadow: '0 0 15px rgba(201,168,76,0.3)',
                        }}>
                            {sessionCode}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    // ---- Space ("Flight Deck") idle ----
    // A cockpit console floating in front of a real 3D outboard view. The old
    // version stacked eight decorative SVG layers here — warp trails, two
    // galaxies, a Saturn, orbiting particles, a blurred nebula. All of that is
    // now actual geometry in <SpaceOutboard>, which both looks better and costs
    // less than a 50px blur filter over a fixed full-screen element.
    if (theme.name === 'space') {
        const CUT = 24
        const clip = (cut: number) =>
            `polygon(${cut}px 0, 100% 0, 100% calc(100% - ${cut}px), calc(100% - ${cut}px) 100%, 0 100%, 0 ${cut}px)`
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: '#04060B', position: 'relative', overflow: 'hidden',
            }}>
                <SpaceOutboard />

                {/* Vignette — pulls the eye to the console without hiding the
                    station in the upper right or the planet's limb below. */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                    background: 'radial-gradient(ellipse 58% 52% at 50% 52%, rgba(4,6,11,0.80) 0%, rgba(4,6,11,0.34) 58%, transparent 100%)',
                }} />

                {/* ── The console plate ──────────────────────────────────────
                    Outer element's background is the 1px hairline; the fill sits
                    on an inset child. A plain CSS border would be sliced off at
                    the 45° cuts by clip-path. */}
                <div style={{
                    position: 'relative', zIndex: 2,
                    background: 'rgba(91,233,255,0.26)',
                    clipPath: clip(CUT),
                    boxShadow: '0 18px 60px rgba(0,0,0,0.7)',
                }}>
                    <div style={{
                        clipPath: clip(CUT - 1),
                        margin: 1,
                        background: 'linear-gradient(158deg, rgba(19,28,39,0.96) 0%, rgba(6,10,17,0.97) 100%)',
                        backdropFilter: 'blur(14px)',
                        padding: '38px 46px',
                        display: 'flex', alignItems: 'center', gap: 52,
                    }}>
                        {/* Left: the legend and the session readout */}
                        <div style={{ position: 'relative', paddingLeft: 20 }}>
                            {/* System bar — the theme's one-lamp state cue */}
                            <div style={{
                                position: 'absolute', left: 0, top: 4, bottom: 4, width: 3,
                                background: '#5BE9FF', boxShadow: '0 0 12px rgba(91,233,255,0.7)',
                            }} />
                            <p style={{
                                fontFamily: "'Share Tech Mono', monospace", fontSize: stageFont(13),
                                letterSpacing: '0.26em', color: '#4E5C6D', margin: '0 0 10px',
                            }}>
                                SYS/LAUNCH — STANDING BY
                            </p>
                            <h1 style={{
                                fontFamily: "'Chakra Petch', sans-serif", fontSize: stageFont(58), color: '#DCE6F2',
                                fontWeight: 600, lineHeight: 1.02, margin: 0,
                                textShadow: '0 0 28px rgba(91,233,255,0.30)',
                                letterSpacing: '0.1em', textTransform: 'uppercase',
                            }}>
                                Launch<br />a Song
                            </h1>

                            {/* Machined rule: lit segment, then an engraved ladder */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '18px 0 16px' }}>
                                <div style={{ width: 54, height: 2, background: '#5BE9FF' }} />
                                <div style={{
                                    flex: 1, height: 4,
                                    background: 'repeating-linear-gradient(90deg, rgba(90,107,125,0.5) 0 1px, transparent 1px 12px)',
                                }} />
                            </div>

                            <p style={{
                                fontFamily: "'Exo 2', sans-serif", fontSize: stageFont(15), color: '#7B8A9C',
                                letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 20px',
                            }}>
                                Scan to queue from orbit
                            </p>

                            {sessionCode && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{
                                        fontFamily: "'Share Tech Mono', monospace", fontSize: stageFont(12),
                                        letterSpacing: '0.24em', color: '#4E5C6D',
                                    }}>
                                        DECK
                                    </span>
                                    <span style={{
                                        fontFamily: "'Share Tech Mono', monospace", fontSize: stageFont(34),
                                        color: '#5BE9FF', letterSpacing: '0.2em',
                                        textShadow: '0 0 18px rgba(91,233,255,0.5)',
                                    }}>
                                        {sessionCode}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Right: the QR in a recessed bay with registration marks */}
                        {qrUrl && (
                            <div style={{ position: 'relative', padding: 14, background: '#070C13' }}>
                                <img src={qrUrl} alt="QR" style={{ width: 228, height: 228, display: 'block' }} />
                                {/* Bay rim + corner registration marks — the same
                                    detail the mobile song cards use on album art. */}
                                <div style={{
                                    position: 'absolute', inset: 0, pointerEvents: 'none',
                                    boxShadow: 'inset 0 0 0 1px rgba(91,233,255,0.4)',
                                }} />
                                {[
                                    { top: -1, left: -1, bx: '2px 0 0 2px' },
                                    { top: -1, right: -1, bx: '2px 2px 0 0' },
                                    { bottom: -1, left: -1, bx: '0 0 2px 2px' },
                                    { bottom: -1, right: -1, bx: '0 2px 2px 0' },
                                ].map((corner, index) => (
                                    <div key={index} style={{
                                        position: 'absolute', width: 14, height: 14,
                                        borderStyle: 'solid', borderColor: '#5A6B7D', borderWidth: corner.bx,
                                        ...corner,
                                    } as React.CSSProperties} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ---- Steampunk (Victorian Industrial) idle ----
    if (theme.name === 'steampunk') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: 'linear-gradient(180deg, #0e0b09 0%, #14110F 35%, #1a1510 65%, #100d0a 100%)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Warm vignette */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at center, rgba(200,151,62,0.03) 0%, transparent 50%, rgba(0,0,0,0.4) 100%)',
                }} />

                {/* Large gear — top right, spinning clockwise */}
                <svg style={{ position: 'absolute', top: -60, right: -40, width: 280, height: 280, opacity: 0.08, animation: 'steamGearSpin 30s linear infinite' }} viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="60" fill="none" stroke="#C8973E" strokeWidth="3" />
                    <circle cx="100" cy="100" r="25" fill="none" stroke="#C8973E" strokeWidth="2" />
                    <circle cx="100" cy="100" r="8" fill="rgba(200,151,62,0.3)" />
                    {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i / 12) * Math.PI * 2
                        const x1 = 100 + Math.cos(angle) * 60
                        const y1 = 100 + Math.sin(angle) * 60
                        const x2 = 100 + Math.cos(angle) * 78
                        const y2 = 100 + Math.sin(angle) * 78
                        return <line key={`gt-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C8973E" strokeWidth="10" strokeLinecap="round" />
                    })}
                </svg>

                {/* Medium gear — bottom left, counter-clockwise (interlocking ratio) */}
                <svg style={{ position: 'absolute', bottom: -30, left: -20, width: 200, height: 200, opacity: 0.06, animation: 'steamGearSpinReverse 20s linear infinite' }} viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="50" fill="none" stroke="#E07040" strokeWidth="2.5" />
                    <circle cx="100" cy="100" r="20" fill="none" stroke="#E07040" strokeWidth="1.5" />
                    <circle cx="100" cy="100" r="6" fill="rgba(224,112,64,0.3)" />
                    {Array.from({ length: 8 }).map((_, i) => {
                        const angle = (i / 8) * Math.PI * 2
                        const x1 = 100 + Math.cos(angle) * 50
                        const y1 = 100 + Math.sin(angle) * 50
                        const x2 = 100 + Math.cos(angle) * 65
                        const y2 = 100 + Math.sin(angle) * 65
                        return <line key={`gb-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E07040" strokeWidth="8" strokeLinecap="round" />
                    })}
                </svg>

                {/* Small gear — mid left, clockwise */}
                <svg style={{ position: 'absolute', top: '40%', left: 60, width: 100, height: 100, opacity: 0.05, animation: 'steamGearSpin 15s linear infinite' }} viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="45" fill="none" stroke="#5A9E8F" strokeWidth="2" />
                    <circle cx="100" cy="100" r="15" fill="none" stroke="#5A9E8F" strokeWidth="1.5" />
                    {Array.from({ length: 6 }).map((_, i) => {
                        const angle = (i / 6) * Math.PI * 2
                        const x1 = 100 + Math.cos(angle) * 45
                        const y1 = 100 + Math.sin(angle) * 45
                        const x2 = 100 + Math.cos(angle) * 58
                        const y2 = 100 + Math.sin(angle) * 58
                        return <line key={`gs-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5A9E8F" strokeWidth="7" strokeLinecap="round" />
                    })}
                </svg>

                {/* Steam pipe network — horizontal pipes with joints */}
                <svg style={{ position: 'absolute', bottom: '25%', left: 0, width: '100%', height: 4, opacity: 0.1 }} preserveAspectRatio="none">
                    <line x1="0" y1="2" x2="100%" y2="2" stroke="#C8973E" strokeWidth="3" />
                </svg>
                {[80, 250, 450, 650, 850].map((x, i) => (
                    <div key={`joint-${i}`} style={{
                        position: 'absolute', bottom: 'calc(25% - 4px)', left: x, width: 10, height: 10,
                        borderRadius: '50%', border: '1.5px solid rgba(200,151,62,0.15)',
                        background: 'rgba(200,151,62,0.06)',
                    }} />
                ))}

                {/* Vertical pipe */}
                <div style={{ position: 'absolute', top: 0, right: '22%', width: 3, height: '25%', background: 'rgba(200,151,62,0.08)' }} />
                <div style={{ position: 'absolute', top: 0, right: 'calc(22% - 3px)', width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(200,151,62,0.12)', background: 'rgba(200,151,62,0.04)', marginTop: 'calc(25% - 4px)' }} />

                {/* Pressure gauge — SVG */}
                <svg style={{ position: 'absolute', top: '15%', right: '10%', width: 80, height: 80, opacity: 0.12 }} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#C8973E" strokeWidth="2" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(200,151,62,0.3)" strokeWidth="0.5" />
                    {/* Tick marks */}
                    {Array.from({ length: 8 }).map((_, i) => {
                        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
                        const x1 = 50 + Math.cos(angle) * 35
                        const y1 = 50 + Math.sin(angle) * 35
                        const x2 = 50 + Math.cos(angle) * 40
                        const y2 = 50 + Math.sin(angle) * 40
                        return <line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C8973E" strokeWidth="1.5" />
                    })}
                    {/* Needle */}
                    <line x1="50" y1="50" x2="50" y2="15" stroke="#E07040" strokeWidth="1.5" strokeLinecap="round" style={{ transformOrigin: '50px 50px', animation: 'steamNeedle 4s ease-in-out infinite' }} />
                    <circle cx="50" cy="50" r="4" fill="#C8973E" />
                </svg>

                {/* Steam puffs rising from pipe joints */}
                {[
                    { x: 83, delay: 0 }, { x: 253, delay: 3 }, { x: 453, delay: 7 }, { x: 853, delay: 5 },
                ].map((p, i) => (
                    <div key={`puff-${i}`} style={{
                        position: 'absolute', bottom: 'calc(25% + 8px)', left: p.x,
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'rgba(212,206,192,0.15)',
                        filter: 'blur(2px)',
                        animation: `steamPuff 8s ease-out ${p.delay}s infinite`,
                    }} />
                ))}

                {/* Victorian scrollwork corners */}
                <svg style={{ position: 'absolute', top: 20, left: 20, width: 80, height: 80, opacity: 0.1 }} viewBox="0 0 80 80">
                    <path d="M5 5 Q5 25 15 18 Q28 8 22 22 Q16 36 28 28 Q40 20 34 34" fill="none" stroke="#C8973E" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="8" cy="8" r="2" fill="rgba(200,151,62,0.4)" />
                </svg>
                <svg style={{ position: 'absolute', bottom: 20, right: 20, width: 80, height: 80, opacity: 0.1, transform: 'rotate(180deg)' }} viewBox="0 0 80 80">
                    <path d="M5 5 Q5 25 15 18 Q28 8 22 22 Q16 36 28 28 Q40 20 34 34" fill="none" stroke="#C8973E" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="8" cy="8" r="2" fill="rgba(200,151,62,0.4)" />
                </svg>

                {/* Gaslight lantern — top center */}
                <svg style={{ position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', width: 30, height: 50, opacity: 0.15 }} viewBox="0 0 30 50">
                    {/* Hook */}
                    <line x1="15" y1="0" x2="15" y2="10" stroke="#C8973E" strokeWidth="1.5" />
                    {/* Lantern body */}
                    <rect x="8" y="10" width="14" height="20" rx="2" fill="none" stroke="#C8973E" strokeWidth="1.5" />
                    {/* Flame glow */}
                    <ellipse cx="15" cy="22" rx="3" ry="5" fill="rgba(232,184,76,0.4)" style={{ animation: 'steamFlicker 3s ease-in-out infinite' }} />
                    {/* Bottom cap */}
                    <line x1="6" y1="30" x2="24" y2="30" stroke="#C8973E" strokeWidth="1.5" />
                    <line x1="10" y1="30" x2="10" y2="34" stroke="#C8973E" strokeWidth="1" />
                    <line x1="20" y1="30" x2="20" y2="34" stroke="#C8973E" strokeWidth="1" />
                </svg>

                {/* Content */}
                <div style={{ textAlign: 'center', zIndex: 2 }}>
                    <h1 style={{
                        fontFamily: "'Cinzel Decorative', serif", fontSize: stageFont(52), color: '#E8DCC8',
                        fontWeight: 400, lineHeight: 1.2, marginBottom: 8,
                        textShadow: '0 0 20px rgba(200,151,62,0.35), 0 0 50px rgba(200,151,62,0.12), 0 0 80px rgba(224,112,64,0.06)',
                        letterSpacing: '0.06em',
                    }}>
                        Queue a Tune
                    </h1>
                    <p style={{
                        fontFamily: "'Spectral', serif", fontSize: stageFont(16), color: '#A89878',
                        letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 48,
                        fontStyle: 'italic',
                    }}>
                        Scan to power the engine
                    </p>
                    {qrUrl && (
                        <div style={{
                            display: 'inline-block', padding: 14,
                            border: '2px solid rgba(200,151,62,0.3)',
                            borderImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 14px, rgba(200,151,62,0.4) 14px, rgba(200,151,62,0.4) 18px, transparent 18px, transparent 32px) 1',
                            background: 'rgba(20,17,15,0.8)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: 4,
                        }}>
                            <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 2 }} />
                        </div>
                    )}
                    {sessionCode && (
                        <p style={{
                            fontFamily: "'Cinzel', serif", fontSize: stageFont(26), fontWeight: 600,
                            color: '#C8973E', letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: 20,
                            textShadow: '0 0 15px rgba(200,151,62,0.3)',
                        }}>
                            {sessionCode}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    // ---- Retrowave (80s Synthwave) idle ----
    if (theme.name === 'retrowave') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: 'linear-gradient(180deg, #0a0614 0%, #0d0820 25%, #150a2e 45%, #1a0828 55%, #2a1040 63%, #8B2060 72%, #FF6B2B 85%, #FFD700 100%)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Starfield — upper portion */}
                {[
                    { x: 8, y: 5, s: 1.5, d: 3.2, c: 'rgba(255,255,255,0.7)' },
                    { x: 15, y: 12, s: 1, d: 4.5, c: 'rgba(255,45,149,0.5)' },
                    { x: 25, y: 3, s: 1.2, d: 3.8, c: 'rgba(255,255,255,0.6)' },
                    { x: 35, y: 18, s: 1, d: 5.1, c: 'rgba(0,191,255,0.5)' },
                    { x: 45, y: 7, s: 1.5, d: 3.5, c: 'rgba(255,255,255,0.8)' },
                    { x: 55, y: 14, s: 1, d: 4.2, c: 'rgba(255,255,255,0.5)' },
                    { x: 62, y: 4, s: 1.3, d: 3.9, c: 'rgba(255,45,149,0.4)' },
                    { x: 72, y: 20, s: 1, d: 5.5, c: 'rgba(255,255,255,0.6)' },
                    { x: 78, y: 9, s: 1.5, d: 3.3, c: 'rgba(0,191,255,0.4)' },
                    { x: 88, y: 16, s: 1, d: 4.8, c: 'rgba(255,255,255,0.7)' },
                    { x: 92, y: 2, s: 1.2, d: 3.6, c: 'rgba(255,255,255,0.5)' },
                    { x: 20, y: 25, s: 1, d: 5.2, c: 'rgba(255,255,255,0.4)' },
                    { x: 40, y: 22, s: 1.3, d: 4.0, c: 'rgba(255,107,43,0.4)' },
                    { x: 60, y: 28, s: 1, d: 4.7, c: 'rgba(255,255,255,0.5)' },
                    { x: 80, y: 24, s: 1.2, d: 3.4, c: 'rgba(255,45,149,0.3)' },
                    { x: 5, y: 30, s: 1, d: 5.0, c: 'rgba(255,255,255,0.4)' },
                    { x: 50, y: 32, s: 1.5, d: 3.7, c: 'rgba(0,191,255,0.3)' },
                    { x: 95, y: 28, s: 1, d: 4.3, c: 'rgba(255,255,255,0.6)' },
                ].map((star, i) => (
                    <div key={`rw-star-${i}`} style={{
                        position: 'absolute', left: `${star.x}%`, top: `${star.y}%`,
                        width: star.s, height: star.s, borderRadius: '50%',
                        background: star.c,
                        animation: `${i % 2 === 0 ? 'rwTwinkle' : 'rwTwinkle2'} ${star.d}s ease-in-out infinite`,
                        animationDelay: `${i * 0.3}s`,
                    }} />
                ))}

                {/* Ambient sun glow — pulsing warm haze behind the sun */}
                <div style={{
                    position: 'absolute', left: '50%', top: '58%', transform: 'translateX(-50%)',
                    width: 500, height: 250, borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(255,107,43,0.25) 0%, rgba(255,45,149,0.08) 40%, transparent 70%)',
                    filter: 'blur(30px)',
                    animation: 'rwSunPulse 5s ease-in-out infinite',
                    zIndex: 0,
                }} />

                {/* Banded Sun — semicircle with horizontal dark stripes */}
                <svg style={{ position: 'absolute', left: '50%', top: '52%', transform: 'translateX(-50%)', width: 320, height: 160, zIndex: 1 }} viewBox="0 0 320 160">
                    <defs>
                        <linearGradient id="rw-sun-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FFD700" />
                            <stop offset="25%" stopColor="#FFAA00" />
                            <stop offset="50%" stopColor="#FF6B2B" />
                            <stop offset="75%" stopColor="#FF2D95" />
                            <stop offset="100%" stopColor="#B44AFF" />
                        </linearGradient>
                        <clipPath id="rw-sun-clip">
                            <circle cx="160" cy="160" r="150" />
                        </clipPath>
                    </defs>
                    {/* Sun body */}
                    <rect x="10" y="0" width="300" height="160" fill="url(#rw-sun-grad)" clipPath="url(#rw-sun-clip)" />
                    {/* Horizontal dark bands — increasing thickness toward bottom */}
                    <rect x="0" y="55" width="320" height="3" fill="#0a0614" opacity="0.6" clipPath="url(#rw-sun-clip)" />
                    <rect x="0" y="68" width="320" height="4" fill="#0a0614" opacity="0.65" clipPath="url(#rw-sun-clip)" />
                    <rect x="0" y="82" width="320" height="5" fill="#0a0614" opacity="0.7" clipPath="url(#rw-sun-clip)" />
                    <rect x="0" y="97" width="320" height="7" fill="#0a0614" opacity="0.75" clipPath="url(#rw-sun-clip)" />
                    <rect x="0" y="114" width="320" height="9" fill="#0a0614" opacity="0.8" clipPath="url(#rw-sun-clip)" />
                    <rect x="0" y="133" width="320" height="12" fill="#0a0614" opacity="0.85" clipPath="url(#rw-sun-clip)" />
                </svg>

                {/* Horizon haze — warm glow at the horizon line */}
                <div style={{
                    position: 'absolute', left: 0, right: 0, top: '62%', height: '8%', zIndex: 1,
                    background: 'linear-gradient(180deg, transparent 0%, rgba(255,107,43,0.12) 30%, rgba(255,45,149,0.08) 70%, transparent 100%)',
                    filter: 'blur(8px)',
                }} />

                {/* Perspective Grid Floor */}
                <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '38%', zIndex: 2 }} viewBox="0 0 1000 380" preserveAspectRatio="none">
                    {/* Horizontal lines — closer spacing near top (horizon) */}
                    {[0, 8, 20, 38, 62, 95, 138, 195, 265, 350].map((y, i) => (
                        <line key={`rw-hline-${i}`} x1="0" y1={y} x2="1000" y2={y}
                            stroke="rgba(255,45,149,0.35)" strokeWidth={i < 3 ? 0.5 : 1} />
                    ))}
                    {/* Vertical lines fanning from center vanishing point */}
                    {Array.from({ length: 17 }, (_, i) => {
                        const topX = 500
                        const bottomX = (i / 16) * 1000
                        return <line key={`rw-vline-${i}`} x1={topX} y1="0" x2={bottomX} y2="380"
                            stroke="rgba(0,191,255,0.3)" strokeWidth={0.8} />
                    })}
                </svg>

                {/* Palm tree silhouette — left (thicker, more detailed) */}
                <svg style={{ position: 'absolute', left: '2%', bottom: '15%', width: 160, height: 300, zIndex: 3 }} viewBox="0 0 160 300">
                    {/* Thick curved trunk */}
                    <path d="M72 300 Q68 240 74 180 Q78 140 80 110 Q82 90 76 65" stroke="#0a0614" strokeWidth="10" fill="none" strokeLinecap="round" />
                    {/* Dense frond canopy — overlapping leaves */}
                    <path d="M76 65 Q10 20 -5 50 Q20 35 76 65" fill="#0a0614" />
                    <path d="M76 65 Q15 -5 0 -10 Q25 10 76 65" fill="#0a0614" />
                    <path d="M76 65 Q50 -15 55 -20 Q62 5 76 65" fill="#0a0614" />
                    <path d="M76 65 Q95 -10 110 0 Q95 15 76 65" fill="#0a0614" />
                    <path d="M76 65 Q110 15 135 25 Q108 30 76 65" fill="#0a0614" />
                    <path d="M76 65 Q115 40 145 55 Q110 48 76 65" fill="#0a0614" />
                    {/* Drooping frond tips */}
                    <path d="M76 65 Q5 45 -10 65" stroke="#0a0614" strokeWidth="2.5" fill="none" />
                    <path d="M76 65 Q120 50 150 68" stroke="#0a0614" strokeWidth="2.5" fill="none" />
                </svg>

                {/* Palm tree silhouette — right (mirrored, slightly smaller) */}
                <svg style={{ position: 'absolute', right: '3%', bottom: '17%', width: 140, height: 260, zIndex: 3, transform: 'scaleX(-1)' }} viewBox="0 0 160 300">
                    <path d="M72 300 Q68 240 74 180 Q78 140 80 110 Q82 90 76 65" stroke="#0a0614" strokeWidth="10" fill="none" strokeLinecap="round" />
                    <path d="M76 65 Q10 20 -5 50 Q20 35 76 65" fill="#0a0614" />
                    <path d="M76 65 Q15 -5 0 -10 Q25 10 76 65" fill="#0a0614" />
                    <path d="M76 65 Q50 -15 55 -20 Q62 5 76 65" fill="#0a0614" />
                    <path d="M76 65 Q95 -10 110 0 Q95 15 76 65" fill="#0a0614" />
                    <path d="M76 65 Q110 15 135 25 Q108 30 76 65" fill="#0a0614" />
                    <path d="M76 65 Q115 40 145 55 Q110 48 76 65" fill="#0a0614" />
                    <path d="M76 65 Q5 45 -10 65" stroke="#0a0614" strokeWidth="2.5" fill="none" />
                    <path d="M76 65 Q120 50 150 68" stroke="#0a0614" strokeWidth="2.5" fill="none" />
                </svg>

                {/* VHS Tracking Line */}
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: 3, zIndex: 10,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,45,149,0.15) 15%, rgba(255,255,255,0.3) 45%, rgba(0,191,255,0.2) 65%, rgba(255,45,149,0.15) 85%, transparent 100%)',
                    boxShadow: '0 0 8px rgba(255,45,149,0.2), 0 0 20px rgba(0,191,255,0.1)',
                    animation: 'rwVhsTrack 8s linear infinite',
                }} />

                {/* Content — positioned above the sun */}
                <div style={{
                    position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 16, textAlign: 'center', marginTop: -160,
                }}>
                    <h1 style={{
                        fontFamily: "'Audiowide', sans-serif", fontSize: stageFont(80), fontWeight: 400,
                        background: 'linear-gradient(180deg, #FFD700 0%, #FF6B2B 40%, #FF2D95 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 25px rgba(255,45,149,0.5)) drop-shadow(0 0 8px rgba(255,107,43,0.4))',
                        margin: 0, letterSpacing: 6,
                    }}>
                        HIT PLAY
                    </h1>
                    <p style={{
                        fontFamily: "'Rajdhani', sans-serif", fontSize: stageFont(16), color: 'rgba(155,140,191,0.7)',
                        letterSpacing: 8, textTransform: 'uppercase', margin: 0,
                    }}>
                        Scan to ride the wave
                    </p>

                    {qrUrl && (
                        <div style={{
                            background: 'rgba(10,6,20,0.9)', padding: 18, borderRadius: 4,
                            border: '1px solid rgba(255,45,149,0.35)',
                            boxShadow: '0 0 25px rgba(255,45,149,0.15), 0 0 50px rgba(0,191,255,0.06), inset 0 0 20px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(16px)',
                        }}>
                            <img src={qrUrl} alt="QR" style={{ width: 130, height: 130, borderRadius: 2, display: 'block' }} />
                        </div>
                    )}
                    {sessionCode && (
                        <div style={{
                            background: 'rgba(10,6,20,0.85)', padding: '6px 20px', borderRadius: 4,
                            border: '1px solid rgba(255,45,149,0.25)',
                            boxShadow: '0 0 12px rgba(255,45,149,0.1)',
                        }}>
                            <p style={{
                                fontFamily: "'Audiowide', sans-serif", fontSize: stageFont(24), color: '#FF2D95',
                                letterSpacing: 10, margin: 0,
                                textShadow: '0 0 12px rgba(255,45,149,0.6), 0 0 30px rgba(255,45,149,0.25)',
                            }}>
                                {sessionCode}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ---- Comic Book (pop-art) idle ----
    if (theme.name === 'comic-book') {
        const STAR = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
        const onos = [
            { t: 'POW!', x: '7%', y: '13%', bg: '#FFD400', fg: '#FF1F4B', rot: -14, d: 2.6 },
            { t: 'BAM!', x: '79%', y: '9%', bg: '#FF1F4B', fg: '#FFFFFF', rot: 11, d: 3.1 },
            { t: 'ZAP!', x: '83%', y: '68%', bg: '#2FA8FF', fg: '#FFD400', rot: -8, d: 2.9 },
            { t: 'WOW!', x: '4%', y: '70%', bg: '#FFFFFF', fg: '#2FA8FF', rot: 9, d: 3.4 },
        ]
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: '#FFF7E6', position: 'relative', overflow: 'hidden',
                backgroundImage:
                    'radial-gradient(rgba(255,31,75,0.16) 2px, transparent 2.4px), radial-gradient(rgba(47,168,255,0.14) 2px, transparent 2.4px)',
                backgroundSize: '22px 22px, 22px 22px', backgroundPosition: '0 0, 11px 11px',
            }}>
                {/* Radial speed-line burst behind the hero */}
                <div style={{
                    position: 'absolute', left: '50%', top: '46%', width: '160vmax', height: '160vmax',
                    transform: 'translate(-50%, -50%)',
                    background: 'repeating-conic-gradient(from 0deg, rgba(22,22,29,0.06) 0deg 2.2deg, transparent 2.2deg 4.4deg)',
                    animation: 'comic-idle-burst 90s linear infinite', zIndex: 0,
                }} />

                {/* Onomatopoeia starbursts — the star is a clipped layer; the
                   word sits ABOVE it (not clipped), colored with an ink
                   outline so it stays crisp and never gets cut by the points. */}
                {onos.map((o, i) => (
                    <div key={`ono-${i}`} style={{
                        position: 'absolute', left: o.x, top: o.y, zIndex: 2,
                        width: 150, height: 150,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ['--wig-a' as string]: `${o.rot - 6}deg`, ['--wig-b' as string]: `${o.rot + 6}deg`,
                        animation: `comic-wiggle ${o.d}s ease-in-out infinite`,
                    }}>
                        {/* Star shape (ink border via stacked clips) */}
                        <div style={{
                            position: 'absolute', inset: 0, clipPath: STAR, background: '#16161D',
                        }} />
                        <div style={{
                            position: 'absolute', inset: 9, clipPath: STAR, background: o.bg,
                        }} />
                        {/* Word on top — never clipped */}
                        <span style={{
                            position: 'relative', zIndex: 1,
                            fontFamily: theme.fontDisplay, color: o.fg, fontSize: stageFont(30),
                            letterSpacing: 1, transform: `rotate(${o.rot}deg)`,
                            WebkitTextStroke: '2px #16161D',
                            textShadow: '2px 2px 0 #16161D',
                        }}>{o.t}</span>
                    </div>
                ))}

                {/* Hero speech-bubble panel */}
                <div style={{
                    position: 'relative', zIndex: 3, textAlign: 'center',
                    background: '#FFFFFF', border: '6px solid #16161D', borderRadius: 28,
                    boxShadow: '10px 10px 0 #16161D', padding: '40px 56px 44px',
                    animation: 'comic-bob 4s ease-in-out infinite',
                }}>
                    {/* speech-bubble tail — 45°-rotated square straddling the
                        bottom edge (white fill covers the bottom border at the
                        overlap; the ink right+bottom borders form the point). */}
                    <div style={{
                        position: 'absolute', left: 66, bottom: -22, width: 40, height: 40,
                        background: '#FFFFFF', borderRight: '6px solid #16161D', borderBottom: '6px solid #16161D',
                        borderBottomRightRadius: 6, transform: 'rotate(45deg)',
                    }} />
                    <h1 style={{
                        fontFamily: theme.fontDisplay, fontSize: stageFont(74), color: '#FF1F4B',
                        lineHeight: 1.0, margin: 0, letterSpacing: 1,
                        WebkitTextStroke: '2px #16161D',
                        textShadow: '5px 5px 0 #16161D',
                    }}>
                        GRAB THE MIC!
                    </h1>
                    <p style={{
                        fontFamily: theme.fontBody, fontWeight: 800, fontSize: stageFont(18),
                        color: '#16161D', letterSpacing: '0.18em', textTransform: 'uppercase',
                        margin: '14px 0 26px',
                    }}>
                        Scan to add your song
                    </p>
                    {qrUrl && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{
                                padding: 12, background: '#FFFFFF',
                                border: '4px solid #16161D', borderRadius: 10, boxShadow: '5px 5px 0 #16161D',
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 196, height: 196, display: 'block' }} />
                            </div>
                        </div>
                    )}
                    {sessionCode && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
                            <div style={{
                                padding: '6px 22px',
                                background: '#FFD400', border: '4px solid #16161D', borderRadius: 8,
                                boxShadow: '4px 4px 0 #16161D', transform: 'rotate(-2deg)',
                            }}>
                                <p style={{
                                    fontFamily: theme.fontDisplay, fontSize: stageFont(26), color: '#16161D',
                                    letterSpacing: '0.22em', margin: 0,
                                }}>
                                    {sessionCode}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ---- Tropical (Tiki Beach) idle ----
    if (theme.name === 'tropical') {
        const frondAngles = [-162, -124, -86, -48, -8, 30, 66]
        const clouds = [
            { x: '6%', y: '9%', s: 1.0, d: 26 },
            { x: '60%', y: '5%', s: 1.3, d: 34 },
            { x: '34%', y: '17%', s: 0.8, d: 30 },
        ]

        // A single coconut palm, drawn rooted at bottom-centre. The caller
        // positions it and the wrapper div sways the whole tree (reliable
        // HTML transform-origin; avoids SVG-internal origin pitfalls).
        const Palm = (k: string, posStyle: React.CSSProperties, flip: boolean, swayDur: number) => (
            <div key={k} style={{ position: 'absolute', zIndex: 2, transformOrigin: 'bottom center', animation: `tropPalmTrunk ${swayDur}s ease-in-out infinite`, ...posStyle }}>
                <svg width="360" height="470" viewBox="0 0 360 470" style={{ display: 'block', transform: flip ? 'scaleX(-1)' : 'none', filter: 'drop-shadow(0 10px 16px rgba(14,46,41,0.28))' }}>
                    {/* trunk */}
                    <path d="M168 470 C 158 360 132 262 196 176 C 202 168 216 172 210 186 C 160 266 182 366 196 470 Z" fill="#A9764A" />
                    <path d="M168 470 C 160 360 138 262 196 176 C 200 170 207 172 206 180 C 162 266 174 366 182 470 Z" fill="#C28F5A" />
                    {[238, 300, 362, 424].map((ny, i) => (
                        <path key={i} d={`M${164 - i} ${ny} q 20 -9 38 0`} stroke="#7C5230" strokeWidth="3" fill="none" opacity="0.45" />
                    ))}
                    {/* coconuts */}
                    <circle cx="196" cy="186" r="12" fill="#5C3F22" />
                    <circle cx="216" cy="194" r="11" fill="#6B4A2A" />
                    <circle cx="202" cy="204" r="11" fill="#4A3119" />
                    {/* fronds */}
                    {frondAngles.map((a, i) => (
                        <path
                            key={i}
                            transform={`translate(204 176) rotate(${a})`}
                            d="M0 0 C 50 -22 116 -20 172 6 C 162 2 162 14 172 20 C 116 8 56 13 0 0 Z"
                            fill={i % 2 === 0 ? '#1FA85C' : '#178A4A'}
                            stroke="#0E6B39"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    ))}
                    <path transform="translate(204 176) rotate(-100)" d="M0 0 C 18 -64 16 -130 4 -182 C -4 -130 -12 -64 0 0 Z" fill="#23B85F" stroke="#0E6B39" strokeWidth="2" />
                </svg>
            </div>
        )

        // A bamboo tiki torch with a flickering flame + rising embers.
        const Torch = (k: string, side: 'left' | 'right') => {
            const pos: React.CSSProperties = { position: 'absolute', bottom: '16%', width: 90, height: 300, zIndex: 4 }
            if (side === 'left') pos.left = '19%'
            else pos.right = '19%'
            return (
                <div key={k} style={pos}>
                    {/* warm flame glow */}
                    <div style={{ position: 'absolute', top: -26, left: '50%', width: 180, height: 180, transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(255,170,60,0.55) 0%, transparent 64%)', animation: 'tropSun 2.2s ease-in-out infinite', pointerEvents: 'none' }} />
                    {/* flame — separate boxes so CSS transform-origin is reliable */}
                    <div style={{ position: 'absolute', top: 6, left: '50%', width: 62, height: 86, transform: 'translateX(-50%)', zIndex: 2 }}>
                        <svg width="62" height="86" viewBox="0 0 62 86" style={{ position: 'absolute', inset: 0, transformOrigin: '50% 100%', animation: 'tropFlame 0.9s ease-in-out infinite' }}>
                            <path d="M31 84 C 7 64 5 38 31 4 C 57 38 55 64 31 84 Z" fill="#FF6B2C" />
                        </svg>
                        <svg width="40" height="58" viewBox="0 0 40 58" style={{ position: 'absolute', left: 11, bottom: 10, transformOrigin: '50% 100%', animation: 'tropFlameCore 0.7s ease-in-out infinite' }}>
                            <path d="M20 56 C 6 44 6 24 20 4 C 34 24 34 44 20 56 Z" fill="#FFD23F" />
                        </svg>
                    </div>
                    {/* embers */}
                    {[0, 1, 2].map((i) => (
                        <div key={i} style={{ position: 'absolute', top: 36, left: 38 + i * 6, width: 5, height: 5, borderRadius: '50%', background: i % 2 ? '#FFD23F' : '#FF8A3C', ['--ember-x' as string]: `${(i - 1) * 18}px`, animation: `tropEmber ${1.9 + i * 0.5}s ease-in ${i * 0.45}s infinite`, pointerEvents: 'none' }} />
                    ))}
                    {/* bamboo pole + woven bowl */}
                    <svg width="90" height="300" viewBox="0 0 90 300" style={{ position: 'absolute', bottom: 0, left: 0, filter: 'drop-shadow(0 8px 12px rgba(14,46,41,0.25))' }}>
                        <rect x="34" y="86" width="22" height="214" rx="7" fill="#CDA85A" />
                        <rect x="38" y="86" width="6" height="214" fill="#E2C684" opacity="0.7" />
                        {[120, 162, 204, 246].map((ny, i) => (
                            <rect key={i} x="31" y={ny} width="28" height="6" rx="2.5" fill="#9A7536" />
                        ))}
                        <path d="M18 88 q 27 30 54 0 q -9 -20 -27 -20 q -18 0 -27 20 Z" fill="#6B4A2A" stroke="#4A3119" strokeWidth="2.5" />
                        <path d="M18 88 q 27 12 54 0" stroke="#3A2614" strokeWidth="3" fill="none" />
                    </svg>
                </div>
            )
        }

        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(180deg, #38B6E8 0%, #5ECBE8 28%, #2FC4C0 50%, #7FE0D6 58%, #F4E2B8 70%, #FFF4DE 100%)',
            }}>
                {/* sun */}
                <div style={{ position: 'absolute', top: '9%', right: '12%', width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, #FFE27A 0%, #FFC83D 58%, #FFB02E 100%)', animation: 'tropSun 6s ease-in-out infinite', zIndex: 1 }} />
                {/* drifting clouds */}
                {clouds.map((c, i) => (
                    <div key={`cl-${i}`} style={{ position: 'absolute', left: c.x, top: c.y, transform: `scale(${c.s})`, animation: `tropCloud ${c.d}s ease-in-out infinite alternate`, zIndex: 1 }}>
                        <div style={{ position: 'relative', width: 180, height: 50 }}>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 180, height: 36, borderRadius: 30, background: 'rgba(255,255,255,0.92)' }} />
                            <div style={{ position: 'absolute', bottom: 8, left: 32, width: 62, height: 62, borderRadius: '50%', background: 'rgba(255,255,255,0.92)' }} />
                            <div style={{ position: 'absolute', bottom: 6, left: 84, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.92)' }} />
                        </div>
                    </div>
                ))}
                {/* shimmering lagoon band */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '11%', zIndex: 1, opacity: 0.5, backgroundImage: 'repeating-linear-gradient(95deg, rgba(255,255,255,0.6) 0 3px, transparent 3px 24px)', animation: 'tropWave 6s linear infinite' }} />

                {/* palms */}
                {Palm('palm-l', { left: -86, bottom: -34 }, false, 7)}
                {Palm('palm-r', { right: -86, bottom: -34 }, true, 8.5)}

                {/* torches */}
                {Torch('torch-l', 'left')}
                {Torch('torch-r', 'right')}

                {/* hero — a lashed wooden tiki sign framed in bamboo */}
                <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', animation: 'tropBob 5s ease-in-out infinite' }}>
                    {/* hibiscus bloom, top-left corner */}
                    <svg width="78" height="78" viewBox="0 0 70 70" style={{ position: 'absolute', top: -34, left: -30, zIndex: 6, transform: 'rotate(-18deg)', filter: 'drop-shadow(0 4px 6px rgba(14,46,41,0.3))' }}>
                        {[0, 72, 144, 216, 288].map((a) => (
                            <ellipse key={a} cx="35" cy="17" rx="13" ry="17" fill="#FF3D81" stroke="#E02468" strokeWidth="1.5" transform={`rotate(${a} 35 35)`} />
                        ))}
                        <circle cx="35" cy="35" r="7.5" fill="#FFC83D" />
                        <circle cx="35" cy="35" r="3" fill="#FF8A3C" />
                    </svg>
                    {/* monstera leaf, top-right corner */}
                    <svg width="86" height="86" viewBox="0 0 100 100" style={{ position: 'absolute', top: -40, right: -38, zIndex: 6, transform: 'rotate(22deg)', filter: 'drop-shadow(0 4px 6px rgba(14,46,41,0.3))' }}>
                        <path d="M50 96 C 12 70 6 30 46 6 C 92 26 90 72 50 96 Z" fill="#1FA85C" stroke="#0E6B39" strokeWidth="2.5" />
                        <path d="M50 90 L50 20 M50 64 L24 52 M50 64 L76 52 M50 42 L30 32 M50 42 L70 32" stroke="#0E6B39" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
                    </svg>

                    <div style={{
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(165deg, #8A5A2F 0%, #6E4423 100%)',
                        borderRadius: 26, padding: '46px 64px 50px',
                        border: '7px solid #CDA85A',
                        boxShadow: '0 24px 56px rgba(14,46,41,0.42), inset 0 0 0 3px rgba(0,0,0,0.22)',
                    }}>
                        {/* wood grain */}
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 17px)', pointerEvents: 'none' }} />
                        {/* corner rope lashings */}
                        {[{ t: 8, l: 8 }, { t: 8, r: 8 }, { b: 8, l: 8 }, { b: 8, r: 8 }].map((p, i) => (
                            <div key={i} style={{ position: 'absolute', width: 26, height: 26, borderRadius: 6, background: 'repeating-linear-gradient(45deg, #E8D4A0 0 3px, #B8995E 3px 6px)', transform: 'rotate(45deg)', opacity: 0.9, ...p }} />
                        ))}

                        <h1 style={{ position: 'relative', fontFamily: theme.fontDisplay, fontSize: stageFont(98), color: '#FFF8E6', margin: 0, lineHeight: 1.0, textShadow: '0 3px 0 rgba(0,0,0,0.35), 0 0 30px rgba(255,200,61,0.4)' }}>
                            Catch a Wave
                        </h1>
                        <p style={{ position: 'relative', fontFamily: theme.fontBody, fontWeight: 700, fontSize: stageFont(18), color: '#FFE9C2', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '16px 0 28px' }}>
                            Scan to add your song
                        </p>
                        {qrUrl && (
                            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                <div style={{ padding: 12, background: '#FFF8E6', border: '5px solid #CDA85A', borderRadius: 14, boxShadow: '0 10px 22px rgba(0,0,0,0.3)' }}>
                                    <img src={qrUrl} alt="QR" style={{ width: 196, height: 196, display: 'block', borderRadius: 6 }} />
                                </div>
                            </div>
                        )}
                        {sessionCode && (
                            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                                <div style={{ padding: '7px 26px', background: 'linear-gradient(135deg, #FFD23F, #FFB02E)', border: '4px solid #6E4423', borderRadius: 999, boxShadow: '0 6px 16px rgba(0,0,0,0.28)', transform: 'rotate(-2deg)' }}>
                                    <p style={{ fontFamily: theme.fontDisplay, fontSize: stageFont(33), color: '#6E4423', letterSpacing: '0.14em', margin: 0 }}>
                                        {sessionCode}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ---- Urban (Hip Hop) idle — also the fallback for unthemed idles ----
    // A city wall after dark: streetlight pool + faint block courses, a
    // flickering neon OPEN MIC sign, the headline sprayed as a dripping
    // stencil plate, and the QR wheatpasted up as a taped paper flyer.
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
            background: URB_VOID, position: 'relative', overflow: 'hidden',
        }}>
            <UrbanRoughDefs id="urban-idle-rough" />
            <UrbanWallLayers noiseId="urban-idle-noise" />

            <div style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
                {/* Flickering neon sign */}
                <div className="nb-rise" style={{ marginBottom: 30 }}>
                    <UrbanNeonSign text="Open Mic" fontSize={stageFont(19)} />
                </div>

                {/* Sprayed, dripping headline plate */}
                <div className="nb-rise" style={{ animationDelay: '0.06s', marginBottom: 18 }}>
                    <UrbanSprayPlate color={URB_GREEN} filterId="urban-idle-rough" rotate={-2} style={{ padding: '2px 18px 6px' }}>
                        <h1 style={{
                            fontFamily: URB_MARKER, fontSize: stageFont(64), fontWeight: 400,
                            lineHeight: 1.12, margin: 0, padding: '0 8px', letterSpacing: '2px',
                        }}>
                            DROP A TRACK
                        </h1>
                    </UrbanSprayPlate>
                </div>
                <p className="nb-rise" style={{
                    animationDelay: '0.12s',
                    fontFamily: URB_STENCIL, fontWeight: 300, fontSize: stageFont(16), color: URB_ASH,
                    letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: 44,
                }}>
                    Scan the flyer — run the queue
                </p>

                {/* Wheatpasted QR flyer */}
                {qrUrl && (
                    <div className="nb-rise" style={{ display: 'inline-block', animationDelay: '0.18s', position: 'relative', transform: 'rotate(-1.8deg)' }}>
                        <div style={{
                            background: URB_PAPER, padding: '16px 16px 12px',
                            clipPath: 'polygon(0 0, 100% 0, 100% 94%, 90% 100%, 72% 95%, 48% 100%, 26% 96%, 10% 100%, 0 95%)',
                            boxShadow: '0 24px 55px rgba(0,0,0,0.85)',
                        }}>
                            <img src={qrUrl} alt="QR" style={{ width: 208, height: 208, display: 'block' }} />
                            <span style={{
                                display: 'block', marginTop: 10, marginBottom: 4, textAlign: 'center',
                                fontFamily: URB_STENCIL, fontWeight: 700, fontSize: stageFont(13),
                                letterSpacing: '0.4em', textTransform: 'uppercase', color: '#0A0A0A',
                            }}>
                                Pull Up
                            </span>
                        </div>
                        <UrbanTape style={{ top: -12, left: '50%', marginLeft: -52 }} rotate={-2} width={104} />
                    </div>
                )}

                {/* Session code — stencil sprayed under the flyer */}
                {sessionCode && (
                    <p className="nb-rise" style={{
                        animationDelay: '0.24s',
                        fontFamily: URB_STENCIL, fontSize: stageFont(25), fontWeight: 600, color: URB_GREEN,
                        letterSpacing: '0.45em', textTransform: 'uppercase', marginTop: 26,
                        textShadow: `0 0 14px ${URB_GREEN}66, 0 0 34px ${URB_GREEN}33`,
                    }}>
                        [ {sessionCode} ]
                    </p>
                )}
            </div>
        </div>
    )
}

// ── Lobby Mode ──────────────────────────────────────────────────────────────
// The stretch of the night where the stage just holds its join screen and songs
// pile into the queue. Two extras ride along: an optional slow random cycle
// through every theme's join screen (crossfaded), and a notice along the bottom
// each time a song is queued or requested.

const LOBBY_THEME_KEYS = Object.keys(THEMES)
const LOBBY_DWELL_MS = 20_000   // how long each theme's join screen holds
const LOBBY_FADE_MS = 1500      // must cover .lobby-layer--out in karaoke.css
const NOTICE_TTL_MS = 8600      // total time a notice stays on screen
const NOTICE_EXIT_MS = 520      // must match .lobby-notice--leaving
const NOTICE_MAX = 3            // oldest notices drop off the top of the stack

interface LobbyNotice {
    id: string
    kind: 'queued' | 'requested'
    title: string
    artist: string
    artUrl: string | null
    /** Guest who queued / requested it. */
    byName: string | null
    byPicture: string | null
    /** Singers are stored as references — name + avatar resolve live from the
     *  guest roster at render time (see resolveNoticeSinger). */
    singers: Array<{ name: string; color: string; guestId?: string }>
    leaving?: boolean
}

// A notice's visual treatment. Everything starts from the theme's own card
// surface + tokens (so a theme is never wrong by default), then the themes with
// a strong structural identity override the parts that make them recognisable.
interface NoticeSkin {
    card: React.CSSProperties
    /** Parallelogram lean; the content counter-skews so text stays upright. */
    skew: number
    label: React.CSSProperties
    title: React.CSSProperties
    meta: React.CSSProperties
    art: React.CSSProperties
    chip: (color: string) => React.CSSProperties
    rule: string
    decor: ReactNode
}

function noticeSkin(theme: Theme): NoticeSkin {
    const sharp = theme.cornerStyle === 'sharp'
    const radius = sharp ? 0 : Math.min(theme.radius, 20)
    const glow = theme.shadowStyle === 'glow'
    const cardShadow = typeof theme.card.boxShadow === 'string' ? theme.card.boxShadow : ''
    const ink = theme.black
    const sub = theme.muted

    const skin: NoticeSkin = {
        card: {
            ...theme.card,
            borderRadius: radius,
            padding: '14px 24px 14px 14px',
            boxShadow: glow
                ? `0 24px 60px rgba(0,0,0,0.62), 0 0 34px -10px ${theme.accentGlowColor}`
                : [cardShadow, '0 22px 46px rgba(0,0,0,0.34)'].filter(Boolean).join(', '),
        },
        skew: 0,
        label: {
            fontFamily: theme.fontBody, fontWeight: 700, fontSize: stageFont(11),
            letterSpacing: '0.26em', textTransform: 'uppercase', color: theme.accentA,
        },
        title: {
            fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(23),
            color: ink, lineHeight: 1.12,
            ...(theme.displayUppercase ? { textTransform: 'uppercase' as const, letterSpacing: theme.displayLetterSpacing } : {}),
        },
        meta: { fontFamily: theme.fontBody, fontSize: stageFont(14), color: sub },
        art: {
            borderRadius: sharp ? 0 : Math.min(theme.radiusSmall, 12),
            border: theme.borderThin,
            boxShadow: glow ? `0 0 18px -4px ${theme.accentGlowColor}` : '0 8px 20px rgba(0,0,0,0.4)',
        },
        chip: (color: string) => ({
            border: `1px solid ${color}66`, background: `${color}1f`, color: ink,
            borderRadius: sharp ? 0 : 99, fontFamily: theme.fontBody, fontWeight: 600,
        }),
        rule: theme.dimBorder,
        decor: null,
    }

    switch (theme.name) {
        // Printed gig poster: flat white sheet, ink rule, hard offset shadow.
        case 'neo-brutal':
            skin.card = {
                ...skin.card, background: '#FFFFFF', border: `3px solid ${NB_INK}`, borderRadius: 0,
                boxShadow: `9px 9px 0 ${NB_INK}, 0 26px 50px rgba(0,0,0,0.3)`,
            }
            skin.label = { ...skin.label, color: NB_INK, background: '#FFD60A', padding: '3px 10px', border: `2px solid ${NB_INK}` }
            skin.title = { ...skin.title, color: NB_INK }
            skin.meta = { ...skin.meta, color: '#555555', fontWeight: 600 }
            skin.art = { ...skin.art, borderRadius: 0, border: `2.5px solid ${NB_INK}`, boxShadow: `4px 4px 0 ${NB_INK}` }
            skin.rule = NB_INK
            skin.decor = <NbCropMark style={{ top: 7, right: 7 }} rotate={90} />
            break
        // Inked comic panel: heavy black keyline, halftone corner, offset drop.
        case 'comic-book':
            skin.card = {
                ...skin.card, border: '4px solid #16161D', borderRadius: 4,
                boxShadow: '8px 8px 0 #16161D, 0 24px 46px rgba(0,0,0,0.35)',
            }
            skin.label = { ...skin.label, color: '#16161D', background: theme.vividYellow, padding: '3px 11px', border: '2.5px solid #16161D', letterSpacing: '0.16em' }
            skin.art = { ...skin.art, borderRadius: 0, border: '3px solid #16161D', boxShadow: '4px 4px 0 #16161D' }
            skin.rule = '#16161D'
            break
        // Wheatpasted show bill: leaning parallelogram, stencil type, taped on.
        case 'urban':
            skin.skew = -7
            skin.card = {
                ...skin.card, background: '#111114', border: `2px solid ${URB_GREEN}`, borderRadius: 0,
                boxShadow: `0 26px 54px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05) inset`,
            }
            skin.label = { ...skin.label, fontFamily: URB_STENCIL, color: URB_GREEN, letterSpacing: '0.4em' }
            skin.title = { ...skin.title, fontFamily: URB_MARKER, color: '#FFFFFF', letterSpacing: '1px', textTransform: 'none' }
            skin.meta = { ...skin.meta, fontFamily: URB_STENCIL, fontWeight: 300, color: URB_ASH, letterSpacing: '0.16em', textTransform: 'uppercase' }
            skin.art = { ...skin.art, borderRadius: 0, border: `2px solid ${URB_PAPER}`, boxShadow: '0 10px 26px rgba(0,0,0,0.7)' }
            skin.rule = `${URB_GREEN}55`
            skin.decor = <UrbanTape style={{ top: -11, left: 26 }} rotate={-4} width={86} />
            break
        // Hanging washi card: paper wash, gold hairlines, vermillion seal.
        case 'zen':
            skin.card = {
                ...skin.card, background: ZEN_PAPER, border: '1px solid rgba(201,168,76,0.5)', borderRadius: 3,
                boxShadow: '0 26px 54px rgba(0,0,0,0.55), inset 0 0 40px rgba(201,168,76,0.08)',
            }
            skin.label = { ...skin.label, fontFamily: ZEN_SANS, color: ZEN_VERM, letterSpacing: '0.32em', fontWeight: 500 }
            skin.title = { ...skin.title, fontFamily: ZEN_SERIF, color: ZEN_INK, fontWeight: 600, textTransform: 'none' }
            skin.meta = { ...skin.meta, fontFamily: ZEN_SANS, color: '#6B5B45', letterSpacing: '0.1em' }
            skin.art = { ...skin.art, borderRadius: 2, border: '1px solid rgba(36,31,22,0.35)', boxShadow: '0 8px 18px rgba(0,0,0,0.35)' }
            skin.chip = (color: string) => ({
                border: `1px solid ${color}88`, background: `${color}18`, color: ZEN_INK,
                borderRadius: 2, fontFamily: ZEN_SANS, fontWeight: 500,
            })
            skin.rule = 'rgba(201,168,76,0.55)'
            skin.decor = (
                <span style={{
                    position: 'absolute', top: 12, right: 14, width: 26, height: 26, borderRadius: 3,
                    border: `1.5px solid ${ZEN_VERM}`, color: ZEN_VERM, opacity: 0.8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: ZEN_SERIF, fontSize: stageFont(13), fontWeight: 700,
                }}>唄</span>
            )
            break
        // Riveted brass plate bolted to the engine-room wall.
        case 'steampunk':
            skin.card = {
                ...skin.card, background: STM_PLATE_BG, border: `2px solid ${STM_BRASS}`, borderRadius: 4,
                boxShadow: `0 24px 52px rgba(0,0,0,0.7), inset 0 1px 0 rgba(232,220,200,0.12), 0 0 22px -8px ${STM_COPPER}`,
                padding: '16px 26px 16px 16px',
            }
            skin.label = { ...skin.label, fontFamily: STM_HEADING, color: STM_BRASS, letterSpacing: '0.3em' }
            skin.title = { ...skin.title, fontFamily: STM_SERIF, color: STM_PARCH, fontWeight: 600, textTransform: 'none' }
            skin.meta = { ...skin.meta, fontFamily: STM_SERIF, fontStyle: 'italic', color: STM_MID }
            skin.art = { ...skin.art, borderRadius: 2, border: `1.5px solid ${STM_BRASS}88`, boxShadow: '0 8px 20px rgba(0,0,0,0.6)' }
            skin.rule = `${STM_BRASS}66`
            skin.decor = <SteamRivets inset={6} />
            break
        // Bamboo-framed beach sign on sun-warmed sand.
        case 'tropical':
            skin.card = {
                ...skin.card, borderRadius: 20, border: `2.5px solid #CDA85A`,
                boxShadow: '0 24px 50px rgba(14,46,41,0.42), inset 0 1px 0 rgba(255,255,255,0.6)',
            }
            skin.label = { ...skin.label, color: theme.accentC, letterSpacing: '0.22em' }
            skin.art = { ...skin.art, borderRadius: 14, border: '3px solid #CDA85A', boxShadow: '0 8px 20px rgba(14,46,41,0.35)' }
            skin.rule = 'rgba(205,168,90,0.6)'
            skin.decor = <TropHibiscus size={40} rotate={16} style={{ position: 'absolute', top: -13, right: -11 }} />
            break
        // Hand-drawn note: sketchy off-square border, marker underline.
        case 'sketch':
            skin.card = {
                ...skin.card, borderRadius: '20px 8px 22px 10px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }
            skin.art = { ...skin.art, borderRadius: '12px 5px 14px 6px' }
            break
        default:
            break
    }
    return skin
}

// Resolve a notice singer's live display name + avatar from the guest roster,
// falling back to the name captured on the queue item for name-only singers.
function resolveNoticeSinger(
    s: { name: string; color: string; guestId?: string },
    guests: Map<string, { name: string; profile_picture: string | null }>,
) {
    const guest = s.guestId ? guests.get(s.guestId) : undefined
    return { name: guest?.name ?? s.name, picture: guest?.profile_picture ?? null, color: s.color }
}

function LobbyNoticeCard({ notice, theme, guests }: {
    notice: LobbyNotice
    theme: Theme
    guests: Map<string, { name: string; profile_picture: string | null }>
}) {
    const skin = noticeSkin(theme)
    const singers = notice.singers.map(s => resolveNoticeSinger(s, guests))
    const label = notice.kind === 'requested' ? 'Song requested' : 'Added to the queue'
    const artSize = 78

    const avatar = (name: string, picture: string | null, color: string, size: number) => (
        picture ? (
            <img src={picture} alt="" style={{
                width: size, height: size, borderRadius: '50%', objectFit: 'cover',
                border: `2px solid ${color}`, flexShrink: 0,
            }} />
        ) : (
            <span style={{
                width: size, height: size, borderRadius: '50%', flexShrink: 0,
                background: color, color: '#101014', border: `2px solid ${color}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: size * 0.46,
            }}>
                {(name || '?').charAt(0).toUpperCase()}
            </span>
        )
    )

    return (
        // Three layers on purpose: the OUTER element owns the enter/exit
        // animation (which animates `transform`), so any structural skew has to
        // live on the card inside it or the keyframes would wipe it out. The
        // content then counter-skews so text and art stay upright.
        <div className={'lobby-notice' + (notice.leaving ? ' lobby-notice--leaving' : '')}>
            <div style={{
                position: 'relative', minWidth: 420, maxWidth: '44vw',
                transform: skin.skew ? `skewX(${skin.skew}deg)` : undefined,
                ...skin.card,
            }}>
                {skin.decor}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    transform: skin.skew ? `skewX(${-skin.skew}deg)` : undefined,
                }}>
                    {notice.artUrl ? (
                        <img src={notice.artUrl} alt="" style={{ width: artSize, height: artSize, objectFit: 'cover', flexShrink: 0, ...skin.art }} />
                    ) : (
                        <span style={{
                            width: artSize, height: artSize, flexShrink: 0, ...skin.art,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: `repeating-linear-gradient(135deg, ${theme.creamDark}, ${theme.creamDark} 7px, ${theme.cream} 7px, ${theme.cream} 14px)`,
                            color: theme.muted, fontFamily: theme.fontDisplay, fontSize: stageFont(24), fontWeight: 700,
                        }}>?</span>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                            <span style={skin.label}>{label}</span>
                            {/* With singers listed below, the credit rides up here
                                instead of taking a row of its own. */}
                            {notice.byName && singers.length > 0 && (
                                <span style={{ ...skin.meta, fontSize: stageFont(12), whiteSpace: 'nowrap' }}>
                                    by {notice.byName}
                                </span>
                            )}
                            <span style={{ flex: 1, height: 1, background: skin.rule, minWidth: 16 }} />
                        </div>
                        <div style={{ ...skin.title, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {notice.title}
                        </div>
                        <div style={{ ...skin.meta, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {notice.artist}
                        </div>

                        {/* Who's singing it — or who asked for it, when there are no
                            singers yet (a request isn't a queued turn). */}
                        {singers.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>
                                {singers.map((s, i) => (
                                    <span key={i} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8,
                                        padding: '3px 13px 3px 3px', fontSize: stageFont(13),
                                        whiteSpace: 'nowrap', ...skin.chip(s.color),
                                    }}>
                                        {avatar(s.name, s.picture, s.color, 26)}
                                        {s.name}
                                    </span>
                                ))}
                            </div>
                        ) : notice.byName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 11 }}>
                                {avatar(notice.byName, notice.byPicture, theme.accentA, 26)}
                                <span style={{ ...skin.meta, fontSize: stageFont(13) }}>
                                    {notice.byName} {notice.kind === 'requested' ? 'asked for this one' : 'added this one'}
                                </span>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}

function LobbyNotices({ theme }: { theme: Theme }) {
    const { state } = useApp()
    const guestsMap = useGuestsMap()
    const [notices, setNotices] = useState<LobbyNotice[]>([])
    const timersRef = useRef<number[]>([])
    // Queue-item ids already accounted for, plus a short warm-up window. The
    // stage window's INIT_STATE snapshot and the session's existing-queue fetch
    // both land just after mount — during the warm-up their ids are recorded
    // silently so songs that were already queued don't all pop as "new".
    const seenRef = useRef<Set<string>>(new Set())
    const warmRef = useRef(false)

    useEffect(() => {
        const t = window.setTimeout(() => { warmRef.current = true }, 2200)
        return () => window.clearTimeout(t)
    }, [])

    useEffect(() => () => { timersRef.current.forEach(id => window.clearTimeout(id)) }, [])

    const push = useCallback((notice: LobbyNotice) => {
        setNotices(prev => [...prev, notice].slice(-NOTICE_MAX))
        timersRef.current.push(
            window.setTimeout(() => {
                setNotices(prev => prev.map(n => n.id === notice.id ? { ...n, leaving: true } : n))
            }, NOTICE_TTL_MS - NOTICE_EXIT_MS),
            window.setTimeout(() => {
                setNotices(prev => prev.filter(n => n.id !== notice.id))
            }, NOTICE_TTL_MS),
        )
    }, [])

    // Songs landing in the queue — added by the host or sent from a phone. Both
    // arrive as ENQUEUE_SONG and reach the stage through the state relay, so
    // diffing the queue catches every source without another subscription.
    useEffect(() => {
        for (const item of state.queue) {
            if (seenRef.current.has(item.id)) continue
            seenRef.current.add(item.id)
            if (!warmRef.current) continue
            // A secret song must stay secret — no title, artist, or art on stage.
            push({
                id: 'q-' + item.id,
                kind: 'queued',
                title: item.isHidden ? 'Secret Song' : item.track.name,
                artist: item.isHidden ? 'Revealed on stage' : item.track.artists.map(a => a.name).join(', '),
                artUrl: item.isHidden ? null : (item.track.album.images[0]?.url ?? null),
                byName: item.addedBy ?? null,
                byPicture: null,
                singers: item.isHidden
                    ? []
                    : item.singers.map(s => ({ name: s.name, color: s.color, guestId: s.guestId })),
            })
        }
    }, [state.queue, push])

    // Song requests (a guest asking for something not in the library yet) have
    // no queue row to diff — the main window forwards them over IPC, the same
    // relay reactions use.
    useEffect(() => {
        if (!window.electronAPI?.onStageNotice) return
        const handler = window.electronAPI.onStageNotice((n: any) => {
            if (!n || n.kind !== 'requested' || !n.id) return
            push({
                id: 'r-' + n.id,
                kind: 'requested',
                title: n.title || 'A song',
                artist: n.artist || '',
                artUrl: n.artUrl || null,
                byName: n.byName || null,
                byPicture: n.byPicture || null,
                singers: [],
            })
        })
        return () => { window.electronAPI?.offStageNotice?.(handler) }
    }, [push])

    if (notices.length === 0) return null

    // Anchored bottom-RIGHT rather than bottom-centre: every theme's join screen
    // runs its QR + session code down the middle of the wall, and a centred
    // stack would sit right on top of the code people are trying to type in.
    return (
        <div style={{
            position: 'fixed', right: 38, bottom: 34, zIndex: 9998, maxWidth: '46vw',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12,
            pointerEvents: 'none',
        }}>
            {notices.map(n => (
                <LobbyNoticeCard key={n.id} notice={n} theme={theme} guests={guestsMap} />
            ))}
        </div>
    )
}

function LobbyStage({ cycle, theme, qrUrl, sessionCode, notices }: {
    cycle: boolean
    theme: Theme
    qrUrl: string | null
    sessionCode: string | null
    notices: boolean
}) {
    // Which theme's join screen is up, plus the one dissolving out over it.
    const [visible, setVisible] = useState(theme.name)
    const [outgoing, setOutgoing] = useState<{ name: string; key: number } | null>(null)
    const visibleRef = useRef(visible)
    const stepRef = useRef(0)

    // Random walk through the theme ring, never repeating the screen that's
    // already up. Read through a ref so the interval isn't torn down and
    // restarted (which would reset the dwell) on every swap.
    useEffect(() => {
        if (!cycle) return
        const id = window.setInterval(() => {
            const prev = visibleRef.current
            const pool = LOBBY_THEME_KEYS.filter(k => k !== prev)
            const next = pool[Math.floor(Math.random() * pool.length)] ?? prev
            visibleRef.current = next
            stepRef.current += 1
            setOutgoing({ name: prev, key: stepRef.current })
            setVisible(next)
        }, LOBBY_DWELL_MS)
        return () => window.clearInterval(id)
    }, [cycle])

    // Cycling off (or the session theme changed while it's off) — snap back to
    // the session's own theme with no half-finished crossfade left behind.
    useEffect(() => {
        if (cycle) return
        visibleRef.current = theme.name
        setVisible(theme.name)
        setOutgoing(null)
    }, [cycle, theme.name])

    // Retire the outgoing layer once its fade-out has finished.
    useEffect(() => {
        if (!outgoing) return
        const t = window.setTimeout(() => setOutgoing(null), LOBBY_FADE_MS)
        return () => window.clearTimeout(t)
    }, [outgoing])

    // Every theme's globalCss is scoped to [data-theme="<name>"] (plus @import
    // font loads and @keyframes), so mounting them all at once is inert for the
    // themes not on screen — and it means an incoming screen's fonts and
    // keyframes are already parsed before it fades in, instead of popping mid-
    // crossfade. ThemeProvider's own <style> is left untouched.
    useEffect(() => {
        if (!cycle) return
        if (!window.electronAPI?.isStageWindow) return
        const style = document.createElement('style')
        style.id = 'lobby-cycle-css'
        style.textContent = Object.values(THEMES).map(t => t.globalCss ?? '').join('\n')
        document.head.appendChild(style)
        return () => { style.remove() }
    }, [cycle])

    // data-theme selects which of those scoped blocks applies. ThemeProvider /
    // StageThemeProvider set it from the SESSION theme and only re-run when that
    // changes, so the cycle owns the attribute while it's up and hands it back
    // on the way out.
    useEffect(() => {
        if (!cycle) return
        if (!window.electronAPI?.isStageWindow) return
        const root = document.documentElement
        root.dataset.theme = visible
        return () => { root.dataset.theme = theme.name }
    }, [cycle, visible, theme.name])

    if (!cycle) {
        return (
            <>
                <IdleStageScreen theme={theme} qrUrl={qrUrl} sessionCode={sessionCode} />
                {notices && <LobbyNotices theme={theme} />}
            </>
        )
    }

    const visibleTheme = THEMES[visible] ?? theme
    const outgoingTheme = outgoing ? (THEMES[outgoing.name] ?? null) : null

    return (
        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: visibleTheme.appBg }}>
            <div key={visible} className="lobby-layer lobby-layer--in">
                <IdleStageScreen theme={visibleTheme} qrUrl={qrUrl} sessionCode={sessionCode} />
            </div>
            {outgoingTheme && outgoing && (
                <div key={'out-' + outgoing.key} className="lobby-layer lobby-layer--out" aria-hidden>
                    <IdleStageScreen theme={outgoingTheme} qrUrl={qrUrl} sessionCode={sessionCode} />
                </div>
            )}
            {notices && <LobbyNotices theme={visibleTheme} />}
        </div>
    )
}

// ---- Main Component (Display Only) ----
export default function KaraokePage() {
    const { state, dispatch } = useApp()
    const theme = useTheme()
    const containerRef = useRef<HTMLDivElement>(null)
    const [lineIdx, setLineIdx] = useState(-1)
    const [elapsed, setElapsed] = useState(0)
    const [activeSylIdx, setActiveSylIdx] = useState(-1)
    const timeAnchorRef = useRef<{ eventMs: number; perfAt: number }>({ eventMs: 0, perfAt: 0 })
    const [showUI, setShowUI] = useState(true)
    const lyricsRef = useRef<HTMLDivElement>(null)
    const countInRef = useRef<HTMLDivElement>(null)
    const hideRef = useRef<NodeJS.Timeout | null>(null)

    // YouTube player sync
    const ytPlayerRef = useRef<any>(null)
    const ytReadyRef = useRef(false)
    const audioTimeMsRef = useRef(0)
    const [ytReady, setYtReady] = useState(false)
    // Tracks the YouTube iframe API PlayerState: -1 unstarted, 0 ended, 1 playing,
    // 2 paused, 3 buffering, 5 cued. We only reveal the iframe when state === 1
    // (actually playing) so the YT center "play" overlay never shows to the user.
    const [ytPlayState, setYtPlayState] = useState<number>(-1)
    const [previewSlices, setPreviewSlices] = useState<number[]>([])

    // Crossfade: remember previous album art to avoid black flash on transition
    const [prevArt, setPrevArt] = useState<string | null>(null)
    const [artLoaded, setArtLoaded] = useState(false)

    const np = state.nowPlaying
    const track = np?.track || null
    const lyrics = np?.lyrics || []
    const singers = np?.singers || []
    // Live guest roster for resolving each singer's current name + avatar.
    const guestsMap = useGuestsMap()
    const roles = np?.roles || []
    const voiceEffects = np?.voiceEffects || null
    const art = track?.album.images[0]?.url
    const ytId = np?.backgroundVideoPath ? extractYouTubeId(np.backgroundVideoPath) : null
    // A music-video snippet preview is showing on the "Up Next" screen: song is
    // on deck (ready), has a video, has slices computed, and isn't a secret song
    // (we never leak a hidden song's video). Drives both the iframe visibility
    // (below) and whether each theme's Up Next backdrop goes see-through so the
    // clips play behind the lockup.
    const videoPreviewActive =
        state.stageMode === 'ready' && !!ytId && previewSlices.length > 0 && !np?.isHidden
    // Reveal the video behind the themed Up Next art whenever a preview is live,
    // or during real playback. Secret songs keep their opaque themed backdrop.
    const showVideoBehindArt = (!!ytId && !np?.isHidden) && (videoPreviewActive || state.stageMode === 'playing')

    // When art changes, keep old art visible until new one loads
    useEffect(() => {
        if (!art) return
        setArtLoaded(false)
        const img = new Image()
        img.onload = () => {
            setArtLoaded(true)
            setPrevArt(art)
        }
        img.src = art
    }, [art])

    // Receive time updates from main window via IPC
    useEffect(() => {
        if (!window.electronAPI) return
        const timeHandler = window.electronAPI.onPlaybackTime((timeMs: number) => {
            setElapsed(timeMs)
            audioTimeMsRef.current = timeMs
            timeAnchorRef.current = { eventMs: timeMs, perfAt: performance.now() }
        })
        const seekHandler = window.electronAPI.onPlaybackSeek((timeMs: number) => {
            setElapsed(timeMs)
            audioTimeMsRef.current = timeMs
            timeAnchorRef.current = { eventMs: timeMs, perfAt: performance.now() }
            if (ytReadyRef.current && ytPlayerRef.current) {
                ytPlayerRef.current.seekTo(timeMs / 1000, true)
            }
        })
        return () => {
            window.electronAPI.offPlaybackTime(timeHandler)
            window.electronAPI.offPlaybackSeek(seekHandler)
        }
    }, [])

    // Reset elapsed when track changes
    useEffect(() => {
        setElapsed(0)
        audioTimeMsRef.current = 0
        setLineIdx(-1)
        if (track && track.duration_ms && ytId) {
            const durationSec = Math.floor(track.duration_ms / 1000)
            const margin = 10
            const maxStart = Math.max(0, durationSec - margin)
            const slices = Array.from({ length: 5 }, () => Math.floor(Math.random() * maxStart))
            setPreviewSlices(slices)
        } else {
            setPreviewSlices([])
        }
    }, [track?.id, ytId])

    // Load YouTube IFrame API and create player
    useEffect(() => {
        if (!ytId) {
            ytPlayerRef.current?.destroy()
            ytPlayerRef.current = null
            ytReadyRef.current = false
            return
        }

        const createPlayer = () => {
            if (ytPlayerRef.current) {
                ytPlayerRef.current.destroy()
                ytPlayerRef.current = null
            }
            ytReadyRef.current = false

            ytPlayerRef.current = new (window as any).YT.Player('yt-bg-player', {
                videoId: ytId,
                playerVars: {
                    autoplay: 0,
                    mute: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    playsinline: 1,
                    iv_load_policy: 3,
                    cc_load_policy: 0,
                    enablejsapi: 1,
                },
                events: {
                    onReady: () => {
                        ytReadyRef.current = true
                        setYtReady(true)
                        if (state.stageMode === 'playing' && state.isPlaying) {
                            ytPlayerRef.current?.seekTo(audioTimeMsRef.current / 1000, true)
                            ytPlayerRef.current?.playVideo()
                        }
                    },
                    onStateChange: (e: any) => {
                        setYtPlayState(e.data)
                        // When video ends but song is still playing, loop the video
                        if (e.data === 0) {
                            ytPlayerRef.current?.seekTo(0, true)
                            ytPlayerRef.current?.playVideo()
                        }
                    },
                }
            })
        }

        if ((window as any).YT?.Player) {
            createPlayer()
        } else {
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                const tag = document.createElement('script')
                tag.src = 'https://www.youtube.com/iframe_api'
                document.head.appendChild(tag)
            }
            ; (window as any).onYouTubeIframeAPIReady = createPlayer
        }

        return () => {
            ytPlayerRef.current?.destroy()
            ytPlayerRef.current = null
            ytReadyRef.current = false
            setYtReady(false)
        }
    }, [ytId])

    // Sync YouTube player play/pause and handle stage mode music video previews
    useEffect(() => {
        if (!ytReady || !ytPlayerRef.current) return

        // Suppress music-video preview teasers for secret songs — they'd leak the song visually
        const canPreview = state.stageMode === 'ready' && previewSlices.length > 0 && !np?.isHidden

        if (canPreview) {
            let sliceIdx = 0

            const playSlice = () => {
                if (!ytPlayerRef.current) return
                const startSec = previewSlices[sliceIdx % previewSlices.length]
                ytPlayerRef.current.seekTo(startSec, true)
                ytPlayerRef.current.playVideo()

                sliceIdx++
            }

            // Play immediately
            playSlice()

            // Then every 4 seconds
            const interval = setInterval(playSlice, 4000)
            return () => clearInterval(interval)
        } else {
            // standard playback sync — seek to current audio position before playing
            const shouldPlay = state.stageMode === 'playing' && state.isPlaying
            if (shouldPlay) {
                const currentSec = audioTimeMsRef.current / 1000
                ytPlayerRef.current.seekTo(currentSec, true)
                ytPlayerRef.current.playVideo()
            } else {
                ytPlayerRef.current.pauseVideo()
            }
        }
    }, [state.stageMode, state.isPlaying, previewSlices, ytReady, np?.isHidden])

    // Periodic drift correction: re-sync YouTube video if it drifts from audio
    useEffect(() => {
        if (!ytReady || !ytPlayerRef.current) return
        if (state.stageMode !== 'playing' || !state.isPlaying) return

        const DRIFT_CHECK_INTERVAL = 3000
        const DRIFT_THRESHOLD = 1.5

        const interval = setInterval(() => {
            if (!ytPlayerRef.current || !ytReadyRef.current) return
            const videoSec = ytPlayerRef.current.getCurrentTime()
            const audioSec = audioTimeMsRef.current / 1000
            if (Math.abs(videoSec - audioSec) > DRIFT_THRESHOLD) {
                ytPlayerRef.current.seekTo(audioSec, true)
            }
        }, DRIFT_CHECK_INTERVAL)

        return () => clearInterval(interval)
    }, [state.stageMode, state.isPlaying, ytReady])

    // Auto-hide UI
    const handleMouse = useCallback(() => {
        setShowUI(true)
        if (hideRef.current) clearTimeout(hideRef.current)
        hideRef.current = setTimeout(() => setShowUI(false), 3000)
    }, [])

    // Track active lyric line
    useEffect(() => {
        if (!lyrics.length) return
        let idx = -1
        for (let i = 0; i < lyrics.length; i++) {
            if (elapsed >= lyrics[i].startTimeMs) idx = i; else break
        }
        if (idx !== lineIdx) {
            setLineIdx(idx)
        }
    }, [elapsed, lyrics, lineIdx])

    // Track active syllable inside the active line — interpolated between IPC time events via rAF.
    // Only runs when the active line actually has per-syllable timing data.
    const activeLineSyllables = lineIdx >= 0 ? (lyrics[lineIdx] as any)?.syllables : undefined
    useEffect(() => {
        if (!activeLineSyllables || activeLineSyllables.length === 0) {
            if (activeSylIdx !== -1) setActiveSylIdx(-1)
            return
        }
        let raf = 0
        let lastIdx = -2
        const tick = () => {
            const anchor = timeAnchorRef.current
            const nowMs = anchor.eventMs + (performance.now() - anchor.perfAt)
            let idx = -1
            for (let i = 0; i < activeLineSyllables.length; i++) {
                if (nowMs >= activeLineSyllables[i].startMs) idx = i; else break
            }
            if (idx !== lastIdx) {
                lastIdx = idx
                setActiveSylIdx(idx)
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [activeLineSyllables, activeSylIdx])

    // Scroll active lyric into view.
    //
    // Normal line-to-line advances glide (behavior: 'smooth'). But if lineIdx
    // JUMPS by several lines at once — which happens when the stage's audio
    // clock (`elapsed`, fed over IPC from the controls window) stalls under load
    // and then catches up in one step — a smooth scroll animates across every
    // skipped line, reading as the lyrics "rushing" to catch up to the music.
    // For a catch-up jump we snap instantly instead so the display lands on the
    // correct line without sprinting through the intervening ones.
    const prevScrolledLineRef = useRef(-1)
    useEffect(() => {
        if (lineIdx < 0 || !lyricsRef.current) return
        const container = lyricsRef.current
        const lines = container.querySelectorAll('.k-line')
        const target = lines[lineIdx] as HTMLElement | undefined
        if (target) {
            const scrollTo = target.offsetTop - container.clientHeight / 2 + target.offsetHeight / 2
            const jump = Math.abs(lineIdx - prevScrolledLineRef.current)
            container.scrollTo({ top: scrollTo, behavior: jump > 2 ? 'auto' : 'smooth' })
        }
        prevScrolledLineRef.current = lineIdx
    }, [lineIdx])

    // Singer colors and Grouping
    const groupedLyrics = useMemo(() => {
        const coloredLines = lyrics.map((l: any, i: number) => {
            let singerIndex: number | undefined = i % Math.max(1, singers.length)
            let singerIndices: number[] = []

            if (roles && roles.length > 0 && l.roleIndex !== undefined) {
                if (l.roleIndex === -1) {
                    singerIndices = singers.map((_, idx) => idx)
                } else {
                    // Find ALL singers whose roleIndices include this lyric's role
                    const matchedIndices = singers
                        .map((s: any, idx: number) => (s.roleIndices && s.roleIndices.includes(l.roleIndex)) ? idx : -1)
                        .filter((idx: number) => idx >= 0)
                    if (matchedIndices.length > 0) {
                        singerIndex = matchedIndices[0]
                        singerIndices = matchedIndices
                    } else {
                        singerIndex = undefined
                    }
                }
            } else {
                if (singerIndex !== undefined) singerIndices = [singerIndex]
            }

            return { ...l, singerIndex, singerIndices, originalIndex: i }
        })

        if (coloredLines.length === 0) return []

        const groups: any[][] = []
        let currentGroup = [coloredLines[0]]

        for (let i = 1; i < coloredLines.length; i++) {
            if (coloredLines[i].startTimeMs === currentGroup[0].startTimeMs) {
                currentGroup.push(coloredLines[i])
            } else {
                groups.push(currentGroup)
                currentGroup = [coloredLines[i]]
            }
        }
        groups.push(currentGroup)
        return groups
    }, [lyrics, singers, roles])

    // Every theme gets the full "stage furniture" set (count-in, break pill,
    // paused stamp). Each of those three renderers has a bespoke branch per
    // theme.name; an unrecognized theme gracefully falls back to the neo-brutal
    // look. Kept as a named flag so the eligibility gates below read clearly.
    const hasStageFurniture = true

    // Detect a long instrumental gap after the active line — only when
    // syllable timing tells us exactly when the line finished being sung
    // (an LRC line has no end time, so a held note would false-positive).
    const nbBreak = useMemo(() => {
        if (!hasStageFurniture || lineIdx < 0) return null
        const line: any = lyrics[lineIdx]
        const syls = line?.syllables as Array<{ startMs: number; durMs: number }> | undefined
        if (!syls || syls.length === 0) return null
        const last = syls[syls.length - 1]
        const lineEnd = last.startMs + (last.durMs || 0)
        const next = (lyrics[lineIdx + 1] as any)?.startTimeMs
        if (typeof next !== 'number' || next - lineEnd < 7000) return null
        return { start: lineEnd, end: next }
    }, [theme.name, lyrics, lineIdx])

    // Count-in: a themed plate shown whenever the first lyric is more than
    // 1.5s into the track. It renders as the first block INSIDE the lyric
    // flow (above the lines). It counts while no line is active, then fades +
    // lifts away (exit animation) once the first line is live.
    const nbFirstStart = lyrics.length > 0 ? ((lyrics[0] as any).startTimeMs as number) : 0
    const nbCountEligible =
        hasStageFurniture && state.stageMode === 'playing' && lyrics.length > 0 && nbFirstStart > 1500
    const nbShowCountIn = nbCountEligible && lineIdx === -1 && elapsed < nbFirstStart // live counting phase
    // Stays mounted for the WHOLE song, not just the first line. It behaves
    // like a past lyric: after it fades/lifts away its box REMAINS in the flow
    // and simply scrolls off the top as the song advances. Unmounting it the
    // moment the 2nd line arrived yanked ~350px out of the flow in one frame,
    // snapping every lyric upward — the "shoots up to the top" glitch.
    const nbCountMounted = nbCountEligible

    // When the count-in first appears, reset the lyric scroll so it's centered
    // (a previous song may have left the container scrolled down). Fires only on
    // the false→true edge of the counting phase, not every time-tick.
    useEffect(() => {
        if (!nbShowCountIn || !lyricsRef.current || !countInRef.current) return
        const container = lyricsRef.current
        const target = countInRef.current
        const scrollTo = Math.max(0, target.offsetTop - container.clientHeight / 2 + target.offsetHeight / 2)
        container.scrollTo({ top: scrollTo, behavior: 'smooth' })
    }, [nbShowCountIn])

    // Awards reveal takes over the ENTIRE stage — idle or mid-song — so the host
    // can run it whether or not anything is queued. AwardsRevealAnimation portals
    // a full-screen opaque overlay to <body>, so returning it alone replaces
    // whatever the stage was showing. (Without this, the per-theme idle screens
    // below early-return before the reveal in the active branch ever mounts.)
    if (
        state.awardsRevealStep &&
        state.awardsRevealStep.phase !== 'idle' &&
        state.awardsRevealStep.phase !== 'done'
    ) {
        // During the winner slide, open the main mic (slot 1) so the winner can
        // give a speech. SpeechMic self-gates to the stage window.
        const mainMic = state.micSlots?.[0]?.micDeviceId || ''
        return (
            <>
                <AwardsRevealAnimation step={state.awardsRevealStep} />
                <AwardsBgMusic
                    duck={state.awardsRevealStep.phase === 'winner'}
                    outputId={state.mainOutputId}
                />
                {mainMic ? (
                    <SpeechMic
                        deviceId={mainMic}
                        outputId={state.mainOutputId}
                        enabled={state.awardsRevealStep.phase === 'winner'}
                    />
                ) : null}
            </>
        )
    }

    // Empty state — themed waiting screen with QR code. Lobby Mode also lands
    // here with songs already queued: the stage holds the join screen while
    // guests pile them in, and nothing is ever put on deck.
    //
    // The stageMode guard matters — flipping the lobby on mid-performance must
    // NOT yank the stage off a song that's underway, because the singers' mic
    // chains live in the playing branch below and would be torn down with it
    // (their vocals would cut out). A song in flight finishes; resolveNextSong
    // then hands the stage back to the lobby instead of pulling up the next one.
    if (!track || (state.lobbyMode && state.stageMode !== 'playing')) {
        return (
            <LobbyStage
                cycle={state.lobbyMode && state.lobbyCycleThemes}
                theme={theme}
                qrUrl={state.karaokeQrDataUrl}
                sessionCode={state.karaokeSessionCode}
                notices={state.lobbyMode}
            />
        )
    }

    const qrOverlay = state.karaokeQrDataUrl ? (
        theme.name === 'tropical' ? (
            <div style={{ position: 'fixed', left: 0, top: 'calc(100vh - 252px)', zIndex: 9999, width: 180, height: 240 }}>
                {/* bamboo cane jutting out from the left edge of the screen */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: 156, height: 18, borderRadius: '0 9px 9px 0', overflow: 'hidden', background: 'linear-gradient(180deg, #E2C684, #CDA85A 55%, #9A7536)', boxShadow: '0 5px 12px rgba(0,0,0,0.4)' }}>
                    <div style={{ position: 'absolute', top: 3, left: 0, right: 6, height: 2, background: 'rgba(255,255,255,0.4)' }} />
                    {[46, 92, 134].map((x, i) => (
                        <div key={i} style={{ position: 'absolute', top: 0, left: x, width: 3, height: 18, background: '#7C5A2C', opacity: 0.5 }} />
                    ))}
                </div>
                {/* cord + the wooden QR plank, hanging off the cane near its far end */}
                <div style={{ position: 'absolute', top: 18, left: 54, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 3, height: 22, background: '#5C3A1E' }} />
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 11,
                        borderRadius: 12,
                        background: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 13px), linear-gradient(180deg, #8A5A2F, #6E4423)',
                        border: '3px solid #C99A54',
                        boxShadow: '0 12px 26px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}>
                        <img src={state.karaokeQrDataUrl} alt="QR" style={{ width: 86, height: 86, borderRadius: 6, display: 'block', border: '2px solid rgba(0,0,0,0.2)' }} />
                        <span style={{ fontFamily: theme.fontDisplay, fontSize: 22, color: '#FFF1C4', letterSpacing: '0.04em' }}>Join</span>
                    </div>
                </div>
            </div>
        ) : theme.name === 'neo-brutal' ? (
        <div style={{ position: 'fixed', top: 'calc(100vh - 168px)', left: 80, zIndex: 9999 }}>
            <div className="k-qr-card" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: '#FFFFFF', border: `3px solid ${NB_INK}`, boxShadow: `6px 6px 0 ${NB_INK}`,
                padding: 8, transform: 'rotate(-1.2deg)',
            }}>
                <img src={state.karaokeQrDataUrl} alt="QR" style={{ width: 82, height: 82, display: 'block' }} />
                <span style={{
                    marginTop: 7, alignSelf: 'stretch', textAlign: 'center',
                    background: '#FFD60A', border: `2px solid ${NB_INK}`, color: NB_INK,
                    fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: '0.2em',
                    padding: '2px 0', textTransform: 'uppercase',
                }}>
                    Join
                </span>
            </div>
        </div>
        ) : theme.name === 'psychedelic' ? (
        // A printed join card: cream stock, ink keyline, and a dye tab across the
        // bottom carrying the word. The shared fallback below puts a pink accentA
        // "JOIN" on a black translucent box, which at 9px is unreadable from a room
        // away and is the opposite of what this theme's chrome looks like everywhere
        // else.
        <div style={{ position: 'fixed', top: 'calc(100vh - 176px)', left: 80, zIndex: 9999 }}>
            <div className="k-qr-card" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'stretch',
                background: PSY.CREAM,
                border: `${PSY.LINE}px solid ${PSY.INK}`,
                borderRadius: psyPoured(1, 16, 6),
                boxShadow: '0 14px 34px rgba(0,0,0,0.6)',
                padding: 9,
                animation: 'psy-stamp-in 0.45s cubic-bezier(0.2,0.9,0.3,1) both',
            }}>
                <img src={state.karaokeQrDataUrl} alt="QR" style={{
                    width: 92, height: 92, display: 'block', borderRadius: 5,
                    border: `2px solid ${PSY.INK}`, background: '#FFFFFF',
                }} />
                <span style={{
                    marginTop: 7, textAlign: 'center',
                    background: PSY.DYES[0], color: PSY.INK,
                    border: `2px solid ${PSY.INK}`, borderRadius: 999,
                    fontFamily: PSY.FONT_BODY, fontWeight: 800, fontSize: 11,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    padding: '2px 0 3px',
                }}>
                    Join
                </span>
            </div>
        </div>
        ) : theme.name === 'urban' ? (
        <div style={{ position: 'fixed', top: 'calc(100vh - 176px)', left: 80, zIndex: 9999, transform: 'rotate(-1.8deg)' }}>
            <div className="k-qr-card" style={{
                position: 'relative', background: URB_PAPER, padding: '9px 9px 5px',
                clipPath: 'polygon(0 0, 100% 0, 100% 93%, 88% 100%, 66% 95%, 40% 100%, 18% 96%, 0 100%)',
                boxShadow: '0 16px 34px rgba(0, 0, 0, 0.75)',
            }}>
                <img src={state.karaokeQrDataUrl} alt="QR" style={{ width: 84, height: 84, display: 'block' }} />
                <span style={{
                    display: 'block', marginTop: 5, marginBottom: 3, textAlign: 'center',
                    fontFamily: URB_STENCIL, fontWeight: 700, fontSize: 9, letterSpacing: '0.34em',
                    textTransform: 'uppercase', color: '#0A0A0A',
                }}>
                    Pull Up
                </span>
                <div style={{
                    position: 'absolute', top: -8, left: '50%', width: 56, height: 16, marginLeft: -28,
                    transform: 'rotate(-2deg)', background: 'rgba(240, 238, 228, 0.35)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
            </div>
        </div>
        ) : theme.name === 'zen' ? (
        <div style={{ position: 'fixed', top: 'calc(100vh - 186px)', left: 80, zIndex: 9999 }}>
            {/* A temple ema tag: dark washi plaque pinned by a vermillion cord knot */}
            <div className="k-qr-card" style={{
                position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                background: 'rgba(24,20,15,0.86)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 10,
                padding: '14px 12px 9px', backdropFilter: 'blur(14px)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.55), 0 0 20px rgba(201,168,76,0.08)',
            }}>
                <div style={{
                    position: 'absolute', top: -6, left: '50%', marginLeft: -6, width: 12, height: 12, borderRadius: '50%',
                    background: ZEN_VERM, boxShadow: '0 0 10px rgba(212,68,42,0.55), inset 0 0 0 2px rgba(247,238,220,0.3)',
                }} />
                <img src={state.karaokeQrDataUrl} alt="QR" style={{ width: 82, height: 82, display: 'block', borderRadius: 6 }} />
                <span style={{ fontFamily: ZEN_SANS, fontWeight: 500, fontSize: 10, letterSpacing: '0.42em', marginRight: '-0.42em', textTransform: 'uppercase', color: ZEN_GOLD }}>
                    Join
                </span>
            </div>
        </div>
        ) : theme.name === 'steampunk' ? (
        <div style={{ position: 'fixed', top: 'calc(100vh - 182px)', left: 80, zIndex: 9999 }}>
            {/* A riveted brass ticket plate at the box-office window */}
            <div className="k-qr-card" style={{
                position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: STM_PLATE_BG, border: '2px solid #0c0a07', borderRadius: 5,
                padding: '13px 13px 8px',
                boxShadow: `inset 0 0 0 2px ${STM_BRASS}, inset 0 0 14px rgba(0,0,0,0.5), 0 12px 28px rgba(0,0,0,0.6), 0 0 16px rgba(200,151,62,0.12)`,
            }}>
                <SteamRivets inset={5} />
                <img src={state.karaokeQrDataUrl} alt="QR" style={{ width: 80, height: 80, display: 'block', borderRadius: 3 }} />
                <span style={{ fontFamily: STM_HEADING, fontWeight: 700, fontSize: 10, letterSpacing: '0.34em', marginRight: '-0.34em', textTransform: 'uppercase', color: STM_BRASS, textShadow: '0 0 8px rgba(200,151,62,0.4)' }}>
                    Join
                </span>
            </div>
        </div>
        ) : (
        <div style={{
            position: 'fixed', top: 'calc(100vh - 150px)', left: 80, zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
            <div className="k-qr-card" style={{
                ...theme.stickerLabel,
                background: theme.name === 'neo-brutal' || theme.name === 'sketch' || theme.name === 'comic-book' || theme.name === 'tropical' ? theme.appBg : 'rgba(0,0,0,0.8)',
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                backdropFilter: 'blur(16px)',
                ...(theme.name === 'space' ? {
                    background: 'rgba(8,8,15,0.85)',
                    border: '1px solid rgba(64,224,208,0.25)',
                    boxShadow: '0 8px 26px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(91,233,255,0.22)',
                    borderRadius: 6,
                } : theme.name === 'retrowave' ? {
                    background: 'rgba(10,6,20,0.88)',
                    border: '1px solid rgba(255,45,149,0.3)',
                    boxShadow: '0 0 12px rgba(255,45,149,0.1), 0 0 25px rgba(0,191,255,0.05)',
                    borderRadius: 4,
                } : {}),
            }}>
                <img src={state.karaokeQrDataUrl} alt="QR" style={{
                    width: 80, height: 80,
                    borderRadius: theme.radiusSmall,
                    display: 'block',
                    ...(theme.name === 'space' ? { boxShadow: '0 0 10px rgba(91,233,255,0.18)' } : theme.name === 'retrowave' ? { boxShadow: '0 0 8px rgba(255,45,149,0.15)' } : {}),
                }} />
                <span style={{
                    fontFamily: theme.fontDisplay,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: theme.accentA,
                    textAlign: 'center',
                    display: 'block',
                    width: '100%',
                    ...(theme.name === 'space' ? {
                        color: '#5BE9FF',
                        textShadow: '0 0 8px rgba(64,224,208,0.5)',
                    } : theme.name === 'retrowave' ? {
                        color: '#FF2D95',
                        textShadow: '0 0 8px rgba(255,45,149,0.5)',
                    } : {}),
                }}>
                    Join
                </span>
            </div>
        </div>
        )
    ) : null

    // Themed count-in plate, rendered as the first block inside the lyric
    // flow so it scrolls up like a lyric once the first line goes live. Sits a
    // little below the top of the flow (clear of the fade mask) via vh margin.
    const nbCountIn = nbCountMounted ? (() => {
        const remaining = Math.max(0, nbFirstStart - elapsed)
        const count = Math.ceil(remaining / 1000)
        const barPct = remaining > 0 ? Math.min(100, (elapsed / nbFirstStart) * 100) : 100
        const exitCls = 'k-nb-countin' + (remaining <= 0 ? ' k-nb-countin--exit' : '')

        // ── Cyberpunk: BOOT SEQUENCE — clipped HUD terminal plate, neon-green
        // mono glyphs that glitch in, a magenta prompt label, scanline bar. ──
        if (theme.name === 'cyberpunk') {
            const clip = 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)'
            const cyBig = (label: string, key: string | number, size = 70) => (
                <div key={key} style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(size), lineHeight: 1.05, color: '#00ff88', textShadow: '0 0 18px rgba(0,255,136,0.7), 0 0 46px rgba(0,255,136,0.35)', letterSpacing: '0.08em', animation: 'cyber-glitch 0.45s steps(2) both', marginTop: 6 }}>{label}</div>
            )
            let cyCenter: React.ReactNode
            if (remaining <= 0) cyCenter = cyBig('EXECUTE', 'go', 46)
            else if (count <= 3) cyCenter = cyBig(String(count), count)
            else cyCenter = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, color: '#00ff88' }}>
                    <NbEq color="#00ff88" fontSize={stageFont(22)} />
                    <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(21), letterSpacing: '0.12em', maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</span>
                </div>
            )
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', minWidth: 360, textAlign: 'center', padding: '22px 46px', background: '#0b0b1c', clipPath: clip, boxShadow: '0 0 26px rgba(0,255,136,0.25), inset 0 0 0 1.5px rgba(0,255,136,0.5)', animation: 'cyber-glitch 0.5s steps(2) both' }}>
                        <p style={{ margin: 0, fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(14), letterSpacing: '0.4em', textTransform: 'uppercase', color: '#ff00aa', textShadow: '0 0 10px rgba(255,0,170,0.6)' }}>&gt; BOOT SEQUENCE</p>
                        {cyCenter}
                        <div style={{ marginTop: 16, height: 8, background: 'rgba(0,255,136,0.12)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${barPct}%`, background: '#00ff88', boxShadow: '0 0 12px rgba(0,255,136,0.8)', transition: 'width 0.28s linear' }} />
                        </div>
                    </div>
                </div>
            )
        }

        // ── Sketch: GET READY! — wobbly white notebook plate, hand-inked border
        // + offset shadow, Kalam numbers over a yellow highlighter swipe. ──
        if (theme.name === 'sketch') {
            const skBig = (label: string, key: string | number, size = 72) => (
                <div key={key} style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(size), lineHeight: 1.05, color: '#2d2d2d', marginTop: 6, position: 'relative', display: 'inline-block' }}>
                    <span style={{ position: 'absolute', left: -6, right: -6, top: '56%', bottom: '6%', background: '#fff9c4', zIndex: -1, transform: 'rotate(-1.5deg)' }} />
                    {label}
                </div>
            )
            let skCenter: React.ReactNode
            if (remaining <= 0) skCenter = skBig('SING!', 'go', 52)
            else if (count <= 3) skCenter = skBig(String(count), count)
            else skCenter = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, color: '#2d2d2d' }}>
                    <NbNote size={24} color="#ff4d4d" />
                    <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(23), maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</span>
                </div>
            )
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', minWidth: 340, textAlign: 'center', padding: '22px 44px', background: '#ffffff', border: '2.5px solid #2d2d2d', borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px', boxShadow: '4px 4px 0 rgba(45,45,45,0.9)', transform: 'rotate(-1.4deg)', animation: 'urban-spray-in 0.4s ease-out both' }}>
                        <p style={{ margin: 0, fontFamily: theme.fontBody, fontWeight: 700, fontSize: stageFont(15), letterSpacing: '0.18em', textTransform: 'uppercase', color: '#2d2d2d' }}>Get Ready!</p>
                        {skCenter}
                        <div style={{ marginTop: 16, height: 10, border: '2px solid #2d2d2d', borderRadius: 999, background: '#fff', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${barPct}%`, background: '#ff4d4d', transition: 'width 0.28s linear' }} />
                        </div>
                    </div>
                </div>
            )
        }

        // ── Deep-sea: DIVE IN — glassy abyss capsule ringed in bioluminescent
        // teal, a coral/violet vein bar, KrabbyPatty numerals glowing. ──
        if (theme.name === 'deep-sea') {
            const dsBig = (label: string, key: string | number, size = 70) => (
                <div key={key} style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(size), lineHeight: 1.05, color: '#00ffc8', textShadow: '0 0 20px rgba(0,255,200,0.7), 0 0 52px rgba(0,255,200,0.3)', marginTop: 6 }}>{label}</div>
            )
            let dsCenter: React.ReactNode
            if (remaining <= 0) dsCenter = dsBig('SURFACE!', 'go', 46)
            else if (count <= 3) dsCenter = dsBig(String(count), count)
            else dsCenter = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, color: '#e0fff8' }}>
                    <NbNote size={22} color="#00ffc8" />
                    <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(22), maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</span>
                </div>
            )
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', minWidth: 360, textAlign: 'center', padding: '24px 48px', borderRadius: 22, background: 'rgba(4,9,24,0.82)', backdropFilter: 'blur(10px)', boxShadow: '0 0 34px rgba(0,255,200,0.28), inset 0 0 0 1.5px rgba(0,255,200,0.4)', animation: 'urban-spray-in 0.45s ease-out both', overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontFamily: theme.fontBody, fontWeight: 700, fontSize: stageFont(13), letterSpacing: '0.42em', marginRight: '-0.42em', textTransform: 'uppercase', color: '#8ecfc2' }}>Dive In</p>
                        {dsCenter}
                        <div style={{ marginTop: 16, height: 5, borderRadius: 999, background: 'rgba(0,255,200,0.14)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, width: `${barPct}%`, background: 'linear-gradient(90deg, #00ffc8, #b44dff)', boxShadow: '0 0 10px rgba(0,255,200,0.7)', transition: 'width 0.28s linear' }} />
                        </div>
                    </div>
                </div>
            )
        }

        // ── Psychedelic: TUNE IN — the projector plate ──────────────────────
        // Filled with the footage rather than paper, so the count-in matches the join
        // screen's handbill. That makes contrast the whole problem, because the video runs
        // from near-black to pure white: the numerals are cream over an ink stroke, and the
        // label and the progress channel are solid objects. Nothing here reads through a
        // colour that depends on the frame behind it.
        if (theme.name === 'psychedelic') {
            const psBig = (label: string, key: string | number, size = 78) => (
                <div key={key} style={{
                    fontFamily: PSY.FONT_DISPLAY, fontWeight: 400, fontSize: stageFont(size),
                    lineHeight: 1.0, marginTop: 4, ...psyStroke(0.05),
                } as React.CSSProperties}>{label}</div>
            )
            let psCenter: React.ReactNode
            if (remaining <= 0) psCenter = psBig('FAR OUT!', 'go', 50)
            else if (count <= 3) psCenter = psBig(String(count), count)
            else psCenter = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13, marginTop: 12 }}>
                    <NbNote size={24} color={PSY.CREAM} />
                    <span style={{
                        fontFamily: PSY.FONT_DISPLAY, fontWeight: 400, fontSize: stageFont(26),
                        maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        ...psyStroke(0.05),
                    } as React.CSSProperties}>{track.name}</span>
                </div>
            )
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{
                        position: 'relative', minWidth: 380, textAlign: 'center', overflow: 'hidden',
                        border: `${PSY.LINE}px solid ${PSY.INK}`,
                        borderRadius: psyPoured(0, 26),
                        boxShadow: `0 0 0 5px ${PSY.CREAM}, 0 20px 54px rgba(0,0,0,0.65)`,
                        animation: 'psy-stamp-in 0.42s cubic-bezier(0.2, 0.9, 0.3, 1) both',
                    }}>
                        {/* A quarter-clip offset keeps this plate from ever matching the join
                            screen's or the up-next bill's moment. */}
                        <LiquidLight phase={0.25} filter="saturate(1.5) contrast(1.1) brightness(0.48)" />

                        <div style={{ position: 'relative', padding: '22px 52px 26px' }}>
                            {/* Solid ink tab — a 14px letterspaced label has no chance as bare
                                type over moving footage. */}
                            <span style={{
                                display: 'inline-block',
                                background: PSY.INK, color: PSY.CREAM,
                                border: `2px solid ${PSY.INK}`, borderRadius: 999,
                                fontFamily: PSY.FONT_BODY, fontWeight: 800,
                                fontSize: stageFont(13), letterSpacing: '0.26em',
                                textTransform: 'uppercase', padding: '3px 18px 4px',
                            }}>
                                Tune In
                            </span>
                            {psCenter}
                            <div style={{ marginTop: 18, height: 9, borderRadius: 999, background: PSY.INK, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, width: `${barPct}%`, background: PSY.DYES[0], transition: 'width 0.28s linear' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        // ── Space: LAUNCH IN — sleek void console, Orbitron glyphs with a
        // magenta→cyan glow; a T-minus countdown, then LIFTOFF. ──
        if (theme.name === 'space') {
            const spBig = (label: string, key: string | number, size = 68) => (
                <div key={key} style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(size), lineHeight: 1.05, color: '#DCE6F2', letterSpacing: '0.06em', textShadow: '0 0 20px rgba(91,233,255,0.6), 0 0 50px rgba(91,233,255,0.28)', marginTop: 6 }}>{label}</div>
            )
            let spCenter: React.ReactNode
            if (remaining <= 0) spCenter = spBig('LIFTOFF!', 'go', 44)
            else if (count <= 3) spCenter = spBig('T-' + count, count)
            else spCenter = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, color: '#E8E6F0' }}>
                    <NbEq color="#5BE9FF" fontSize={stageFont(22)} />
                    <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(21), letterSpacing: '0.04em', maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</span>
                </div>
            )
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', minWidth: 360, textAlign: 'center', padding: '24px 48px', borderRadius: 10, background: 'rgba(10,10,20,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 14px 44px rgba(0,0,0,0.66), inset 0 0 0 1px rgba(91,233,255,0.32)', animation: 'urban-spray-in 0.45s ease-out both' }}>
                        <p style={{ margin: 0, fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(13), letterSpacing: '0.5em', marginRight: '-0.5em', textTransform: 'uppercase', color: '#5BE9FF', textShadow: '0 0 10px rgba(91,233,255,0.5)' }}>Launch In</p>
                        {spCenter}
                        <div style={{ marginTop: 16, height: 6, borderRadius: 999, background: 'rgba(91,233,255,0.14)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, width: `${barPct}%`, background: 'linear-gradient(90deg, #5BE9FF, #BFF4FF)', boxShadow: '0 0 10px rgba(91,233,255,0.55)', transition: 'width 0.28s linear' }} />
                        </div>
                    </div>
                </div>
            )
        }

        // ── Retrowave: GET READY — sharp midnight panel, Audiowide chrome-sunset
        // glyphs, hot-pink/blue neon edge, sunset progress bar. ──
        if (theme.name === 'retrowave') {
            const rwBig = (label: string, key: string | number, size = 62) => (
                <div key={key} style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(size), lineHeight: 1.1, letterSpacing: '0.04em', marginTop: 8, background: 'linear-gradient(180deg, #FFD700 0%, #FF6B2B 45%, #FF2D95 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 0 16px rgba(255,45,149,0.6))' } as React.CSSProperties}>{label}</div>
            )
            let rwCenter: React.ReactNode
            if (remaining <= 0) rwCenter = rwBig('GO!', 'go', 60)
            else if (count <= 3) rwCenter = rwBig(String(count), count)
            else rwCenter = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, color: '#F0E6FF' }}>
                    <NbEq color="#00BFFF" fontSize={stageFont(22)} />
                    <span style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(20), letterSpacing: '0.04em', maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</span>
                </div>
            )
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', minWidth: 360, textAlign: 'center', padding: '22px 46px', borderRadius: 4, background: 'linear-gradient(180deg, #15082e, #2a1054)', boxShadow: '0 0 26px rgba(255,45,149,0.3), inset 0 0 0 1.5px rgba(255,45,149,0.5), inset 0 0 24px rgba(0,191,255,0.08)', animation: 'urban-spray-in 0.45s ease-out both' }}>
                        <p style={{ margin: 0, fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(13), letterSpacing: '0.4em', textTransform: 'uppercase', color: '#00BFFF', textShadow: '0 0 10px rgba(0,191,255,0.6)' }}>Get Ready</p>
                        {rwCenter}
                        <div style={{ marginTop: 16, height: 7, borderRadius: 2, background: 'rgba(255,45,149,0.14)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${barPct}%`, background: 'linear-gradient(90deg, #FFD700, #FF6B2B, #FF2D95)', boxShadow: '0 0 10px rgba(255,45,149,0.7)', transition: 'width 0.28s linear' }} />
                        </div>
                    </div>
                </div>
            )
        }

        // ── Comic-book: GET READY! — halftone panel with a thick inked border +
        // hard offset, a star sticker, BadaBoom impact type. ──
        if (theme.name === 'comic-book') {
            const cmBig = (label: string, key: string | number, size = 74) => (
                <div key={key} style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(size), lineHeight: 1, color: '#FFD400', WebkitTextStroke: '2.5px #16161D', textShadow: '4px 4px 0 #16161D', marginTop: 8, animation: 'comic-pop 0.3s var(--ease-bounce) both' } as React.CSSProperties}>{label}</div>
            )
            let cmCenter: React.ReactNode
            if (remaining <= 0) cmCenter = cmBig('GO!', 'go', 64)
            else if (count <= 3) cmCenter = cmBig(String(count), count)
            else cmCenter = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, color: '#16161D' }}>
                    <NbNote size={24} color="#FF1F4B" />
                    <span style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(26), maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</span>
                </div>
            )
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', minWidth: 340, textAlign: 'center', padding: '24px 46px', background: '#FFFFFF', backgroundImage: COMIC_DOTS, backgroundSize: '8px 8px', border: '4px solid #16161D', borderRadius: 6, boxShadow: '8px 8px 0 #16161D', animation: 'comic-pop 0.4s var(--ease-bounce) both' }}>
                        <div style={{ position: 'absolute', top: -18, left: -18, width: 48, height: 48, background: '#2FA8FF', clipPath: COMIC_STAR_CLIP }} />
                        <p style={{ margin: 0, fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(18), letterSpacing: '0.06em', textTransform: 'uppercase', color: '#16161D' }}>Get Ready!</p>
                        {cmCenter}
                        <div style={{ marginTop: 16, height: 10, border: '3px solid #16161D', borderRadius: 999, background: '#FFF7E6', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${barPct}%`, background: '#FF1F4B', transition: 'width 0.28s linear' }} />
                        </div>
                    </div>
                </div>
            )
        }

        // ── Tropical: GET READY — carved wood plank in a bamboo frame with a
        // hibiscus pinned to the corner, Florida Vibes script, sun-gold bar. ──
        if (theme.name === 'tropical') {
            const trBig = (label: string, key: string | number, size = 76) => (
                <div key={key} style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(size), lineHeight: 1.02, color: '#FFF1C4', textShadow: '0 2px 0 rgba(0,0,0,0.35), 0 0 22px rgba(255,200,61,0.5)', marginTop: 4 }}>{label}</div>
            )
            let trCenter: React.ReactNode
            if (remaining <= 0) trCenter = trBig('SING!', 'go', 56)
            else if (count <= 3) trCenter = trBig(String(count), count)
            else trCenter = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 10, color: '#FFF1C4' }}>
                    <NbNote size={24} color="#FFC83D" />
                    <span style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(30), maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</span>
                </div>
            )
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', minWidth: 360, textAlign: 'center', padding: '22px 46px', borderRadius: 16, background: 'linear-gradient(165deg, #8A5A2F, #6E4423)', border: '5px solid #CDA85A', boxShadow: '0 16px 34px rgba(14,46,41,0.4)', overflow: 'hidden', animation: 'urban-spray-in 0.45s ease-out both' }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 17px)', pointerEvents: 'none' }} />
                        <TropHibiscus size={46} rotate={-14} style={{ position: 'absolute', top: 8, right: 10 }} />
                        <p style={{ position: 'relative', margin: 0, fontFamily: theme.fontBody, fontWeight: 400, fontSize: stageFont(16), letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FFE7A8' }}>Get Ready</p>
                        <div style={{ position: 'relative' }}>{trCenter}</div>
                        <div style={{ position: 'relative', marginTop: 14, height: 8, borderRadius: 999, background: 'rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, width: `${barPct}%`, background: 'linear-gradient(90deg, #FFC83D, #FF6B3D)', transition: 'width 0.28s linear' }} />
                        </div>
                    </div>
                </div>
            )
        }

        // ── Zen: TAKE A BREATH — an unrolled washi plate. Serif numbers press
        // in like a hanko stamp, an enso ring tucked behind the corner traces
        // the remaining time, and a gold→vermillion ink vein fills below. ──
        if (theme.name === 'zen') {
            let zCenter: React.ReactNode
            const zNum = (label: string, key: string | number, size = 74) => (
                <div key={key} style={{
                    fontFamily: ZEN_SERIF, fontWeight: 600, fontSize: stageFont(size), lineHeight: 1.05,
                    color: ZEN_VERM, textShadow: '0 0 18px rgba(212,68,42,0.3)',
                    animation: 'zen-stamp 0.4s ease-out both', marginTop: 2,
                }}>
                    {label}
                </div>
            )
            if (remaining <= 0) zCenter = zNum('SING', 'go', 56)
            else if (count <= 3) zCenter = zNum(String(count), count)
            else {
                zCenter = (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 }}>
                        <NbNote size={22} color={ZEN_INK} />
                        <span style={{ fontFamily: ZEN_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: stageFont(24), color: ZEN_INK, maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.name}
                        </span>
                    </div>
                )
            }
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', animation: 'zen-scroll-in 0.55s ease-out both' }}>
                        <div style={{
                            position: 'relative', minWidth: 380, textAlign: 'center', padding: '24px 46px', borderRadius: 12,
                            background: ZEN_PAPER, overflow: 'hidden',
                            boxShadow: '0 18px 48px rgba(0,0,0,0.55), 0 0 30px rgba(201,168,76,0.14), inset 0 0 0 1px rgba(201,168,76,0.35)',
                        }}>
                            <ZenEnso size={104} color="rgba(201,168,76,0.5)" progress={barPct / 100} style={{ position: 'absolute', top: -26, right: -22 }} />
                            <p style={{ margin: 0, fontFamily: ZEN_SANS, fontWeight: 500, fontSize: stageFont(13), letterSpacing: '0.5em', textTransform: 'uppercase', color: '#8a7a64' }}>
                                Take a Breath
                            </p>
                            {zCenter}
                            <div style={{ marginTop: 16, height: 4, borderRadius: 999, background: 'rgba(36,31,22,0.12)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${barPct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${ZEN_GOLD}, ${ZEN_VERM})`, transition: 'width 0.28s linear' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        // ── Steampunk: BUILDING PRESSURE — a riveted iron plate. The gauge
        // needle sweeps into the red as the first line approaches, Cinzel
        // numbers punch in like a metal press, and a copper pressure tube
        // fills below. "FULL STEAM!" fires as the song lands. ──
        if (theme.name === 'steampunk') {
            let sCenter: React.ReactNode
            const sNum = (label: string, key: string | number, size = 70) => (
                <div key={key} style={{
                    fontFamily: STM_HEADING, fontWeight: 700, fontSize: stageFont(size), lineHeight: 1.08,
                    color: '#F0DFBE',
                    textShadow: '0 0 14px rgba(200,151,62,0.55), 0 0 34px rgba(224,112,64,0.3), 0 2px 0 rgba(0,0,0,0.5)',
                    animation: 'steam-stamp 0.4s ease-out both', marginTop: 4,
                }}>
                    {label}
                </div>
            )
            if (remaining <= 0) sCenter = sNum('FULL STEAM!', 'go', 38)
            else if (count <= 3) sCenter = sNum(String(count))
            else {
                sCenter = (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 14 }}>
                        <NbNote size={22} color={STM_BRASS} />
                        <span style={{ fontFamily: STM_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: stageFont(23), color: STM_PARCH, maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.name}
                        </span>
                    </div>
                )
            }
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', animation: 'steam-rise 0.5s ease-out both' }}>
                        <div style={{
                            position: 'relative', display: 'flex', alignItems: 'center', gap: 26, padding: '22px 34px',
                            background: STM_PLATE_BG, borderRadius: 6, border: '2px solid #0c0a07',
                            boxShadow: `inset 0 0 0 2px ${STM_BRASS}, inset 0 0 24px rgba(0,0,0,0.5), 0 16px 44px rgba(0,0,0,0.6), 0 0 26px rgba(200,151,62,0.18)`,
                        }}>
                            <SteamRivets />
                            <SteamGauge size={92} progress={barPct / 100} />
                            <div style={{ minWidth: 300, textAlign: 'center' }}>
                                <p style={{ margin: 0, fontFamily: STM_HEADING, fontWeight: 700, fontSize: stageFont(13), letterSpacing: '0.42em', marginRight: '-0.42em', textTransform: 'uppercase', color: STM_BRASS, textShadow: '0 0 10px rgba(200,151,62,0.4)' }}>
                                    Building Pressure
                                </p>
                                {sCenter}
                                <div style={{
                                    marginTop: 14, height: 8, borderRadius: 999, position: 'relative', overflow: 'hidden',
                                    background: '#0d0a07', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 0 rgba(200,151,62,0.25)',
                                }}>
                                    <div style={{
                                        position: 'absolute', top: 0, bottom: 0, left: 0, width: `${barPct}%`, borderRadius: 999,
                                        background: `linear-gradient(90deg, ${STM_BRASS}, ${STM_COPPER} 70%, ${STM_RUST})`,
                                        boxShadow: '0 0 10px rgba(224,112,64,0.6)', transition: 'width 0.28s linear',
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        // ── Urban: MIC CHECK — slashed dark-glass plate, spray-glow numbers ──
        if (theme.name === 'urban') {
            let uCenter: React.ReactNode
            const uNum = (label: string, key: string | number) => (
                <div key={key} style={{ fontFamily: URB_MARKER, fontSize: stageFont(64), lineHeight: 1.08, color: '#FFFFFF', textShadow: `0.05em 0.05em 0 #000, 0 0 26px ${URB_GREEN}80`, animation: 'urban-spray-in 0.26s ease-out both', marginTop: 4, transform: 'rotate(-2deg)' }}>
                    {label}
                </div>
            )
            if (remaining <= 0) uCenter = uNum('GO!', 'go')
            else if (count <= 3) uCenter = uNum(String(count), count)
            else {
                uCenter = (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12, color: '#FFFFFF' }}>
                        <NbEq color={URB_GREEN} fontSize={stageFont(22)} />
                        <span style={{ fontFamily: URB_STENCIL, fontWeight: 700, fontSize: stageFont(22), textTransform: 'uppercase', letterSpacing: '0.06em', maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {track.name}
                        </span>
                    </div>
                )
            }
            return (
                <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                    <div style={{ position: 'relative', display: 'inline-block', animation: 'urban-spray-in 0.45s ease-out both' }}>
                        <div style={{
                            position: 'relative', background: 'rgba(8, 8, 8, 0.85)', backdropFilter: 'blur(10px)',
                            clipPath: 'polygon(1.5% 0, 100% 3%, 98.5% 100%, 0 97%)',
                            boxShadow: '0 18px 44px rgba(0, 0, 0, 0.8)',
                            padding: '24px 46px 26px', minWidth: 360, textAlign: 'center',
                        }}>
                            <p style={{ margin: 0, fontFamily: URB_STENCIL, fontWeight: 700, fontSize: stageFont(14), letterSpacing: '0.55em', textTransform: 'uppercase', color: URB_GREEN, textShadow: `0 0 12px ${URB_GREEN}66` }}>
                                Mic Check
                            </p>
                            {uCenter}
                            <div style={{ marginTop: 16, height: 8, background: 'rgba(255, 255, 255, 0.12)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${barPct}%`, background: URB_GREEN, boxShadow: `0 0 12px ${URB_GREEN}99`, transition: 'width 0.28s linear' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        // ── Neo-brutal: GET READY — slammed white plate on a yellow offset ──
        // Centerpiece: eq + title while there's time, 3-2-1 in the last three
        // seconds, then a GO! as the first line lands (keyed so each state
        // re-slams). The GO! frame is what's on screen while the plate scrolls up.
        let center: React.ReactNode
        if (remaining <= 0) {
            center = (
                <div key="go" style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(72), lineHeight: 1.05, color: NB_INK, animation: 'nb-slam 0.3s var(--ease-bounce) both', marginTop: 6 }}>
                    GO!
                </div>
            )
        } else if (count <= 3) {
            center = (
                <div key={count} style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(72), lineHeight: 1.05, color: NB_INK, animation: 'nb-slam 0.3s var(--ease-bounce) both', marginTop: 6 }}>
                    {count}
                </div>
            )
        } else {
            center = (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 14, color: NB_INK }}>
                    <NbEq color={NB_INK} fontSize={stageFont(24)} />
                    <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(23), maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.name}
                    </span>
                </div>
            )
        }
        return (
            <div ref={countInRef} className={exitCls} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
                <div style={{ position: 'relative', display: 'inline-block', animation: 'nb-slam 0.45s var(--ease-bounce) both' }}>
                    <div style={{ position: 'absolute', inset: 0, transform: 'translate(9px, 9px)', background: '#FFD60A', border: `3px solid ${NB_INK}` }} />
                    <div style={{ position: 'relative', background: '#FFFFFF', border: `4px solid ${NB_INK}`, padding: '22px 42px 24px', minWidth: 340, textAlign: 'center' }}>
                        <p style={{ margin: 0, fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(15), letterSpacing: '0.34em', color: NB_INK, opacity: 0.65 }}>
                            GET READY
                        </p>
                        {center}
                        <div style={{ marginTop: 16, height: 10, border: `2.5px solid ${NB_INK}`, background: '#F5ECDC', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${barPct}%`, background: NB_INK, transition: 'width 0.28s linear' }} />
                        </div>
                    </div>
                </div>
            </div>
        )
    })() : null

    return (
        <>
        <div
            className={
                'karaoke-stage' +
                (ytId ? ' k-stage--video' : '') +
                (state.stageMode === 'playing' && !state.isPlaying ? ' k-stage--paused' : '')
            }
            onMouseMove={handleMouse}
            style={{ cursor: showUI ? 'default' : 'none' }}
        >
            {/* Background with crossfade — blurred art / video are hidden while a secret song waits in ready state.
                The YT player DOM element stays mounted so it can initialize; we just make it invisible until the song actually plays. */}
            <div className="k-bg">
                {/* Previous art stays visible until new art loads */}
                {prevArt && prevArt !== art && !artLoaded && !(np?.isHidden && state.stageMode === 'ready') && (
                    <img className="k-bg__img k-bg__img--prev" src={prevArt} alt="" style={{ opacity: 1 }} />
                )}
                {art && !(np?.isHidden && state.stageMode === 'ready') && <img className="k-bg__img" src={art} alt="" style={{ opacity: artLoaded || !prevArt ? 1 : 0 }} />}
                {ytId && (
                    <div
                        className="k-bg__yt-wrap"
                        style={{
                            // Hidden until YouTube confirms it's actually playing (state 1).
                            // -1 unstarted / 2 paused / 5 cued all show the YT center
                            // play-button overlay; we hide the iframe during those so the
                            // user never sees it. During the Up Next snippet preview we
                            // also keep it visible through buffering (3) so the re-seek
                            // between slices every 4s doesn't flash the blurred art.
                            opacity:
                                (state.isPlaying && ytPlayState === 1) ||
                                (videoPreviewActive && (ytPlayState === 1 || ytPlayState === 3))
                                    ? 1
                                    : 0,
                            transition: 'opacity 0.4s ease',
                            // pointer-events: none so user clicks can't summon YT's UI overlay
                            pointerEvents: 'none',
                            // Keep the element in the DOM so YT.Player can attach; just hide it visually for secret songs in ready state.
                            visibility: (np?.isHidden && state.stageMode === 'ready') ? 'hidden' : 'visible',
                        }}
                    >
                        <div id="yt-bg-player" />
                        <div className="k-bg__yt-mask" aria-hidden="true" />
                    </div>
                )}
                {/* Space: a song with neither video nor album art would leave the
                    backdrop bare, so the outboard view fills in — dimmed and
                    slowed via `performing` so the lyrics keep the screen. When
                    art or video IS present that art is the backdrop, and a
                    second moving layer would only compete with the words; the
                    theme's identity during playback comes from the panel chrome
                    instead. Keeping 3D off the playing path also protects the
                    frame budget at exactly the moment it matters most, with
                    audio decoding and per-syllable lyrics already running. */}
                {theme.name === 'space' && !art && !ytId && <SpaceOutboard performing />}
                {/* Psychedelic: same reasoning as space above. A song with neither video
                    nor album art would leave the backdrop bare, so the projector fills in
                    — dimmed and slowed via `performing` so the lyric plates keep the
                    screen. When art or video IS present that art is the backdrop and a
                    second moving colour field would only fight the words. */}
                {theme.name === 'psychedelic' && !art && !ytId && <LiquidLight performing />}
                <div className="k-bg__scrim" style={{ opacity: state.stageMode === 'playing' ? 1 : 0 }} />
            </div>

            {/* Reactions overlay — above video, behind lyrics */}
            <ReactionsOverlay />

            {/* Tomato throws — physical lob + splatter on top of the whole stage */}
            <TomatoSplatterLayer />

            {/* Flower tosses — bouquet thrown, flutters down, rests at the bottom */}
            <FlowerLayer />

            {/* Zen ambience — drifting petals + low mist over the live stage */}
            {theme.name === 'zen' && state.stageMode === 'playing' && <ZenAmbient />}

            {/* Steampunk ambience — faint corner gears + venting steam wisps */}
            {theme.name === 'steampunk' && state.stageMode === 'playing' && <SteamAmbient />}

            {/* Hidden SVG for Filters */}
            <svg style={{ position: 'fixed', pointerEvents: 'none', width: 0, height: 0 }}>
                <defs>
                    <filter id="urban-rough-filter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.04 0.15" numOctaves="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    <filter id="sketch-rough-filter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.035" numOctaves="2" seed="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    <filter id="sketch-rough-filter-b">
                        <feTurbulence type="fractalNoise" baseFrequency="0.022 0.04" numOctaves="2" seed="11" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
            </svg>

            {/* Song chip (top-left) — suppressed while a hidden song waits in ready state */}
            {!(np?.isHidden && state.stageMode === 'ready') && (
            <div className="k-song-chip" style={{
                background: theme.appBg, ...theme.stickerLabel, position: 'absolute', opacity: 1,
                ...(theme.name === 'psychedelic' ? {
                    // A cream tag with an ink keyline and a dye spine — the same object
                    // as a queue row on the phone. The shared `stickerLabel` puts amber
                    // behind ink at 10px here, which at stage distance is a smudge.
                    background: PSY.CREAM,
                    border: `${PSY.LINE}px solid ${PSY.INK}`,
                    borderLeft: `10px solid ${PSY.DYES[0]}`,
                    borderRadius: psyPoured(0, 16, 7),
                    boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
                    color: PSY.INK,
                    padding: '8px 18px 9px 12px',
                    maxWidth: 'min(38vw, 520px)',
                    letterSpacing: 'normal',
                    textTransform: 'none',
                    textShadow: 'none',
                    animation: 'psy-stamp-in 0.42s cubic-bezier(0.2,0.9,0.3,1) both',
                } as React.CSSProperties : {}),
                ...(theme.name === 'neo-brutal' ? {
                    background: '#FFFFFF',
                    border: `3px solid ${NB_INK}`,
                    borderRadius: 0,
                    boxShadow: `6px 6px 0 ${NB_INK}`,
                    padding: '8px 14px 8px 10px',
                    color: NB_INK,
                    maxWidth: 'min(38vw, 520px)',
                    ['--nb-rot' as string]: '-0.6deg',
                    animation: 'nb-pop-in 0.4s var(--ease-bounce) both',
                } as React.CSSProperties : {}),
                ...(theme.name === 'urban' ? {
                    background: 'rgba(10, 10, 10, 0.78)',
                    backdropFilter: 'blur(14px)',
                    border: 'none',
                    borderLeft: `3px solid ${URB_GREEN}`,
                    borderRadius: 0,
                    clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
                    padding: '8px 26px 8px 12px',
                    color: '#FFFFFF',
                    maxWidth: 'min(38vw, 520px)',
                    transform: 'none',
                    textShadow: 'none',
                    letterSpacing: 'normal',
                    animation: 'urban-spray-in 0.4s ease-out both',
                } as React.CSSProperties : {}),
                ...(theme.name === 'zen' ? {
                    background: 'rgba(24,20,15,0.82)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    borderRadius: 10,
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 10px 26px rgba(0,0,0,0.45), 0 0 18px rgba(201,168,76,0.08)',
                    color: ZEN_WASHI,
                    textTransform: 'none',
                    letterSpacing: 'normal',
                    textShadow: 'none',
                    maxWidth: 'min(38vw, 520px)',
                    animation: 'zen-scroll-in 0.5s ease-out both',
                } as React.CSSProperties : {}),
                ...(theme.name === 'space' ? {
                    background: 'rgba(8,8,15,0.85)',
                    border: '1px solid rgba(64,224,208,0.2)',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.55), 0 0 10px rgba(91,233,255,0.08)',
                    borderRadius: 8,
                    backdropFilter: 'blur(16px)',
                    color: '#E8E6F0',
                } : theme.name === 'steampunk' ? {
                    background: 'rgba(23,19,14,0.88)',
                    border: '1px solid #0c0a07',
                    boxShadow: `inset 0 0 0 1.5px rgba(200,151,62,0.55), inset 0 0 12px rgba(0,0,0,0.5), 0 10px 26px rgba(0,0,0,0.55)`,
                    borderRadius: 4,
                    backdropFilter: 'blur(16px)',
                    color: '#E8DCC8',
                    textTransform: 'none',
                    letterSpacing: 'normal',
                    textShadow: 'none',
                    maxWidth: 'min(38vw, 520px)',
                    animation: 'steam-rise 0.5s ease-out both',
                } : theme.name === 'retrowave' ? {
                    background: 'rgba(10,6,20,0.88)',
                    border: '1px solid rgba(255,45,149,0.25)',
                    boxShadow: '0 0 10px rgba(255,45,149,0.08), 0 0 20px rgba(0,191,255,0.04)',
                    borderRadius: 4,
                    backdropFilter: 'blur(16px)',
                    color: '#F0E6FF',
                } : {}),
            }}>
                {art && <img className="k-song-chip__art" src={art} alt="" style={
                    theme.name === 'neo-brutal' ? { borderRadius: 0, border: `2.5px solid ${NB_INK}`, boxShadow: 'none' } : theme.name === 'urban' ? { borderRadius: 0, clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)', boxShadow: 'none' } : theme.name === 'zen' ? { borderRadius: 8, border: '1px solid rgba(201,168,76,0.35)', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' } : theme.name === 'space' ? { boxShadow: '0 8px 26px rgba(0,0,0,0.6), 0 0 14px rgba(91,233,255,0.12)', borderRadius: 0, border: '1px solid rgba(91,233,255,0.22)' } : theme.name === 'steampunk' ? { boxShadow: '0 0 10px rgba(200,151,62,0.15), 0 6px 20px rgba(0,0,0,0.5)', borderRadius: 3, border: '1px solid rgba(200,151,62,0.2)' } : theme.name === 'retrowave' ? { boxShadow: '0 0 10px rgba(255,45,149,0.15), 0 6px 20px rgba(0,0,0,0.5)', borderRadius: 4, border: '1px solid rgba(255,45,149,0.15)' } : {}
                } />}
                <div className="k-song-chip__text" style={theme.name === 'neo-brutal' || theme.name === 'urban' || theme.name === 'zen' || theme.name === 'steampunk' ? { minWidth: 0 } : {}}>
                    <h3 style={{ fontFamily: theme.fontDisplay, ...(theme.name === 'neo-brutal' ? { color: NB_INK, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 } as React.CSSProperties : theme.name === 'urban' ? { color: '#FFFFFF', fontFamily: URB_STENCIL, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 } as React.CSSProperties : theme.name === 'zen' ? { color: '#F5EBD8', fontFamily: ZEN_SERIF, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 } as React.CSSProperties : theme.name === 'space' ? { color: '#DCE6F2', textShadow: '0 0 10px rgba(91,233,255,0.3)' } : theme.name === 'steampunk' ? { color: '#E8DCC8', fontFamily: "'Cinzel', serif", fontWeight: 600, textShadow: '0 0 10px rgba(200,151,62,0.25), 0 1px 0 rgba(0,0,0,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 } as React.CSSProperties : theme.name === 'retrowave' ? { color: '#F0E6FF', textShadow: '0 0 10px rgba(255,45,149,0.25)' } : {}) }}>{track.name}</h3>
                    <p style={{ color: theme.muted, ...(theme.name === 'neo-brutal' ? { color: '#555555', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 } as React.CSSProperties : theme.name === 'urban' ? { color: URB_ASH, fontFamily: URB_STENCIL, fontWeight: 300, letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 } as React.CSSProperties : theme.name === 'zen' ? { color: ZEN_WASHI_DIM, fontFamily: ZEN_SANS, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 } as React.CSSProperties : theme.name === 'space' ? { color: '#7B8A9C' } : theme.name === 'steampunk' ? { color: '#A89878', fontStyle: 'italic', letterSpacing: '0.12em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 } as React.CSSProperties : theme.name === 'retrowave' ? { color: '#9B8CBF' } : {}) }}>{track.artists.map((a: any) => a.name).join(', ')}</p>
                </div>
            </div>
            )}

            {/* Singer tags (top-right) */}
            {singers.length > 0 && (
                <div className="k-singers" style={{ opacity: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                    {singers.map((s: any, singerIdx: number) => {
                        const spaceSingerStyle = theme.name === 'psychedelic' ? {
                            // Ink-filled with the singer's colour as a fat spine. Ink fill
                            // rather than the singer's own colour, because singer colours are
                            // user-picked and one of them will eventually match the plate it
                            // lands on — the phone's chips solve it the same way.
                            background: PSY.INK,
                            border: `${PSY.LINE}px solid ${PSY.INK}`,
                            borderRight: `9px solid ${s.color}`,
                            borderRadius: psyPoured(singerIdx, 15, 6),
                            boxShadow: '0 10px 24px rgba(0,0,0,0.5)',
                            color: PSY.CREAM,
                            letterSpacing: 'normal',
                            textTransform: 'none',
                            textShadow: 'none',
                            animation: `psy-stamp-in 0.4s cubic-bezier(0.2,0.9,0.3,1) ${singerIdx * 0.07}s both`,
                        } as React.CSSProperties : theme.name === 'neo-brutal' ? {
                            background: '#FFFFFF',
                            border: `2.5px solid ${NB_INK}`,
                            borderLeft: `10px solid ${s.color}`,
                            borderRadius: 0,
                            boxShadow: `4px 4px 0 ${NB_INK}`,
                            color: NB_INK,
                            ['--nb-rot' as string]: `${singerIdx % 2 === 0 ? -0.9 : 0.9}deg`,
                            animation: `nb-pop-in 0.4s var(--ease-bounce) ${singerIdx * 0.07}s both`,
                        } as React.CSSProperties : theme.name === 'urban' ? {
                            background: 'rgba(10, 10, 10, 0.78)',
                            backdropFilter: 'blur(12px)',
                            border: 'none',
                            borderRight: `5px solid ${s.color}`,
                            borderRadius: 0,
                            clipPath: 'polygon(10px 0, 100% 0, 100% 100%, 0 100%)',
                            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.65)',
                            color: '#FFFFFF',
                            transform: 'none',
                            textShadow: 'none',
                            letterSpacing: 'normal',
                            animation: `urban-spray-in 0.4s ease-out ${singerIdx * 0.08}s both`,
                        } as React.CSSProperties : theme.name === 'zen' ? {
                            background: 'rgba(24,20,15,0.82)',
                            border: '1px solid rgba(201,168,76,0.22)',
                            borderRight: `4px solid ${s.color}`,
                            borderRadius: 8,
                            backdropFilter: 'blur(14px)',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                            color: ZEN_WASHI,
                            fontFamily: ZEN_SERIF,
                            textTransform: 'none',
                            letterSpacing: 'normal',
                            textShadow: 'none',
                            animation: `zen-scroll-in 0.5s ease-out ${singerIdx * 0.08}s both`,
                        } as React.CSSProperties : theme.name === 'space' ? {
                            background: 'rgba(8,8,15,0.85)',
                            border: '1px solid ' + (s.color ? s.color.replace(')', ',0.3)').replace('rgb(', 'rgba(') : 'rgba(64,224,208,0.2)'),
                            boxShadow: '0 0 10px ' + (s.color ? s.color.replace(')', ',0.1)').replace('rgb(', 'rgba(') : 'rgba(64,224,208,0.08)'),
                            borderRadius: 6,
                            backdropFilter: 'blur(16px)',
                            color: '#E8E6F0',
                        } as React.CSSProperties : theme.name === 'steampunk' ? {
                            background: 'rgba(23,19,14,0.88)',
                            border: '1px solid #0c0a07',
                            borderRadius: 4,
                            backdropFilter: 'blur(16px)',
                            boxShadow: `inset 0 0 0 1.5px rgba(200,151,62,0.5), inset 0 0 10px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.5), 0 0 10px color-mix(in srgb, ${s.color}, transparent 65%)`,
                            color: '#E8DCC8',
                            textTransform: 'none',
                            letterSpacing: 'normal',
                            textShadow: 'none',
                            animation: `steam-rise 0.5s ease-out ${singerIdx * 0.08}s both`,
                        } as React.CSSProperties : theme.name === 'retrowave' ? {
                            background: 'rgba(10,6,20,0.88)',
                            border: '1px solid rgba(255,45,149,0.25)',
                            boxShadow: '0 0 8px rgba(255,45,149,0.1)',
                            borderRadius: 4,
                            backdropFilter: 'blur(16px)',
                            color: '#F0E6FF',
                        } as React.CSSProperties : {}
                        if (s.micDeviceId) {
                            // Enable mic + effects when ready (Up Next) or playing — singer can warm up before song starts
                            const micActive = state.stageMode === 'playing' || state.stageMode === 'ready'
                            let singerEffects = micActive ? voiceEffects : null
                            if (singerEffects && Array.isArray(singerEffects)) {
                                const index = s.roleIndices && s.roleIndices.length > 0 ? s.roleIndices[0] : 0
                                singerEffects = singerEffects[index] || singerEffects[0]
                            }
                            // Per-mic FX/autotune toggle: a guest's mobile toggle
                            // is keyed by their singer key and applies to THIS mic
                            // only. Fall back to the session-wide host toggle, then
                            // default on.
                            const fxKey = singerFxKey({ guestId: s.guestId, name: s.name })
                            const ov = fxKey ? state.micFxOverrides?.[fxKey] : undefined
                            const vocalFx = ov?.vocalFx ?? state.sessionFx?.vocalFx ?? true
                            const autotune = ov?.autotune ?? state.sessionFx?.autotune ?? true
                            return (
                                <div key={s.id} className="k-singer-tag" style={{ background: theme.appBg, ...theme.stickerLabel, position: 'relative', padding: '4px 12px', ...spaceSingerStyle }}>
                                    <MicMeter singer={s} active={micActive} effects={singerEffects} vocalFx={vocalFx} autotune={autotune} mainOutputId={state.mainOutputId} theme={theme} />
                                </div>
                            )
                        } else {
                            return (
                                <div key={s.id} className="k-singer-tag" style={{ background: theme.appBg, ...theme.stickerLabel, position: 'relative', padding: '4px 12px', ...spaceSingerStyle }}>
                                    <span style={{ color: 'inherit', fontFamily: theme.fontDisplay }}>{s.name}</span>
                                    <div className="k-singer-tag__dot" style={{ background: s.color, ...(theme.name === 'space' ? { boxShadow: '0 0 6px ' + s.color } : {}) }} />
                                </div>
                            )
                        }
                    })}
                </div>
            )}

            {/* Spare mics: every configured mic slot no singer occupies stays
                live with the first singer's effects, so anyone can hop in. */}
            <OpenMics
                micSlots={state.micSlots}
                singers={singers}
                voiceEffects={voiceEffects}
                vocalFx={state.sessionFx?.vocalFx ?? true}
                autotune={state.sessionFx?.autotune ?? true}
                mainOutputId={state.mainOutputId}
                active={state.stageMode === 'playing' || state.stageMode === 'ready'}
            />

            {/* Lyrics & Stage Centerpiece */}
            <div
                className="k-lyrics"
                ref={lyricsRef}
                style={state.stageMode === 'ready' ? { justifyContent: 'center' } : undefined}
            >
                {state.stageMode === 'ready' ? (
                  theme.name === 'neo-brutal' ? (
                    <NeoBrutalUpNext theme={theme} art={art} track={track} singers={singers} np={np} roles={roles} guestsMap={guestsMap} showVideo={showVideoBehindArt} />
                  ) : theme.name === 'urban' ? (
                    <UrbanUpNext theme={theme} art={art} track={track} singers={singers} np={np} roles={roles} guestsMap={guestsMap} showVideo={showVideoBehindArt} />
                  ) : theme.name === 'comic-book' ? (
                    <ComicUpNext theme={theme} art={art} track={track} singers={singers} np={np} roles={roles} guestsMap={guestsMap} />
                  ) : theme.name === 'tropical' ? (
                    <TropicalUpNext theme={theme} art={art} track={track} singers={singers} np={np} roles={roles} guestsMap={guestsMap} showVideo={showVideoBehindArt} />
                  ) : theme.name === 'zen' ? (
                    <ZenUpNext theme={theme} art={art} track={track} singers={singers} np={np} roles={roles} guestsMap={guestsMap} showVideo={showVideoBehindArt} />
                  ) : theme.name === 'steampunk' ? (
                    <SteampunkUpNext theme={theme} art={art} track={track} singers={singers} np={np} roles={roles} guestsMap={guestsMap} showVideo={showVideoBehindArt} />
                  ) : theme.name === 'psychedelic' ? (
                    <PsyUpNext theme={theme} art={art} track={track} singers={singers} np={np} roles={roles} guestsMap={guestsMap} />
                  ) : (
                    <div className="anim-enter k-upnext" style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
                        <div style={{
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: 40, 
                        }}>
                            <div style={{
                                background: theme.appBg,
                                ...theme.stickerLabel,
                                position: 'relative',
                                display: 'inline-block',
                                padding: '8px 24px',
                                fontSize: stageFont(13), fontWeight: 800, color: theme.mintGreen || theme.page?.color, letterSpacing: '0.2em', textTransform: 'uppercase',
                            }}>
                                Up Next
                            </div>
                            {/* Prominent album art — or themed Hidden panel for surprise songs */}
                            {np?.isHidden ? (
                                <HiddenSongStagePanel theme={theme} />
                            ) : art ? (
                                <img
                                    src={art}
                                    alt=""
                                    style={{
                                        width: 340,
                                        height: 340,
                                        borderRadius: theme.radius,
                                        boxShadow: theme.shadow,
                                        border: theme.border,
                                        objectFit: 'cover',
                                    }}
                                />
                            ) : null}
                            <div style={{ textAlign: 'center', ...theme.card, padding: '32px 48px' }}>
                                {np?.isHidden ? (
                                    <HiddenSongStageHeading theme={theme} />
                                ) : (
                                    <>
                                        <h1 style={{ fontFamily: theme.fontDisplay, color: theme.page?.color as string || theme.black, fontSize: stageFont(42), fontWeight: 800, lineHeight: 1.15, marginBottom: 10, letterSpacing: '-0.5px' }}>
                                            {track.name}
                                        </h1>
                                        <p style={{ fontSize: stageFont(18), color: theme.muted, opacity: theme.name === 'sketch' ? 1 : 0.8, marginBottom: 36, display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
                                            <span>{track.artists.map((a: any) => a.name).join(', ')}</span>
                                            {track.duration_ms && (
                                                <>
                                                    <span style={{ opacity: 0.5 }}>•</span>
                                                    <span>
                                                        {Math.floor(track.duration_ms / 60000)}:
                                                        {Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                    </>
                                )}
                                {/* Large, prominent singer names (roles hidden when song is a surprise) */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
                                    {singers.map(s => {
                                        const roleStr = !np?.isHidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                            ? s.roleIndices.map(idx => roles[idx]).filter(Boolean).join(' & ')
                                            : ''
                                        const tagGuest = s.guestId ? guestsMap.get(s.guestId) : undefined
                                        const singerName = tagGuest?.name ?? s.name
                                        const singerPic = tagGuest?.profile_picture ?? null
                                        const displayText = roleStr ? `${singerName} - ${roleStr}` : singerName
                                        
                                        return (
                                            <div
                                                key={s.id}
                                                style={{
                                                    background: theme.appBg,
                                                    ...theme.stickerLabel,
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 12,
                                                    padding: '16px 36px',
                                                    color: s.color,
                                                    fontWeight: 700,
                                                    fontSize: stageFont(28),
                                                }}
                                            >
                                                {singerPic && (
                                                    <img src={singerPic} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                                )}
                                                {displayText}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                  )
                ) : groupedLyrics.length === 0 ? (
                    theme.name === 'neo-brutal' ? (
                        <div className="nb-rise" style={{ textAlign: 'center' }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 18,
                                background: '#FFFFFF', border: `4px solid ${NB_INK}`, boxShadow: `8px 8px 0 ${NB_INK}`,
                                padding: '20px 36px', transform: 'rotate(-1deg)',
                            }}>
                                <NbEq color="#FF3B30" fontSize={stageFont(24)} />
                                <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(24), color: NB_INK, letterSpacing: '0.04em' }}>
                                    NO LYRICS — FREESTYLE IT
                                </span>
                            </div>
                        </div>
                    ) : theme.name === 'urban' ? (
                        <div style={{ textAlign: 'center', animation: 'urban-spray-in 0.45s ease-out both' }}>
                            <UrbanSprayPlate color={URB_GREEN} filterId="urban-rough-filter" rotate={-2} drips style={{ padding: '6px 22px 10px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '2px 6px' }}>
                                    <NbEq color="#0A0A0A" fontSize={stageFont(22)} />
                                    <span style={{ fontFamily: URB_STENCIL, fontWeight: 700, fontSize: stageFont(23), letterSpacing: '0.24em', textTransform: 'uppercase' }}>
                                        No Lyrics — Freestyle
                                    </span>
                                </span>
                            </UrbanSprayPlate>
                        </div>
                    ) : theme.name === 'steampunk' ? (
                        <div style={{ textAlign: 'center', animation: 'steam-rise 0.55s ease-out both' }}>
                            <div style={{
                                position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 18, padding: '20px 36px',
                                background: STM_PLATE_BG, borderRadius: 6, border: '2px solid #0c0a07',
                                boxShadow: `inset 0 0 0 2px ${STM_BRASS}, inset 0 0 18px rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.6), 0 0 22px rgba(200,151,62,0.15)`,
                            }}>
                                <SteamRivets />
                                <NbNote size={26} color={STM_BRASS} />
                                <span style={{ fontFamily: STM_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: stageFont(25), color: STM_PARCH, textShadow: '0 0 12px rgba(200,151,62,0.25)' }}>
                                    No libretto — improvise!
                                </span>
                            </div>
                        </div>
                    ) : theme.name === 'zen' ? (
                        <div style={{ textAlign: 'center', animation: 'zen-scroll-in 0.55s ease-out both' }}>
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 18, padding: '20px 36px', borderRadius: 12,
                                background: ZEN_PAPER,
                                boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 26px rgba(201,168,76,0.12), inset 0 0 0 1px rgba(201,168,76,0.4)',
                            }}>
                                <ZenEnso size={34} color={ZEN_VERM} strokeWidth={7} progress={1} />
                                <span style={{ fontFamily: ZEN_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: stageFont(26), color: ZEN_INK }}>
                                    No lyrics — sing from the heart
                                </span>
                            </div>
                        </div>
                    ) : (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: stageFont(22), fontWeight: 700, color: 'var(--white-faint)' }}>
                            No lyrics available
                        </p>
                    </div>
                    )
                ) : (
                    <>
                    {nbCountIn}
                    {groupedLyrics.map((group: any[], i: number) => {
                        const isActiveGroup = lineIdx >= 0 && group.some(l => l.originalIndex === lineIdx)
                        const isPastGroup = lineIdx >= 0 && group[group.length - 1].originalIndex < lineIdx

                        return (
                            <div key={i} style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', isolation: 'isolate' }}>
                                {group.map((line: any, j: number) => {
                                    let cls = 'k-line k-line--lg'
                                    // Psychedelic only: the active plate gets a faint layer of the
                                    // projector footage over its colour, behind the words.
                                    let psyFilm = false
                                    let inlineStyle: React.CSSProperties = {
                                        fontFamily: theme.fontDisplay
                                    }

                                    const activeColors = line.singerIndices && line.singerIndices.length > 1
                                        ? line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                        : []
                                    const activeSingerColor = line.singerIndex !== undefined && singers[line.singerIndex]?.color
                                        ? singers[line.singerIndex].color
                                        : theme.accentA
                                    const activeHighlight = activeColors.length > 1
                                        ? `linear-gradient(90deg, ${activeColors.join(', ')})`
                                        : activeSingerColor
                                    const ACTIVE_TEXT = '#0a0a0a'

                                    if (isActiveGroup) {
                                        cls += ' k-line--now'
                                        inlineStyle.background = activeHighlight
                                        inlineStyle.color = ACTIVE_TEXT
                                        inlineStyle.padding = '0.12em 0.55em'
                                        // Expose the active line's singer color as a CSS variable so
                                        // each theme's per-syllable rules can derive lightened/darkened
                                        // variants via color-mix(). Falls back to the first singer of a
                                        // multi-singer line, then to theme.accentA via activeSingerColor.
                                        const sylSinger = activeColors.length > 1 ? activeColors[0] : activeSingerColor
                                        // @ts-ignore (CSS variables)
                                        inlineStyle['--syl-singer'] = sylSinger

                                        if (theme.name === 'neo-brutal') {
                                            // Stamped color plate. Shared lines get hard-split
                                            // color bands with ink seams (no gradients — panels
                                            // butted against each other); the text color is
                                            // luminance-chosen so ANY singer color combo stays
                                            // readable. Sizes are em-based so the plate scales
                                            // with the viewport-relative lyric font.
                                            cls += ' k-line--neo-brutal-active'
                                            const nbColors = activeColors.length > 1 ? activeColors : [activeSingerColor]
                                            const nbInkColor = nbTextOn(nbColors)
                                            const nbHasSyls = !!(line.syllables && line.syllables.length > 0)
                                            if (!nbHasSyls) {
                                                // Pacing underline timed to the line's real duration
                                                // (next group's start), for songs without syllables.
                                                const nbNextStart = groupedLyrics[i + 1]?.[0]?.startTimeMs
                                                const nbLineDur = typeof nbNextStart === 'number' ? nbNextStart - group[0].startTimeMs : 0
                                                if (nbLineDur > 1200) {
                                                    cls += ' k-line--nb-timed'
                                                    inlineStyle['--nb-line-dur'] = `${nbLineDur}ms`
                                                }
                                            }
                                            inlineStyle.background = nbSplitBackground(nbColors)
                                            inlineStyle.color = nbInkColor
                                            inlineStyle['--nb-card-ink'] = nbInkColor
                                            inlineStyle.textShadow = 'none'
                                            inlineStyle.padding = '0.16em 0.6em 0.2em'
                                            inlineStyle.border = '0.08em solid #141414'
                                            inlineStyle.borderRadius = 0
                                            inlineStyle.boxShadow = '0.17em 0.17em 0 rgba(20, 20, 20, 0.95)'
                                            inlineStyle.margin = '0.06em 0'
                                        } else if (theme.name === 'sketch') {
                                            cls += ' k-line--sketch-active'
                                            inlineStyle.padding = '0.22em 0.95em'
                                            inlineStyle.background = 'transparent'
                                            inlineStyle.color = '#2d2d2d'
                                            inlineStyle.transform = 'rotate(-1deg)'
                                            // @ts-ignore (CSS variables)
                                            inlineStyle['--sketch-fill'] = activeHighlight
                                        } else if (theme.name === 'cyberpunk') {
                                            cls += ' k-line--cyber k-line--cyber-active'
                                            inlineStyle.padding = '0.2em 1em'
                                            inlineStyle.borderRadius = '0'
                                            inlineStyle.clipPath = 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)'
                                            // Punchier neon bloom + a crisp dark inset frame so the plate
                                            // reads as a framed HUD readout (the rolling scanlines live in
                                            // the ::before/::after of .k-line--cyber-active).
                                            inlineStyle.boxShadow = `0 0 22px ${activeSingerColor}, 0 0 54px ${activeSingerColor}, inset 0 0 0 2px rgba(0,0,0,0.55), inset 0 0 16px rgba(0,0,0,0.4)`
                                        } else if (theme.name === 'urban') {
                                            // Spray-painted tag: rough turbulence plate in the
                                            // singer's color (a gradient fade for shared lines —
                                            // the fade IS the graffiti piece), wet drips off the
                                            // bottom in the first/last singer's solid colors, and
                                            // luminance-chosen ink so dark colors flip the text
                                            // to white. Blur-mist entrance lives on the class.
                                            cls += ' k-line--urban-active'
                                            const uColors = activeColors.length > 1 ? activeColors : [activeSingerColor]
                                            const uInk = urbanTextOn(uColors)
                                            const uHasSyls = !!(line.syllables && line.syllables.length > 0)
                                            if (!uHasSyls) {
                                                // Marker-stroke pacing underline for LRC-only lines,
                                                // timed to the line's real duration.
                                                const uNextStart = groupedLyrics[i + 1]?.[0]?.startTimeMs
                                                const uLineDur = typeof uNextStart === 'number' ? uNextStart - group[0].startTimeMs : 0
                                                if (uLineDur > 1200) {
                                                    cls += ' k-line--urban-timed'
                                                    inlineStyle['--nb-line-dur'] = `${uLineDur}ms`
                                                }
                                            }
                                            inlineStyle['--highlight-color'] = activeHighlight
                                            inlineStyle['--urban-drip-a'] = uColors[0]
                                            inlineStyle['--urban-drip-b'] = uColors[uColors.length - 1]
                                            inlineStyle['--urban-plate-ink'] = uInk
                                            // Clear the generic singer-color fill via backgroundColor
                                            // ONLY — a `background` shorthand would also wipe the
                                            // pacing-underline background-image that the
                                            // .k-line--urban-timed class paints on this element.
                                            inlineStyle.background = undefined
                                            inlineStyle.backgroundColor = 'transparent'
                                            inlineStyle.color = uInk
                                            inlineStyle.padding = '0.12em 0.45em'
                                            inlineStyle.textShadow = 'none'
                                        } else if (theme.name === 'deep-sea') {
                                            cls += ' k-line--deep-sea k-line--deep-sea-active'
                                            inlineStyle.padding = '0.22em 0.85em'
                                            inlineStyle.borderRadius = '999px'
                                            inlineStyle.boxShadow = `0 0 28px ${activeSingerColor}, 0 0 60px rgba(0,255,200,0.35), inset 0 1px 0 rgba(255,255,255,0.4)`
                                        } else if (theme.name === 'psychedelic') {
                                            // ── A printed handbill line ──────────────────
                                            // An opaque plate of the singer's colour with a
                                            // heavy ink keyline and poured corners — the same
                                            // construction as every card in the mobile app.
                                            //
                                            // Type colour is chosen by LUMINANCE, not fixed:
                                            // singer colours are user-picked, so a fixed ink
                                            // fill vanishes on a dark pick and a fixed cream
                                            // fill vanishes on a bright one. `nbTextOn` already
                                            // solves this for the neo-brutal poster stage, and
                                            // multi-singer lines reuse `nbSplitBackground`,
                                            // which butts one hard band per singer with ink
                                            // seams instead of blending them into sludge.
                                            //
                                            // The previous version filled this line with a
                                            // 300%-scaled animated gradient inside a morphing
                                            // organic border-radius, ringed in two coloured
                                            // glows. Over footage that is itself saturated and
                                            // moving, none of that separated the words from the
                                            // background — it just added more colour to colour.
                                            cls += ' k-line--psychedelic k-line--psychedelic-active'
                                            const pColors = activeColors.length > 1 ? activeColors : [activeSingerColor]
                                            const pInk = nbTextOn(pColors)
                                            // The active word is the INVERSE of its line: on a
                                            // bright plate an ink patch with cream letters, on a
                                            // dark plate a cream patch with ink letters. Always
                                            // maximum contrast, and it reads as a word knocked
                                            // out of the print rather than as a glow.
                                            const pStamp = pInk === NB_CREAM ? PSY.CREAM : PSY.INK
                                            const pStampInk = pInk === NB_CREAM ? PSY.INK : PSY.CREAM
                                            inlineStyle['--psy-stamp'] = pStamp
                                            inlineStyle['--psy-stamp-ink'] = pStampInk
                                            inlineStyle['--highlight-color'] = activeHighlight
                                            // ONE assignment, to the `background` shorthand, and
                                            // nothing else. The generic code above already put a
                                            // `background` key on this object, and React writes
                                            // inline styles in KEY-INSERTION order — so adding a
                                            // `backgroundColor: transparent` reset here (which the
                                            // first version did, copying the urban branch) appends
                                            // a NEW key *after* `background` and wipes the fill
                                            // right back out. The plate rendered with no colour at
                                            // all. Reassigning the existing shorthand keeps its
                                            // original position and resets colour and image
                                            // together, which is exactly what's wanted.
                                            inlineStyle.background = pColors.length > 1
                                                ? nbSplitBackground(pColors)
                                                : pColors[0]
                                            inlineStyle.color = pInk
                                            inlineStyle.textShadow = 'none'
                                            // Asymmetric vertically, and measured rather than
                                            // guessed: the line box leaves 0.161em between the
                                            // content-box top and the chip but only 0.100em below
                                            // it, so the extra 0.06em on the bottom is what centres
                                            // the chip inside the plate rather than just inside its
                                            // own line box.
                                            inlineStyle.padding = '0.2em 0.85em 0.26em'
                                            inlineStyle.borderRadius = psyPoured(i, 22, 11)
                                            inlineStyle.border = `${PSY.LINE}px solid ${PSY.INK}`
                                            // Stable per-line tilt, alternating sign: a poster
                                            // pasted up by hand, not laid out on a grid. Small,
                                            // because big rotations wreck the reading rhythm of a
                                            // stack of lines. box-shadow is deliberately NOT set
                                            // here — the class owns the cream sticker ring, and an
                                            // inline shadow would replace it.
                                            inlineStyle['--psy-rot'] = `${i % 2 === 0 ? -0.7 : 0.7}deg`
                                            // The plate takes a faint layer of the projector's own
                                            // footage over its colour, injected as the line's first
                                            // child so it paints under the words. This replaced two
                                            // hard dye discs crossing the plate: those matched the
                                            // mobile app's cards, but on a stage that is already
                                            // standing in front of the projector, borrowing the
                                            // real footage ties the plate to the room in a way
                                            // invented accent colours never did.
                                            psyFilm = true
                                        } else if (theme.name === 'zen') {
                                            // An unrolled strip of washi: warm paper, deep sumi ink, and the
                                            // singer's color as a vertical ink band on the left edge — shared
                                            // lines get one hard-split band per singer (stacked sumi bands,
                                            // not a blend). The singer color also breathes as candlelight in
                                            // the card's halo via --zen-glow; box-shadow stays OUT of the
                                            // inline style so the zen-card-breath animation wins. The unroll
                                            // entrance (clip-path sweep) lives on .k-line--zen-active.
                                            cls += ' k-line--zen k-line--zen-active'
                                            const zColors = activeColors.length > 1 ? activeColors : [activeSingerColor]
                                            const zStripe = zColors.length > 1
                                                ? `linear-gradient(180deg, ${zColors.map((c: string, k: number) => `${c} ${(k / zColors.length) * 100}% ${((k + 1) / zColors.length) * 100}%`).join(', ')})`
                                                : `linear-gradient(180deg, ${zColors[0]}, ${zColors[0]})`
                                            const zHasSyls = !!(line.syllables && line.syllables.length > 0)
                                            if (!zHasSyls) {
                                                // Gold ink vein tracing the line's real duration along the
                                                // card's bottom edge (LRC-only songs — syllable songs pace
                                                // word by word instead).
                                                const zNextStart = groupedLyrics[i + 1]?.[0]?.startTimeMs
                                                const zLineDur = typeof zNextStart === 'number' ? zNextStart - group[0].startTimeMs : 0
                                                if (zLineDur > 1200) {
                                                    cls += ' k-line--zen-timed'
                                                    inlineStyle['--nb-line-dur'] = `${zLineDur}ms`
                                                }
                                            }
                                            inlineStyle.background = undefined
                                            inlineStyle.backgroundColor = '#F2E8D5'
                                            inlineStyle.backgroundImage = `${zStripe}, linear-gradient(168deg, rgba(255,252,244,0.95) 0%, rgba(240,230,211,0.6) 55%, rgba(228,215,190,0.95) 100%)`
                                            inlineStyle.backgroundSize = '0.16em 100%, 100% 100%'
                                            inlineStyle.backgroundRepeat = 'no-repeat'
                                            inlineStyle.color = ZEN_INK
                                            inlineStyle.padding = '0.2em 0.9em 0.24em 1.05em'
                                            inlineStyle.borderRadius = '0.14em'
                                            inlineStyle.textShadow = 'none'
                                            inlineStyle['--zen-glow'] = `color-mix(in srgb, ${zColors[0]}, transparent 62%)`
                                        } else if (theme.name === 'space') {
                                            // The active line is a READOUT PLATE: a chamfered black-glass
                                            // panel with an ice hairline and a system bar down its left
                                            // edge in the singer's colour — the same grammar as every
                                            // other surface in the theme, so the stage and the phone are
                                            // recognisably one product.
                                            //
                                            // The chamfer is a clip-path, which means no CSS border can
                                            // survive on the diagonals; the plate is drawn instead from
                                            // stacked background layers (hairline, fill, system bar) in
                                            // karaoke.css. Everything time-based — the per-syllable sweep
                                            // and the line's duration vein — is CSS driven off
                                            // --syl-dur / --nb-line-dur so it stays frame-accurate
                                            // without React re-rendering mid-line.
                                            cls += ' k-line--space k-line--space-active'
                                            const spColors = activeColors.length > 1 ? activeColors : [activeSingerColor]
                                            // Shared lines get one hard-split band per singer, butted like
                                            // machined enamel rather than blended into a gradient mush.
                                            const spBand = spColors.length > 1
                                                ? spColors
                                                      .map((c: string, k: number) =>
                                                          `${c} ${(k / spColors.length) * 100}% ${((k + 1) / spColors.length) * 100}%`,
                                                      )
                                                      .join(', ')
                                                : `${spColors[0]}, ${spColors[0]}`
                                            // @ts-ignore (CSS variables)
                                            inlineStyle['--space-bar'] = `linear-gradient(180deg, ${spBand})`
                                            // @ts-ignore (CSS variables)
                                            inlineStyle['--space-glow'] = spColors[0]
                                            const spHasSyls = !!(line.syllables && line.syllables.length > 0)
                                            if (!spHasSyls) {
                                                // No syllable timings, so the WHOLE LINE ignites as one
                                                // unit. Deliberately not a progress indicator creeping
                                                // along the plate — a highlight that slides through the
                                                // words is hard to sing to, because the thing you need to
                                                // read is only half-lit at any moment.
                                                cls += ' k-line--space-full'
                                            }
                                        } else if (theme.name === 'steampunk') {
                                            // Illuminated engine nameplate: the riveted brass frame stays
                                            // (plate classes in steampunk.ts), but the face is dark iron —
                                            // singer colors become LIGHT, not paint. An enamel indicator
                                            // band runs along the top edge (hard-split segments per singer
                                            // on shared lines, butted like machine enamel), and the letters
                                            // are Edison filaments: each word ignites in the singer's color
                                            // mixed toward warm white so ANY color glows on iron. The plate
                                            // halo breathes in the singer's color via --stm-glow; box-shadow
                                            // stays OUT of the inline style so the CSS animation wins.
                                            cls += ' k-line--steampunk k-line--steampunk-active k-line--steampunk-plate'
                                            const sColors = activeColors.length > 1 ? activeColors : [activeSingerColor]
                                            const sBand = sColors.length > 1
                                                ? sColors.map((c: string, k: number) => `${c} ${(k / sColors.length) * 100}% ${((k + 1) / sColors.length) * 100}%`).join(', ')
                                                : `${sColors[0]}, ${sColors[0]}`
                                            const sHasSyls = !!(line.syllables && line.syllables.length > 0)
                                            if (!sHasSyls) {
                                                // Copper pressure tube tracing the line's real duration
                                                // along the plate's bottom edge (LRC-only songs).
                                                const sNextStart = groupedLyrics[i + 1]?.[0]?.startTimeMs
                                                const sLineDur = typeof sNextStart === 'number' ? sNextStart - group[0].startTimeMs : 0
                                                if (sLineDur > 1200) {
                                                    cls += ' k-line--steampunk-timed'
                                                    inlineStyle['--nb-line-dur'] = `${sLineDur}ms`
                                                }
                                            }
                                            inlineStyle.background = undefined
                                            inlineStyle.backgroundColor = '#221c14'
                                            inlineStyle.backgroundImage = `linear-gradient(90deg, ${sBand}), linear-gradient(180deg, rgba(255,235,190,0.07) 0%, rgba(0,0,0,0.28) 100%)`
                                            inlineStyle.backgroundSize = '100% 0.12em, 100% 100%'
                                            inlineStyle.backgroundRepeat = 'no-repeat'
                                            inlineStyle.backgroundPosition = 'left top, left top'
                                            inlineStyle.color = sColors.length > 1
                                                ? '#F2E6CC'
                                                : `color-mix(in srgb, ${sColors[0]}, #F5E9D0 45%)`
                                            inlineStyle.textShadow = `0 0 0.3em color-mix(in srgb, ${sColors[0]}, transparent 55%), 0 0.03em 0 rgba(0,0,0,0.55)`
                                            inlineStyle.padding = '0.24em 0.9em 0.22em'
                                            inlineStyle['--stm-glow'] = `color-mix(in srgb, ${sColors[0]}, transparent 55%)`
                                        } else if (theme.name === 'retrowave') {
                                            // Override the singer-color line bg with a deep synthwave
                                            // night gradient. Retrowave needs a dark void for the neon
                                            // chrome + halo on the active word to actually glow — on a
                                            // bright singer-color bg, the glow had nowhere to read.
                                            // Singer identity moves to: thin border ring, outer halo,
                                            // and the chrome letter gradient itself (all use --syl-singer).
                                            cls += ' k-line--retrowave k-line--retrowave-active'
                                            inlineStyle.background = 'linear-gradient(180deg, #15082e 0%, #2a1054 50%, #15082e 100%)'
                                            inlineStyle.color = 'rgba(245, 240, 255, 0.94)'
                                            inlineStyle.padding = '0.22em 1em'
                                            inlineStyle.borderRadius = '4px'
                                            inlineStyle.border = `1px solid ${activeSingerColor}`
                                            inlineStyle.boxShadow = `0 0 18px ${activeSingerColor}, 0 0 42px color-mix(in srgb, ${activeSingerColor}, transparent 50%), inset 0 0 0 1px rgba(255, 255, 255, 0.08)`
                                        } else if (theme.name === 'comic-book') {
                                            // Singer-colored speech-bubble panel on a matching speed-line
                                            // burst; the active word is the inked "impact word". Even-index
                                            // singers point their tail bottom-left, odd-index (the 2nd
                                            // singer in a duet) bottom-right, so a duet's speakers oppose.
                                            cls += ' k-line--comic-book-active'
                                            if (((line.singerIndex ?? 0) % 2) === 1) cls += ' k-line--comic-tail-right'
                                            inlineStyle.padding = '0.2em 0.85em'
                                            inlineStyle['--burst-color'] = activeSingerColor
                                            // Flat singer-colour fill + a faint Ben-Day halftone printed
                                            // over it (replaces the generic gradient `background` above so
                                            // the dot layer survives — a `background` shorthand would wipe
                                            // backgroundImage).
                                            inlineStyle.background = undefined
                                            inlineStyle.backgroundColor = activeSingerColor
                                            inlineStyle.backgroundImage = 'radial-gradient(rgba(22,22,29,0.16) 1.5px, transparent 1.8px)'
                                            inlineStyle.backgroundSize = '8px 8px'
                                        } else if (theme.name === 'tropical') {
                                            // A sun-warmed wooden tiki plank: the singer color washes the
                                            // plank as a warm sunset glow; the carved-wood frame + grain
                                            // and the gentle bob live in .k-line--tropical(-active).
                                            // A real carved-wood plank, evenly DYED to the singer's color
                                            // (timber + grain still read through the stain). Painted INLINE
                                            // so it overrides the default singer-color `background` set above
                                            // for the active line.
                                            // A plain carved-wood plank (no singer tint at all). Line-by-line
                                            // songs show the whole line in the singer's own color; syllable
                                            // songs override per-word via .k-syl--now/past/future. Painted
                                            // INLINE so it overrides the default singer-color `background`.
                                            cls += ' k-line--tropical k-line--tropical-active'
                                            inlineStyle.padding = '0.22em 1em'
                                            inlineStyle.borderRadius = '14px'
                                            inlineStyle.color = activeSingerColor
                                            inlineStyle.background = undefined
                                            inlineStyle.backgroundColor = '#6E4423'
                                            inlineStyle.backgroundImage =
                                                `linear-gradient(180deg, rgba(255,255,255,0.16), rgba(0,0,0,0.24)), ` +
                                                `repeating-linear-gradient(180deg, rgba(0,0,0,0.13) 0 2px, transparent 2px 13px)`
                                            inlineStyle.border = '3px solid #C99A54'
                                            inlineStyle.boxShadow = '0 10px 26px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)'
                                        } else {
                                            inlineStyle.padding = '0.18em 0.75em'
                                            inlineStyle.borderRadius = '8px'
                                            inlineStyle.boxShadow = `0 0 28px ${activeSingerColor}`
                                        }
                                    } else if (isPastGroup) {
                                        cls += ' k-line--past'
                                    } else {
                                        cls += ' k-line--future'
                                        if (activeColors.length > 1) {
                                            inlineStyle.backgroundImage = `linear-gradient(90deg, ${activeColors.join(', ')})`
                                            inlineStyle.WebkitBackgroundClip = 'text'
                                            inlineStyle.WebkitTextFillColor = 'transparent'
                                        } else if (line.singerIndex !== undefined && singers[line.singerIndex]) {
                                            inlineStyle.color = singers[line.singerIndex].color
                                        } else if (theme.name === 'tropical') {
                                            // Tropical: never leave an upcoming line on the default white —
                                            // always color it in its singer's hue (activeSingerColor falls
                                            // back to the lagoon accent when a line has no assigned singer).
                                            inlineStyle.color = activeSingerColor
                                        }
                                        if (theme.name === 'neo-brutal') {
                                            // Hard offset print shadow: separates singer-colored
                                            // type from the cream print backdrop AND from a color
                                            // music video — one treatment for both stage modes.
                                            inlineStyle.textShadow = `0.055em 0.055em 0 rgba(26, 26, 26, ${ytId ? 0.8 : 0.45})`
                                        } else if (theme.name === 'urban') {
                                            // Marker throw-up shadow: keeps singer-colored tags
                                            // legible over the crushed-black night backdrop.
                                            inlineStyle.textShadow = '0.05em 0.05em 0 rgba(0, 0, 0, 0.85)'
                                        } else if (theme.name === 'zen') {
                                            // Soft sumi shadow keeps singer-colored ink readable
                                            // over album art or a bright music video.
                                            inlineStyle.textShadow = '0 0.05em 0.4em rgba(8, 6, 4, 0.8)'
                                        } else if (theme.name === 'steampunk') {
                                            // Soot shadow: keeps singer-colored type legible over
                                            // the warm sepia backdrop or a bright music video.
                                            inlineStyle.textShadow = '0 0.05em 0.35em rgba(6, 4, 2, 0.85)'
                                        }
                                        inlineStyle.opacity = 1
                                    }

                                    // A line stays uncensored only when the singer has either the
                                    // host-controlled permanent pass or a gift consumed for THIS
                                    // now-playing turn. Name-only singers remain sanitized.
                                    const singerNeedsSanitation = (idx: number) => {
                                        const s = singers[idx]
                                        if (!s) return false
                                        if (s.oneTimeNwordPassGiftId) return false
                                        if (s.guestId) {
                                            const g = guestsMap.get(s.guestId)
                                            return g ? g.white_person_check !== false : true
                                        }
                                        return true
                                    }
                                    const needsSanitation = line.singerIndices?.some((idx: number) => singerNeedsSanitation(idx)) ||
                                        (line.singerIndex !== undefined && singerNeedsSanitation(line.singerIndex));

                                    const sanitize = (s: string) => s.replace(/nigg(?:a|er)s?/gi, (match: string) => {
                                        const isPlural = match.toLowerCase().endsWith('s');
                                        const isUpper = match[0] === match[0].toUpperCase();
                                        let replacement = isPlural ? 'fellas' : 'fella';
                                        if (isUpper) replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
                                        return replacement;
                                    });

                                    let displayWords = line.words;
                                    if (needsSanitation) displayWords = sanitize(displayWords);

                                    // Per-syllable render. Sanitation runs per-syllable so the word-level
                                    // highlight still fires for assigned singers (NetEase YRC keeps English
                                    // words intact within a single syllable, so the n-word regex doesn't
                                    // need to cross syllable boundaries).
                                    const syllables = line.syllables as Array<{ text: string; startMs: number; durMs: number }> | undefined
                                    let content: React.ReactNode = displayWords
                                    if (syllables && syllables.length > 0) {
                                        content = syllables.map((syl, k) => {
                                            let sylCls = 'k-syl'
                                            if (isActiveGroup) {
                                                if (k < activeSylIdx) sylCls += ' k-syl--past'
                                                else if (k === activeSylIdx) sylCls += ' k-syl--now'
                                                else sylCls += ' k-syl--future'
                                            } else if (isPastGroup) {
                                                sylCls += ' k-syl--past'
                                            } else {
                                                sylCls += ' k-syl--future'
                                            }
                                            // YRC syllables include their trailing space (e.g. "wife ") so any
                                            // background-based highlight would extend over the gap to the next word.
                                            // Split the word from the trailing whitespace so themes can style the
                                            // inner .k-syl__word (the visible glyphs) without coloring the space.
                                            const sylText = needsSanitation ? sanitize(syl.text) : syl.text
                                            const trailMatch = sylText.match(/\s+$/)
                                            const trail = trailMatch ? trailMatch[0] : ''
                                            const word = trail ? sylText.slice(0, -trail.length) : sylText
                                            // Expose the syllable's REAL duration to CSS. Themes can
                                            // then run a continuous sweep across the syllable for the
                                            // exact time it is sung, instead of the discrete
                                            // past/now/future class flip being the only signal — which
                                            // is what makes a highlight look stepped. Additive: a theme
                                            // that ignores --syl-dur is unaffected.
                                            return (
                                                <span
                                                    key={k}
                                                    className={sylCls}
                                                    style={{ ['--syl-dur' as string]: `${Math.max(80, syl.durMs)}ms` } as React.CSSProperties}
                                                >
                                                    <span className="k-syl__word">{word}</span>{trail}
                                                </span>
                                            )
                                        })
                                    }

                                    return (
                                        <div key={j} className={cls} style={inlineStyle}>
                                            {/* FIRST child, so it paints under the line's inline
                                                content (see .psy-film). Keyed so React reuses the
                                                same <video> as long as the same line stays active,
                                                rather than tearing down a decoder mid-line. */}
                                            {psyFilm && (
                                                <span key="psy-film" className="psy-film" aria-hidden="true">
                                                    <LiquidLight filter="saturate(1.35) contrast(1.05)" />
                                                </span>
                                            )}
                                            {content}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                    </>
                )}
            </div>

            {/* ── Themed stage furniture (playing mode) ─────────────────────── */}
            {/* Instrumental-break pill: appears only when syllable timing proves
                the line is finished and the next one is far away. */}
            {nbBreak && state.stageMode === 'playing' &&
                elapsed > nbBreak.start + 1000 && elapsed < nbBreak.end - 800 && (
                <div style={{ position: 'absolute', bottom: 64, left: 0, right: 0, zIndex: 22, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                {theme.name === 'cyberpunk' ? (
                    <div style={{ animation: 'cyber-glitch 0.35s steps(2) both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px', background: '#0b0b1c', clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)', boxShadow: '0 0 20px rgba(0,255,136,0.22), inset 0 0 0 1.5px rgba(0,255,136,0.5)' }}>
                            <NbEq color="#00ff88" fontSize={18} />
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 14, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#00ff88', textShadow: '0 0 8px rgba(0,255,136,0.6)' }}>Buffering</span>
                            <div style={{ width: 130, height: 6, background: 'rgba(0,255,136,0.14)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`, background: '#00ff88', boxShadow: '0 0 10px rgba(0,255,136,0.8)', transition: 'width 0.3s linear' }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'sketch' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both', transform: 'rotate(-1.5deg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 24px', background: '#ffffff', border: '2.5px solid #2d2d2d', borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px', boxShadow: '4px 4px 0 rgba(45,45,45,0.9)' }}>
                            <NbNote size={20} color="#ff4d4d" />
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#2d2d2d' }}>Doodle Break</span>
                            <div style={{ width: 120, height: 8, border: '2px solid #2d2d2d', borderRadius: 999, background: '#fff', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`, background: '#ff4d4d', transition: 'width 0.3s linear' }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'deep-sea' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px', borderRadius: 999, background: 'rgba(4,9,24,0.82)', backdropFilter: 'blur(10px)', boxShadow: '0 0 22px rgba(0,255,200,0.25), inset 0 0 0 1.5px rgba(0,255,200,0.4)' }}>
                            <NbNote size={20} color="#00ffc8" />
                            <span style={{ fontFamily: theme.fontBody, fontWeight: 700, fontSize: 14, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#e0fff8' }}>Drifting</span>
                            <div style={{ width: 130, height: 5, borderRadius: 999, background: 'rgba(0,255,200,0.14)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`, background: 'linear-gradient(90deg,#00ffc8,#b44dff)', boxShadow: '0 0 8px rgba(0,255,200,0.7)', transition: 'width 0.3s linear' }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'psychedelic' ? (
                    <div style={{ animation: 'psy-stamp-in 0.4s cubic-bezier(0.2,0.9,0.3,1) both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 24px', ...psyPlate(PSY.DYES[1], 1, 18) }}>
                            <NbNote size={20} color={PSY.INK} />
                            <span style={{ fontFamily: PSY.FONT_BODY, fontWeight: 800, fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase', color: PSY.INK }}>Groove Break</span>
                            <div style={{ width: 124, height: 8, borderRadius: 999, background: PSY.INK, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`, background: PSY.CREAM, transition: 'width 0.3s linear' }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'space' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px', borderRadius: 10, background: 'rgba(10,15,23,0.92)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(91,233,255,0.3)' }}>
                            <NbEq color="#5BE9FF" fontSize={18} />
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, letterSpacing: '0.44em', marginRight: '-0.44em', textTransform: 'uppercase', color: '#E8E6F0' }}>In Orbit</span>
                            <div style={{ width: 130, height: 6, borderRadius: 999, background: 'rgba(91,233,255,0.14)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`, background: 'linear-gradient(90deg,#5BE9FF,#BFF4FF)', boxShadow: '0 0 8px rgba(91,233,255,0.55)', transition: 'width 0.3s linear' }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'retrowave' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px', borderRadius: 4, background: 'linear-gradient(180deg,#15082e,#2a1054)', boxShadow: '0 0 22px rgba(255,45,149,0.28), inset 0 0 0 1.5px rgba(255,45,149,0.5)' }}>
                            <NbEq color="#00BFFF" fontSize={18} />
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: 14, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#F0E6FF', textShadow: '0 0 8px rgba(255,45,149,0.5)' }}>Interlude</span>
                            <div style={{ width: 130, height: 7, borderRadius: 2, background: 'rgba(255,45,149,0.14)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`, background: 'linear-gradient(90deg,#FFD700,#FF6B2B,#FF2D95)', boxShadow: '0 0 8px rgba(255,45,149,0.7)', transition: 'width 0.3s linear' }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'comic-book' ? (
                    <div style={{ animation: 'comic-pop 0.35s var(--ease-bounce) both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 24px', background: '#FFD400', backgroundImage: COMIC_DOTS, backgroundSize: '7px 7px', border: '3px solid #16161D', borderRadius: 6, boxShadow: '5px 5px 0 #16161D' }}>
                            <NbNote size={20} color="#FF1F4B" />
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: 17, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#16161D' }}>Meanwhile…</span>
                            <div style={{ width: 120, height: 9, border: '2.5px solid #16161D', borderRadius: 999, background: '#FFF', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`, background: '#FF1F4B', transition: 'width 0.3s linear' }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'tropical' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '10px 24px', borderRadius: 14, background: 'linear-gradient(165deg,#8A5A2F,#6E4423)', border: '4px solid #CDA85A', boxShadow: '0 12px 26px rgba(14,46,41,0.35)', overflow: 'hidden' }}>
                            <NbNote size={20} color="#FFC83D" />
                            <span style={{ fontFamily: theme.fontBody, fontWeight: 400, fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FFE7A8' }}>Beach Break</span>
                            <div style={{ width: 120, height: 8, borderRadius: 999, background: 'rgba(0,0,0,0.25)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999, width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`, background: 'linear-gradient(90deg,#FFC83D,#FF6B3D)', transition: 'width 0.3s linear' }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'steampunk' ? (
                    <div style={{ animation: 'steam-rise 0.45s ease-out both' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px', borderRadius: 999,
                            background: 'rgba(23,19,14,0.88)', backdropFilter: 'blur(12px)',
                            border: '1px solid #0c0a07',
                            boxShadow: `inset 0 0 0 1.5px rgba(200,151,62,0.5), 0 12px 30px rgba(0,0,0,0.55)`,
                        }}>
                            <SteamGear size={24} teeth={8} dur={7} opacity={0.9} style={{ display: 'block' }} />
                            <span style={{ fontFamily: STM_HEADING, fontWeight: 700, fontSize: 14, letterSpacing: '0.34em', marginRight: '-0.34em', textTransform: 'uppercase', color: STM_PARCH, textShadow: '0 0 10px rgba(200,151,62,0.3)' }}>
                                Intermission
                            </span>
                            <div style={{ width: 130, height: 6, borderRadius: 999, background: '#0d0a07', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 rgba(200,151,62,0.2)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{
                                    position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999,
                                    width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`,
                                    background: `linear-gradient(90deg, ${STM_BRASS}, ${STM_COPPER})`,
                                    boxShadow: '0 0 8px rgba(224,112,64,0.6)', transition: 'width 0.3s linear',
                                }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'zen' ? (
                    <div style={{ animation: 'zen-scroll-in 0.45s ease-out both' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 16, padding: '10px 24px', borderRadius: 999,
                            background: 'rgba(20,17,12,0.82)', backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(201,168,76,0.3)', boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                        }}>
                            <ZenEnso size={22} color={ZEN_GOLD} strokeWidth={9} progress={(elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)} />
                            <span style={{ fontFamily: ZEN_SANS, fontWeight: 500, fontSize: 14, letterSpacing: '0.42em', marginRight: '-0.42em', textTransform: 'uppercase', color: ZEN_WASHI }}>
                                Interlude
                            </span>
                            <div style={{ width: 130, height: 3, borderRadius: 999, background: 'rgba(240,230,211,0.16)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{
                                    position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999,
                                    width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`,
                                    background: ZEN_GOLD, boxShadow: '0 0 8px rgba(201,168,76,0.7)', transition: 'width 0.3s linear',
                                }} />
                            </div>
                        </div>
                    </div>
                ) : theme.name === 'urban' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            background: 'rgba(8, 8, 8, 0.85)', backdropFilter: 'blur(10px)',
                            clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
                            boxShadow: '0 14px 32px rgba(0, 0, 0, 0.75)', padding: '10px 26px',
                        }}>
                            <NbEq color={URB_GREEN} fontSize={20} />
                            <span style={{ fontFamily: URB_STENCIL, fontWeight: 700, fontSize: 15, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#FFFFFF' }}>
                                Beat Break
                            </span>
                            <div style={{ width: 130, height: 8, background: 'rgba(255, 255, 255, 0.14)', position: 'relative', overflow: 'hidden', clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }}>
                                <div style={{
                                    position: 'absolute', top: 0, bottom: 0, left: 0,
                                    width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`,
                                    background: URB_GREEN, boxShadow: `0 0 10px ${URB_GREEN}99`, transition: 'width 0.3s linear',
                                }} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ animation: 'nb-pop-in 0.35s var(--ease-bounce) both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: NB_INK, boxShadow: '5px 5px 0 rgba(26, 26, 26, 0.35)', padding: '10px 22px' }}>
                            <NbEq color="#FFD60A" fontSize={20} />
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15, letterSpacing: '0.26em', color: NB_CREAM }}>
                                INSTRUMENTAL
                            </span>
                            <div style={{ width: 130, height: 9, border: `2px solid ${NB_CREAM}`, position: 'relative', overflow: 'hidden' }}>
                                <div style={{
                                    position: 'absolute', top: 0, bottom: 0, left: 0,
                                    width: `${Math.min(100, Math.max(0, ((elapsed - nbBreak.start) / (nbBreak.end - nbBreak.start)) * 100))}%`,
                                    background: '#FFD60A', transition: 'width 0.3s linear',
                                }} />
                            </div>
                        </div>
                    </div>
                )}
                </div>
            )}

            {/* PAUSED stamp */}
            {hasStageFurniture && state.stageMode === 'playing' && !state.isPlaying && (
                <div style={{ position: 'absolute', top: '13%', left: 0, right: 0, zIndex: 25, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                {theme.name === 'cyberpunk' ? (
                    <div style={{ animation: 'cyber-glitch 0.4s steps(2) both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 30px', background: '#0b0b1c', clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)', boxShadow: '0 0 26px rgba(0,255,136,0.28), inset 0 0 0 1.5px rgba(0,255,136,0.55)' }}>
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(15), letterSpacing: '0.3em', color: '#ff00aa', textShadow: '0 0 10px rgba(255,0,170,0.6)' }}>||</span>
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(26), letterSpacing: '0.34em', textTransform: 'uppercase', color: '#00ff88', textShadow: '0 0 14px rgba(0,255,136,0.7)' }}>Suspended</span>
                        </div>
                    </div>
                ) : theme.name === 'sketch' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both', transform: 'rotate(-2deg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 30px', background: '#fff9c4', border: '2.5px solid #2d2d2d', borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px', boxShadow: '4px 4px 0 rgba(45,45,45,0.9)' }}>
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(28), letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2d2d2d' }}>Paused</span>
                        </div>
                    </div>
                ) : theme.name === 'deep-sea' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 30px', borderRadius: 999, background: 'rgba(4,9,24,0.85)', backdropFilter: 'blur(10px)', boxShadow: '0 0 28px rgba(0,255,200,0.28), inset 0 0 0 1.5px rgba(0,255,200,0.45)' }}>
                            <NbNote size={26} color="#00ffc8" />
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(26), letterSpacing: '0.16em', textTransform: 'uppercase', color: '#e0fff8', textShadow: '0 0 14px rgba(0,255,200,0.6)' }}>Paused</span>
                        </div>
                    </div>
                ) : theme.name === 'psychedelic' ? (
                    <div style={{ animation: 'psy-stamp-in 0.4s cubic-bezier(0.2,0.9,0.3,1) both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 34px', ...psyPlate(PSY.CREAM, 0, 20) }}>
                            <span style={{ fontFamily: PSY.FONT_DISPLAY, fontWeight: 400, fontSize: stageFont(30), color: PSY.INK, letterSpacing: '0.02em' }}>Paused</span>
                        </div>
                    </div>
                ) : theme.name === 'space' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 30px', borderRadius: 10, background: 'rgba(10,15,23,0.94)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.62), inset 0 0 0 1px rgba(91,233,255,0.34)' }}>
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: stageFont(26), letterSpacing: '0.3em', marginRight: '-0.3em', textTransform: 'uppercase', color: '#E8E6F0', textShadow: '0 0 16px rgba(91,233,255,0.6), 0 0 40px rgba(91,233,255,0.26)' }}>Paused</span>
                        </div>
                    </div>
                ) : theme.name === 'retrowave' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 30px', borderRadius: 4, background: 'linear-gradient(180deg,#15082e,#2a1054)', boxShadow: '0 0 26px rgba(255,45,149,0.3), inset 0 0 0 1.5px rgba(255,45,149,0.55)' }}>
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(26), letterSpacing: '0.14em', textTransform: 'uppercase', background: 'linear-gradient(180deg,#FFD700,#FF6B2B 50%,#FF2D95)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 0 14px rgba(255,45,149,0.6))' } as React.CSSProperties}>Paused</span>
                        </div>
                    </div>
                ) : theme.name === 'comic-book' ? (
                    <div style={{ animation: 'comic-pop 0.4s var(--ease-bounce) both' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 40px', background: '#FFD400', clipPath: COMIC_BURST_CLIP, transform: 'rotate(-3deg)' }}>
                            <span style={{ fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(30), letterSpacing: '0.02em', textTransform: 'uppercase', color: '#FF1F4B', WebkitTextStroke: '2.5px #16161D', textShadow: '3px 3px 0 #16161D' } as React.CSSProperties}>Hold It!</span>
                        </div>
                    </div>
                ) : theme.name === 'tropical' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 30px', borderRadius: 14, background: 'linear-gradient(165deg,#8A5A2F,#6E4423)', border: '5px solid #CDA85A', boxShadow: '0 14px 30px rgba(14,46,41,0.4)', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 17px)', pointerEvents: 'none' }} />
                            <span style={{ position: 'relative', fontFamily: theme.fontDisplay, fontWeight: 400, fontSize: stageFont(30), letterSpacing: '0.04em', color: '#FFF1C4', textShadow: '0 2px 0 rgba(0,0,0,0.35), 0 0 20px rgba(255,200,61,0.5)' }}>Paused</span>
                        </div>
                    </div>
                ) : theme.name === 'steampunk' ? (
                    <div style={{ animation: 'steam-stamp 0.45s ease-out both' }}>
                        <div style={{
                            position: 'relative', display: 'flex', alignItems: 'center', gap: 18, padding: '12px 28px',
                            background: STM_PLATE_BG, borderRadius: 6, border: '2px solid #0c0a07',
                            boxShadow: `inset 0 0 0 2px ${STM_BRASS}, inset 0 0 18px rgba(0,0,0,0.5), 0 14px 34px rgba(0,0,0,0.6)`,
                        }}>
                            <SteamRivets />
                            {/* needle dropped to zero — pressure released */}
                            <SteamGauge size={46} progress={0} />
                            <span style={{ fontFamily: STM_HEADING, fontWeight: 700, fontSize: stageFont(25), letterSpacing: '0.34em', marginRight: '-0.34em', color: STM_PARCH, textShadow: '0 0 12px rgba(200,151,62,0.3), 0 2px 0 rgba(0,0,0,0.5)' }}>
                                PAUSED
                            </span>
                        </div>
                    </div>
                ) : theme.name === 'zen' ? (
                    <div style={{ animation: 'zen-stamp 0.45s ease-out both' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 16, padding: '12px 28px', borderRadius: 12,
                            background: 'rgba(20,17,12,0.85)', backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(201,168,76,0.35)', boxShadow: '0 14px 34px rgba(0,0,0,0.55)',
                        }}>
                            {/* vermillion hanko: 休 — "rest" */}
                            <div style={{
                                width: 44, height: 44, borderRadius: 9, background: ZEN_VERM,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 18px rgba(212,68,42,0.5), inset 0 0 0 2px rgba(247,238,220,0.35)',
                            }}>
                                <span style={{ fontFamily: ZEN_SANS, fontWeight: 700, fontSize: 24, color: '#F7EEDC', lineHeight: 1 }}>休</span>
                            </div>
                            <span style={{ fontFamily: ZEN_SERIF, fontWeight: 600, fontSize: stageFont(26), letterSpacing: '0.42em', marginRight: '-0.42em', color: ZEN_WASHI }}>
                                PAUSED
                            </span>
                        </div>
                    </div>
                ) : theme.name === 'urban' ? (
                    <div style={{ animation: 'urban-spray-in 0.35s ease-out both' }}>
                        <UrbanSprayPlate color={URB_GREEN} filterId="urban-rough-filter" rotate={-3} drips style={{ padding: '4px 18px 8px' }}>
                            <span style={{ fontFamily: URB_STENCIL, fontWeight: 700, fontSize: stageFont(26), letterSpacing: '0.4em', textTransform: 'uppercase', padding: '0 6px' }}>
                                Hold Up
                            </span>
                        </UrbanSprayPlate>
                    </div>
                ) : (
                    <div style={{
                        ['--nb-rot' as string]: '-3.5deg',
                        animation: 'nb-slam 0.35s var(--ease-bounce) both',
                        background: '#FFD60A', color: NB_INK, border: `4px solid ${NB_INK}`, boxShadow: `8px 8px 0 ${NB_INK}`,
                        padding: '10px 30px', fontFamily: theme.fontDisplay, fontWeight: 700,
                        fontSize: stageFont(28), letterSpacing: '0.3em',
                    }}>
                        PAUSED
                    </div>
                )}
                </div>
            )}

        </div>
        {qrOverlay}
        <AwardsRevealAnimation step={state.awardsRevealStep} />
        </>
    )
}
