import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useApp, useGuestsMap, singerFxKey } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { AwardsRevealAnimation } from '../awards/AwardsRevealAnimation'
import { HiddenSongStagePanel, HiddenSongStageHeading } from '../components/HiddenSongCard'
import TomatoSplatterLayer, { TOMATO_EMOJI } from '../components/TomatoSplatterLayer'

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
function TropBeachBackdrop({ live = false }: { live?: boolean }) {
    const scene = (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2,
                pointerEvents: 'none',
                overflow: 'hidden',
                background: live
                    ? 'linear-gradient(180deg, rgba(20,46,41,0) 0%, rgba(20,46,41,0) 55%, rgba(14,46,41,0.55) 100%)'
                    : 'linear-gradient(180deg, #38B6E8 0%, #5ECBE8 28%, #2FC4C0 50%, #7FE0D6 58%, #F4E2B8 70%, #FFF4DE 100%)',
            }}
        >
            {!live && (
                <>
                    <div style={{ position: 'absolute', top: '9%', right: '12%', width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, #FFE27A 0%, #FFC83D 58%, #FFB02E 100%)', animation: 'tropSun 6s ease-in-out infinite' }} />
                    <TropClouds />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '11%', opacity: 0.5, backgroundImage: 'repeating-linear-gradient(95deg, rgba(255,255,255,0.6) 0 3px, transparent 3px 24px)', animation: 'tropWave 6s linear infinite' }} />
                </>
            )}
            {/* palms anchored bottom corners — full color for Up Next, dark silhouettes when live */}
            <div style={{ position: 'absolute', inset: 0, opacity: live ? 0.4 : 1, filter: live ? 'brightness(0.35) saturate(0.7)' : 'none' }}>
                <TropPalm swayDur={7} style={{ left: -96, bottom: -40 }} scale={live ? 0.8 : 0.92} />
                <TropPalm flip swayDur={8.5} style={{ right: -96, bottom: -40 }} scale={live ? 0.8 : 0.92} />
            </div>
            {!live && (
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
    const woodGrain = 'repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 16px)'
    return (
        <div className="anim-enter" style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 48px', position: 'relative' }}>
            <TropBeachBackdrop />
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
            // Tomatoes are handled by TomatoSplatterLayer (thrown + splattered),
            // not rendered as a floating emoji bubble.
            if (reaction?.content === TOMATO_EMOJI) return
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

    return (
        <div className="k-reactions-overlay">
            {reactions.map(r => {
                const pos = r.side === 'left'
                    ? { left: r.x + '%' } as React.CSSProperties
                    : { right: r.x + '%' } as React.CSSProperties

                if (r.reactionType === 'text') {
                    const isRight = r.side === 'right'
                    return (
                        <div key={r.id}
                            className={'reaction-bubble reaction-bubble--text reaction-bubble--persistent' + (isRight ? ' reaction-bubble--right' : '')}
                            style={pos}
                        >
                            {isRight ? (
                                <>
                                    <div className="reaction-bubble__text-wrap reaction-bubble__text-wrap--right">
                                        <div className="reaction-bubble__text">{r.content}</div>
                                        <span className="reaction-bubble__text-name">{r.senderName}</span>
                                    </div>
                                    {renderAvatar(r)}
                                </>
                            ) : (
                                <>
                                    {renderAvatar(r)}
                                    <div className="reaction-bubble__text-wrap">
                                        <div className="reaction-bubble__text">{r.content}</div>
                                        <span className="reaction-bubble__text-name">{r.senderName}</span>
                                    </div>
                                </>
                            )}
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

    // Scroll active lyric into view
    useEffect(() => {
        if (lineIdx < 0 || !lyricsRef.current) return
        const container = lyricsRef.current
        const lines = container.querySelectorAll('.k-line')
        const target = lines[lineIdx] as HTMLElement | undefined
        if (target) {
            const scrollTo = target.offsetTop - container.clientHeight / 2 + target.offsetHeight / 2
            container.scrollTo({ top: scrollTo, behavior: 'smooth' })
        }
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

    // Empty state — themed waiting screen with QR code
    if (!track) {
        const qrUrl = state.karaokeQrDataUrl
        const sessionCode = state.karaokeSessionCode

        // ---- Neo-Brutal idle ----
        if (theme.name === 'neo-brutal') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: '#FFF8EE', position: 'relative', overflow: 'hidden',
                }}>
                    {/* Decorative offset blocks */}
                    <div style={{ position: 'absolute', top: 60, left: 80, width: 120, height: 120, background: '#FFD60A', border: '3px solid #1A1A1A', boxShadow: '6px 6px 0 #1A1A1A', borderRadius: 0, transform: 'rotate(-8deg)' }} />
                    <div style={{ position: 'absolute', bottom: 80, right: 100, width: 90, height: 90, background: '#B388FF', border: '3px solid #1A1A1A', boxShadow: '6px 6px 0 #1A1A1A', borderRadius: 0, transform: 'rotate(12deg)' }} />
                    <div style={{ position: 'absolute', top: 140, right: 200, width: 60, height: 60, background: '#00E676', border: '3px solid #1A1A1A', boxShadow: '4px 4px 0 #1A1A1A', borderRadius: 0, transform: 'rotate(-3deg)' }} />
                    <div style={{ position: 'absolute', bottom: 160, left: 180, width: 70, height: 70, background: '#FF3B30', border: '3px solid #1A1A1A', boxShadow: '5px 5px 0 #1A1A1A', borderRadius: 0, transform: 'rotate(6deg)' }} />

                    <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <h1 style={{
                            fontFamily: 'Space Grotesk, sans-serif', fontSize: stageFont(72), fontWeight: 800, color: '#1A1A1A',
                            lineHeight: 1.1, marginBottom: 16,
                            textShadow: 'none',
                        }}>
                            Add a Song!
                        </h1>
                        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: stageFont(20), color: '#1A1A1A', opacity: 0.6, marginBottom: 48 }}>
                            Scan to join the queue
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 20,
                                background: 'white', border: '4px solid #1A1A1A', boxShadow: '8px 8px 0 #1A1A1A',
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 220, height: 220, display: 'block' }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: 'Space Grotesk, sans-serif', fontSize: stageFont(28), fontWeight: 800, color: '#1A1A1A',
                                letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 24,
                            }}>
                                {sessionCode}
                            </p>
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

        // ---- Psychedelic idle ----
        if (theme.name === 'psychedelic') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: 'radial-gradient(ellipse at 50% 50%, #2a1248 0%, #1a0a2e 50%, #0f0620 100%)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Lava lamp blobs */}
                    <div style={{
                        position: 'absolute', inset: '-20%', opacity: 0.5,
                        background: 'radial-gradient(ellipse 300px 300px at 25% 35%, rgba(255,45,149,0.2) 0%, transparent 70%), radial-gradient(ellipse 250px 350px at 70% 55%, rgba(182,255,45,0.15) 0%, transparent 70%), radial-gradient(ellipse 350px 250px at 50% 75%, rgba(255,140,45,0.15) 0%, transparent 70%)',
                        filter: 'blur(60px)',
                        animation: 'psyBlobMorph 20s ease-in-out infinite alternate',
                    }} />
                    {/* Second blob layer */}
                    <div style={{
                        position: 'absolute', inset: '-10%', opacity: 0.4,
                        background: 'radial-gradient(ellipse 280px 280px at 60% 25%, rgba(45,217,255,0.15) 0%, transparent 70%), radial-gradient(ellipse 320px 200px at 35% 70%, rgba(255,45,255,0.12) 0%, transparent 70%)',
                        filter: 'blur(50px)',
                        animation: 'psyBlobMorph2 28s ease-in-out infinite alternate',
                    }} />

                    {/* Spinning mandala ring — top left */}
                    <svg style={{ position: 'absolute', top: 60, left: 80, width: 140, height: 140, opacity: 0.12, animation: 'psyHueShift 12s linear infinite' }} viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,45,149,0.6)" strokeWidth="1" strokeDasharray="8 6" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 30s linear infinite' }} />
                        <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(182,255,45,0.5)" strokeWidth="1" strokeDasharray="5 8" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 22s linear infinite reverse' }} />
                        <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,140,45,0.5)" strokeWidth="1" strokeDasharray="4 5" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 18s linear infinite' }} />
                        <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(45,217,255,0.5)" strokeWidth="1.5" />
                    </svg>

                    {/* Peace sign — bottom right */}
                    <svg style={{ position: 'absolute', bottom: 80, right: 100, width: 100, height: 100, opacity: 0.12, animation: 'psyWobble 8s ease-in-out infinite' }} viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(182,255,45,0.6)" strokeWidth="2" />
                        <line x1="30" y1="4" x2="30" y2="56" stroke="rgba(182,255,45,0.6)" strokeWidth="2" />
                        <line x1="30" y1="30" x2="12" y2="50" stroke="rgba(182,255,45,0.6)" strokeWidth="2" strokeLinecap="round" />
                        <line x1="30" y1="30" x2="48" y2="50" stroke="rgba(182,255,45,0.6)" strokeWidth="2" strokeLinecap="round" />
                    </svg>

                    {/* Smaller peace sign — top right */}
                    <svg style={{ position: 'absolute', top: 180, right: 200, width: 55, height: 55, opacity: 0.08, animation: 'psyWobble 6s ease-in-out infinite reverse' }} viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,45,149,0.6)" strokeWidth="2" />
                        <line x1="30" y1="4" x2="30" y2="56" stroke="rgba(255,45,149,0.6)" strokeWidth="2" />
                        <line x1="30" y1="30" x2="12" y2="50" stroke="rgba(255,45,149,0.6)" strokeWidth="2" strokeLinecap="round" />
                        <line x1="30" y1="30" x2="48" y2="50" stroke="rgba(255,45,149,0.6)" strokeWidth="2" strokeLinecap="round" />
                    </svg>

                    {/* Spinning mandala ring — bottom left */}
                    <svg style={{ position: 'absolute', bottom: 120, left: 160, width: 90, height: 90, opacity: 0.1, animation: 'psyHueShift 16s linear infinite' }} viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,140,45,0.5)" strokeWidth="1" strokeDasharray="6 4" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 20s linear infinite reverse' }} />
                        <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,45,255,0.4)" strokeWidth="1" strokeDasharray="3 6" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 15s linear infinite' }} />
                        <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(182,255,45,0.4)" strokeWidth="1.5" />
                    </svg>

                    {/* Decorative flower — center right */}
                    <svg style={{ position: 'absolute', top: '40%', right: 60, width: 70, height: 70, opacity: 0.1, animation: 'dsCausticDrift 24s linear infinite' }} viewBox="0 0 60 60">
                        {[0, 60, 120, 180, 240, 300].map(angle => (
                            <ellipse key={angle} cx="30" cy="14" rx="8" ry="14" fill="none" stroke="rgba(255,45,149,0.5)" strokeWidth="1" transform={`rotate(${angle} 30 30)`} />
                        ))}
                        <circle cx="30" cy="30" r="6" fill="rgba(255,140,45,0.15)" stroke="rgba(255,140,45,0.4)" strokeWidth="1" />
                    </svg>

                    <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <p style={{
                            fontFamily: 'Spicy Rice, cursive', fontSize: stageFont(16), color: '#ff2d95', opacity: 0.5,
                            letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8,
                        }}>
                            ~ far out ~
                        </p>
                        <h1 style={{
                            fontFamily: 'Chicle, cursive', fontSize: stageFont(72), color: '#f5ecff',
                            lineHeight: 1.1, marginBottom: 8,
                            textShadow: '0 0 30px rgba(255,45,149,0.5), 0 0 60px rgba(182,255,45,0.25), 0 0 100px rgba(255,140,45,0.15)',
                            animation: 'psyWobble 6s ease-in-out infinite',
                        }}>
                            Add a Song
                        </h1>
                        <p style={{
                            fontFamily: 'Spicy Rice, cursive', fontSize: stageFont(22), color: '#c8a8e8',
                            marginBottom: 44,
                        }}>
                            Scan to join the groove
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 16, position: 'relative',
                                border: '2px solid rgba(255,45,149,0.3)',
                                borderRadius: 20,
                                boxShadow: '0 0 25px rgba(255,45,149,0.18), 0 0 50px rgba(182,255,45,0.1), inset 0 0 30px rgba(255,45,149,0.04)',
                                background: 'rgba(26,10,46,0.65)',
                                backdropFilter: 'blur(12px)',
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 10 }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: 'Chicle, cursive', fontSize: stageFont(28), color: '#ff2d95',
                                letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 24,
                                textShadow: '0 0 15px rgba(255,45,149,0.5), 0 0 30px rgba(182,255,45,0.2)',
                            }}>
                                {sessionCode}
                            </p>
                        )}
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

        // ---- Space (Cosmic) idle ----
        if (theme.name === 'space') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: 'linear-gradient(180deg, #04040A 0%, #08080F 40%, #0A0A18 100%)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Nebula cloud overlay */}
                    <div style={{
                        position: 'absolute', inset: '-20%', opacity: 0.05,
                        background: 'radial-gradient(ellipse 55% 45% at 20% 35%, rgba(224,64,251,0.6) 0%, transparent 70%), radial-gradient(ellipse 45% 55% at 75% 55%, rgba(64,224,208,0.5) 0%, transparent 70%)',
                        filter: 'blur(50px)', animation: 'spaceNebulaDrift 35s ease-in-out infinite',
                    }} />

                    {/* Starfield — scattered dots */}
                    {[
                        { x: '5%', y: '8%', s: 2, o: 0.7 }, { x: '12%', y: '22%', s: 1.5, o: 0.4 },
                        { x: '20%', y: '5%', s: 1, o: 0.6 }, { x: '28%', y: '35%', s: 2, o: 0.3 },
                        { x: '35%', y: '12%', s: 1.5, o: 0.5 }, { x: '42%', y: '28%', s: 1, o: 0.7 },
                        { x: '55%', y: '8%', s: 2, o: 0.4 }, { x: '62%', y: '18%', s: 1.5, o: 0.6 },
                        { x: '70%', y: '32%', s: 1, o: 0.5 }, { x: '78%', y: '6%', s: 2, o: 0.3 },
                        { x: '85%', y: '25%', s: 1.5, o: 0.7 }, { x: '92%', y: '15%', s: 1, o: 0.4 },
                        { x: '8%', y: '70%', s: 1.5, o: 0.5 }, { x: '18%', y: '85%', s: 2, o: 0.3 },
                        { x: '75%', y: '75%', s: 1, o: 0.6 }, { x: '88%', y: '65%', s: 1.5, o: 0.4 },
                        { x: '50%', y: '90%', s: 2, o: 0.35 }, { x: '30%', y: '60%', s: 1, o: 0.5 },
                    ].map((star, i) => (
                        <div key={`star-${i}`} style={{
                            position: 'absolute', left: star.x, top: star.y,
                            width: star.s, height: star.s, borderRadius: '50%',
                            background: i % 5 === 0 ? 'rgba(224,64,251,0.8)' : i % 7 === 0 ? 'rgba(64,224,208,0.7)' : 'rgba(232,230,240,0.8)',
                            opacity: star.o,
                            animation: `spaceTwinkle${i % 2 === 0 ? '' : '2'} ${3 + (i % 4)}s ease-in-out ${(i * 0.7) % 4}s infinite`,
                        }} />
                    ))}

                    {/* Warp star trails — radial lines from center */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} viewBox="0 0 1200 800">
                        {Array.from({ length: 16 }).map((_, i) => {
                            const angle = (i / 16) * Math.PI * 2
                            const cx = 600, cy = 400
                            const innerR = 80, outerR = 600
                            const x1 = cx + Math.cos(angle) * innerR
                            const y1 = cy + Math.sin(angle) * innerR
                            const x2 = cx + Math.cos(angle) * outerR
                            const y2 = cy + Math.sin(angle) * outerR
                            return <line key={`warp-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(232,230,240,0.5)" strokeWidth={0.8 + (i % 3) * 0.4} />
                        })}
                    </svg>

                    {/* Planet (Saturn-like) silhouette — lower right */}
                    <svg style={{ position: 'absolute', bottom: '10%', right: '15%', width: 220, height: 180, opacity: 0.15 }} viewBox="0 0 220 180">
                        {/* Planet body */}
                        <circle cx="110" cy="95" r="55" fill="#0A0A18" stroke="rgba(224,64,251,0.3)" strokeWidth="1.5" />
                        {/* Edge glow */}
                        <circle cx="110" cy="95" r="55" fill="none" stroke="rgba(64,224,208,0.15)" strokeWidth="3" />
                        {/* Ring — elliptical arc */}
                        <ellipse cx="110" cy="95" rx="95" ry="20" fill="none" stroke="rgba(255,183,64,0.25)" strokeWidth="2" strokeDasharray="4 3" />
                        <ellipse cx="110" cy="95" rx="85" ry="16" fill="none" stroke="rgba(224,64,251,0.15)" strokeWidth="1" />
                    </svg>

                    {/* Orbiting particles around planet */}
                    {[0, 1, 2].map(i => (
                        <div key={`orbit-${i}`} style={{
                            position: 'absolute', bottom: `calc(10% + 85px)`, right: `calc(15% + 100px)`,
                            width: 4, height: 4, borderRadius: '50%',
                            background: i === 0 ? '#E040FB' : i === 1 ? '#40E0D0' : '#FFB740',
                            opacity: 0.6,
                            animation: `spaceOrbit ${4 + i * 1.5}s linear ${i * 1.2}s infinite`,
                        }} />
                    ))}

                    {/* Distant galaxy — top left */}
                    <svg style={{ position: 'absolute', top: '12%', left: '10%', width: 60, height: 60, opacity: 0.06 }} viewBox="0 0 60 60">
                        <ellipse cx="30" cy="30" rx="25" ry="8" fill="none" stroke="rgba(224,64,251,0.5)" strokeWidth="0.8" transform="rotate(-30 30 30)" />
                        <ellipse cx="30" cy="30" rx="18" ry="6" fill="none" stroke="rgba(64,224,208,0.4)" strokeWidth="0.6" transform="rotate(-30 30 30)" />
                        <circle cx="30" cy="30" r="3" fill="rgba(232,230,240,0.3)" />
                    </svg>

                    {/* Distant galaxy — bottom left */}
                    <svg style={{ position: 'absolute', bottom: '20%', left: '20%', width: 45, height: 45, opacity: 0.04 }} viewBox="0 0 60 60">
                        <ellipse cx="30" cy="30" rx="22" ry="7" fill="none" stroke="rgba(255,183,64,0.5)" strokeWidth="0.7" transform="rotate(20 30 30)" />
                        <ellipse cx="30" cy="30" rx="15" ry="5" fill="none" stroke="rgba(224,64,251,0.3)" strokeWidth="0.5" transform="rotate(20 30 30)" />
                        <circle cx="30" cy="30" r="2.5" fill="rgba(232,230,240,0.25)" />
                    </svg>

                    {/* Shooting star */}
                    <div style={{
                        position: 'absolute', top: '15%', left: '25%', width: 80, height: 1,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(232,230,240,0.6) 40%, rgba(64,224,208,0.4) 100%)',
                        transform: 'rotate(-25deg)',
                        animation: 'spaceShootingStar 12s linear infinite',
                        borderRadius: 1,
                    }} />
                    <div style={{
                        position: 'absolute', top: '40%', right: '20%', width: 60, height: 1,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(232,230,240,0.5) 40%, rgba(224,64,251,0.3) 100%)',
                        transform: 'rotate(-30deg)',
                        animation: 'spaceShootingStar 18s linear 6s infinite',
                        borderRadius: 1,
                    }} />

                    {/* Content */}
                    <div style={{ textAlign: 'center', zIndex: 2 }}>
                        <h1 style={{
                            fontFamily: "'Orbitron', sans-serif", fontSize: stageFont(64), color: '#E8E6F0',
                            fontWeight: 700, lineHeight: 1.1, marginBottom: 8,
                            textShadow: '0 0 30px rgba(224,64,251,0.35), 0 0 60px rgba(64,224,208,0.15), 0 0 100px rgba(224,64,251,0.1)',
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>
                            Launch a Song
                        </h1>
                        <p style={{
                            fontFamily: "'Exo 2', sans-serif", fontSize: stageFont(16), color: '#9896A8',
                            letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 48,
                        }}>
                            Scan to queue from orbit
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 14,
                                border: '1px solid rgba(64,224,208,0.3)',
                                boxShadow: '0 0 20px rgba(64,224,208,0.1), 0 0 40px rgba(224,64,251,0.05), inset 0 0 20px rgba(64,224,208,0.03)',
                                background: 'rgba(8,8,15,0.75)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: 6,
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 3 }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: "'Orbitron', sans-serif", fontSize: stageFont(24), fontWeight: 600,
                                color: '#E040FB', letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: 20,
                                textShadow: '0 0 15px rgba(224,64,251,0.4), 0 0 30px rgba(224,64,251,0.15)',
                            }}>
                                {sessionCode}
                            </p>
                        )}
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

                        {state.karaokeQrDataUrl && (
                            <div style={{
                                background: 'rgba(10,6,20,0.9)', padding: 18, borderRadius: 4,
                                border: '1px solid rgba(255,45,149,0.35)',
                                boxShadow: '0 0 25px rgba(255,45,149,0.15), 0 0 50px rgba(0,191,255,0.06), inset 0 0 20px rgba(0,0,0,0.3)',
                                backdropFilter: 'blur(16px)',
                            }}>
                                <img src={state.karaokeQrDataUrl} alt="QR" style={{ width: 130, height: 130, borderRadius: 2, display: 'block' }} />
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

        // ---- Urban (Hip Hop) idle ----
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: '#050505', position: 'relative', overflow: 'hidden',
            }}>
                {/* Spotlight vignette */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(0,0,0,0.8) 100%)',
                }} />
                {/* Grunge texture */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, mixBlendMode: 'overlay' as const }}>
                    <filter id="idle-noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" /></filter>
                    <rect width="100%" height="100%" filter="url(#idle-noise)" />
                </svg>

                {/* Diagonal accent slashes */}
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: 300, height: '100%',
                    background: 'linear-gradient(135deg, transparent 40%, rgba(212,255,0,0.04) 40%, rgba(212,255,0,0.04) 42%, transparent 42%)',
                }} />
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, width: 250, height: '100%',
                    background: 'linear-gradient(135deg, transparent 55%, rgba(255,30,30,0.03) 55%, rgba(255,30,30,0.03) 57%, transparent 57%)',
                }} />

                <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <h1 style={{
                        fontFamily: 'Permanent Marker, cursive', fontSize: stageFont(76), color: '#FFFFFF',
                        lineHeight: 1.1, marginBottom: 4,
                        textShadow: '3px 3px 0 rgba(0,0,0,0.8)',
                    }}>
                        DROP A TRACK
                    </h1>
                    <p style={{
                        fontFamily: 'Oswald, sans-serif', fontSize: stageFont(18), color: '#B0B0B0',
                        letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 48,
                    }}>
                        Scan to add your song
                    </p>
                    {qrUrl && (
                        <div style={{
                            display: 'inline-block', padding: 12,
                            border: '2px solid #D4FF00',
                            clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)',
                            background: 'rgba(0,0,0,0.6)',
                        }}>
                            <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block' }} />
                        </div>
                    )}
                    {sessionCode && (
                        <p style={{
                            fontFamily: 'Oswald, sans-serif', fontSize: stageFont(26), fontWeight: 600, color: '#D4FF00',
                            letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: 20,
                            textShadow: '0 0 10px rgba(212,255,0,0.3)',
                        }}>
                            {sessionCode}
                        </p>
                    )}
                </div>
            </div>
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
                    boxShadow: '0 0 15px rgba(64,224,208,0.1), 0 0 30px rgba(224,64,251,0.05), inset 0 0 20px rgba(64,224,208,0.03)',
                    borderRadius: 6,
                } : theme.name === 'steampunk' ? {
                    background: 'rgba(20,17,15,0.88)',
                    border: '1px solid rgba(200,151,62,0.3)',
                    boxShadow: '0 0 12px rgba(200,151,62,0.1), inset 0 0 15px rgba(200,151,62,0.03)',
                    borderRadius: 3,
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
                    ...(theme.name === 'space' ? { boxShadow: '0 0 10px rgba(64,224,208,0.15)' } : theme.name === 'steampunk' ? { boxShadow: '0 0 8px rgba(200,151,62,0.15)' } : theme.name === 'retrowave' ? { boxShadow: '0 0 8px rgba(255,45,149,0.15)' } : {}),
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
                        color: '#40E0D0',
                        textShadow: '0 0 8px rgba(64,224,208,0.5)',
                    } : theme.name === 'steampunk' ? {
                        color: '#C8973E',
                        textShadow: '0 0 8px rgba(200,151,62,0.4)',
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

    return (
        <>
        <div className="karaoke-stage" onMouseMove={handleMouse} style={{ cursor: showUI ? 'default' : 'none' }}>
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
                            // -1 unstarted / 2 paused / 3 buffering / 5 cued all show the
                            // YT center play-button overlay; we hide the iframe entirely
                            // during those states so the user never sees it. Album art
                            // (rendered just below) shows through instead.
                            opacity: state.isPlaying && ytPlayState === 1 ? 1 : 0,
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
                <div className="k-bg__scrim" style={{ opacity: state.stageMode === 'playing' ? 1 : 0 }} />
            </div>

            {/* Reactions overlay — above video, behind lyrics */}
            <ReactionsOverlay />

            {/* Tomato throws — physical lob + splatter on top of the whole stage */}
            <TomatoSplatterLayer />

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
                ...(theme.name === 'space' ? {
                    background: 'rgba(8,8,15,0.85)',
                    border: '1px solid rgba(64,224,208,0.2)',
                    boxShadow: '0 0 12px rgba(64,224,208,0.08), 0 0 25px rgba(224,64,251,0.04)',
                    borderRadius: 8,
                    backdropFilter: 'blur(16px)',
                    color: '#E8E6F0',
                } : theme.name === 'steampunk' ? {
                    background: 'rgba(20,17,15,0.88)',
                    border: '1px solid rgba(200,151,62,0.25)',
                    boxShadow: '0 0 10px rgba(200,151,62,0.08), inset 0 0 12px rgba(200,151,62,0.03)',
                    borderRadius: 3,
                    backdropFilter: 'blur(16px)',
                    color: '#E8DCC8',
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
                    theme.name === 'space' ? { boxShadow: '0 0 15px rgba(224,64,251,0.2), 0 6px 20px rgba(0,0,0,0.5)', borderRadius: 8, border: '1px solid rgba(224,64,251,0.15)' } : theme.name === 'steampunk' ? { boxShadow: '0 0 10px rgba(200,151,62,0.15), 0 6px 20px rgba(0,0,0,0.5)', borderRadius: 3, border: '1px solid rgba(200,151,62,0.2)' } : theme.name === 'retrowave' ? { boxShadow: '0 0 10px rgba(255,45,149,0.15), 0 6px 20px rgba(0,0,0,0.5)', borderRadius: 4, border: '1px solid rgba(255,45,149,0.15)' } : {}
                } />}
                <div className="k-song-chip__text">
                    <h3 style={{ fontFamily: theme.fontDisplay, ...(theme.name === 'space' ? { color: '#E8E6F0', textShadow: '0 0 10px rgba(64,224,208,0.3)' } : theme.name === 'steampunk' ? { color: '#E8DCC8', textShadow: '0 0 10px rgba(200,151,62,0.25)' } : theme.name === 'retrowave' ? { color: '#F0E6FF', textShadow: '0 0 10px rgba(255,45,149,0.25)' } : {}) }}>{track.name}</h3>
                    <p style={{ color: theme.muted, ...(theme.name === 'space' ? { color: '#9896A8' } : theme.name === 'steampunk' ? { color: '#A89878' } : theme.name === 'retrowave' ? { color: '#9B8CBF' } : {}) }}>{track.artists.map((a: any) => a.name).join(', ')}</p>
                </div>
            </div>
            )}

            {/* Singer tags (top-right) */}
            {singers.length > 0 && (
                <div className="k-singers" style={{ opacity: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                    {singers.map((s: any) => {
                        const spaceSingerStyle = theme.name === 'space' ? {
                            background: 'rgba(8,8,15,0.85)',
                            border: '1px solid ' + (s.color ? s.color.replace(')', ',0.3)').replace('rgb(', 'rgba(') : 'rgba(64,224,208,0.2)'),
                            boxShadow: '0 0 10px ' + (s.color ? s.color.replace(')', ',0.1)').replace('rgb(', 'rgba(') : 'rgba(64,224,208,0.08)'),
                            borderRadius: 6,
                            backdropFilter: 'blur(16px)',
                            color: '#E8E6F0',
                        } as React.CSSProperties : theme.name === 'steampunk' ? {
                            background: 'rgba(20,17,15,0.88)',
                            border: '1px solid rgba(200,151,62,0.25)',
                            boxShadow: '0 0 8px rgba(200,151,62,0.1)',
                            borderRadius: 3,
                            backdropFilter: 'blur(16px)',
                            color: '#E8DCC8',
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

            {/* Lyrics & Stage Centerpiece */}
            <div className="k-lyrics" ref={lyricsRef}>
                {state.stageMode === 'ready' ? (
                  theme.name === 'comic-book' ? (
                    <ComicUpNext theme={theme} art={art} track={track} singers={singers} np={np} roles={roles} guestsMap={guestsMap} />
                  ) : theme.name === 'tropical' ? (
                    <TropicalUpNext theme={theme} art={art} track={track} singers={singers} np={np} roles={roles} guestsMap={guestsMap} />
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
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: stageFont(22), fontWeight: 700, color: 'var(--white-faint)' }}>
                            No lyrics available
                        </p>
                    </div>
                ) : (
                    groupedLyrics.map((group: any[], i: number) => {
                        const isActiveGroup = lineIdx >= 0 && group.some(l => l.originalIndex === lineIdx)
                        const isPastGroup = lineIdx >= 0 && group[group.length - 1].originalIndex < lineIdx

                        return (
                            <div key={i} style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', isolation: 'isolate' }}>
                                {group.map((line: any, j: number) => {
                                    let cls = 'k-line k-line--lg'
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
                                            cls += ' k-line--neo-brutal-active'
                                            inlineStyle.padding = '8px 24px'
                                            inlineStyle.border = '4px solid #0a0a0a'
                                            inlineStyle.boxShadow = '6px 6px 0 #0a0a0a'
                                            inlineStyle.margin = '4px'
                                            inlineStyle.borderRadius = '0px'
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
                                            cls += ' k-line--urban-active'
                                            // @ts-ignore (CSS variables)
                                            inlineStyle['--highlight-color'] = activeHighlight
                                            inlineStyle.background = 'transparent'
                                            inlineStyle.color = ACTIVE_TEXT
                                            inlineStyle.padding = '0.1em 0.4em'
                                        } else if (theme.name === 'deep-sea') {
                                            cls += ' k-line--deep-sea k-line--deep-sea-active'
                                            inlineStyle.padding = '0.22em 0.85em'
                                            inlineStyle.borderRadius = '999px'
                                            inlineStyle.boxShadow = `0 0 28px ${activeSingerColor}, 0 0 60px rgba(0,255,200,0.35), inset 0 1px 0 rgba(255,255,255,0.4)`
                                        } else if (theme.name === 'psychedelic') {
                                            cls += ' k-line--psychedelic k-line--psychedelic-active'
                                            inlineStyle.padding = '0.22em 1em'
                                            inlineStyle.backgroundColor = activeSingerColor
                                            if (activeColors.length > 1) {
                                                const flow = [...activeColors, activeColors[0]].join(', ')
                                                inlineStyle.backgroundImage = `linear-gradient(120deg, ${flow})`
                                                inlineStyle.backgroundSize = '300% 300%'
                                            } else {
                                                inlineStyle.backgroundImage = 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 28%, transparent 50%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0.4) 100%)'
                                                inlineStyle.backgroundSize = '220% 220%'
                                            }
                                            inlineStyle.boxShadow = `0 0 28px ${activeSingerColor}, 0 0 60px ${activeSingerColor}80`
                                        } else if (theme.name === 'zen') {
                                            // Sumi-e calligraphy: deep ink on warm washi paper, with the
                                            // singer's color marking the line like a scroll signature stripe.
                                            // Box-shadow / candlelight breath is handled by the CSS animation
                                            // on .k-line--zen so we don't set it inline (animation needs to win).
                                            cls += ' k-line--zen k-line--zen-active'
                                            inlineStyle.background = 'rgba(240, 230, 211, 0.94)'
                                            inlineStyle.color = '#1a1814'
                                            inlineStyle.padding = '0.22em 1em 0.22em 0.85em'
                                            inlineStyle.borderRadius = '4px'
                                            inlineStyle.borderLeft = `4px solid ${activeSingerColor}`
                                        } else if (theme.name === 'space') {
                                            cls += ' k-line--space k-line--space-active'
                                            inlineStyle.padding = '0.18em 0.75em'
                                            inlineStyle.borderRadius = '8px'
                                            const reversedSpaceColors = activeColors.length > 1 ? [...activeColors].reverse() : []
                                            const spaceGlow = reversedSpaceColors.length > 1
                                                ? `linear-gradient(90deg, ${reversedSpaceColors.join(', ')})`
                                                : activeSingerColor
                                            // @ts-ignore (CSS variables)
                                            inlineStyle['--space-glow'] = spaceGlow
                                            inlineStyle.boxShadow = 'inset 0 0 14px rgba(255,255,255,0.18)'
                                        } else if (theme.name === 'steampunk') {
                                            cls += ' k-line--steampunk k-line--steampunk-active k-line--steampunk-plate'
                                            inlineStyle.padding = '0.22em 1.1em'
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
                                        inlineStyle.opacity = 1
                                    }

                                    // Everyone is a "white" singer (lyrics sanitized) by default. The
                                    // host turns it OFF per-person on the Admin > Guests screen, which
                                    // flips `white_person_check` on the guest row; we resolve it LIVE
                                    // off guestsMap so toggling re-censors the current song instantly.
                                    // Singers with no linked guest stay sanitized.
                                    const isSingerWhite = (idx: number) => {
                                        const s = singers[idx]
                                        if (!s) return false
                                        if (s.guestId) {
                                            const g = guestsMap.get(s.guestId)
                                            return g ? g.white_person_check !== false : true
                                        }
                                        return true
                                    }
                                    const needsSanitation = line.singerIndices?.some((idx: number) => isSingerWhite(idx)) ||
                                        (line.singerIndex !== undefined && isSingerWhite(line.singerIndex));

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
                                            return (
                                                <span key={k} className={sylCls}>
                                                    <span className="k-syl__word">{word}</span>{trail}
                                                </span>
                                            )
                                        })
                                    }

                                    return <div key={j} className={cls} style={inlineStyle}>{content}</div>
                                })}
                            </div>
                        )
                    })
                )}
            </div>

        </div>
        {qrOverlay}
        <AwardsRevealAnimation step={state.awardsRevealStep} />
        </>
    )
}
