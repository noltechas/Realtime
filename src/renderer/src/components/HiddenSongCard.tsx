import React from 'react'
import { Theme } from '../styles/theme'

/**
 * Themed "Hidden Song" placeholder components.
 *
 * These render in place of album art + title + artist when a mobile guest adds
 * a surprise song. Each theme has a distinct motif so the queue and stage retain
 * their visual identity even when song info is obscured.
 *
 * Three call sites:
 *   - <HiddenSongQueueCard>    → fills the art + title/artist slot on the
 *                                  Electron Queue page (compact, horizontal)
 *   - <HiddenSongStagePanel>   → 340x340 replacement for the stage album art
 *   - <HiddenSongStageHeading> → "HIDDEN SONG" heading + themed subtitle that
 *                                  replaces the <h1>/<p> block on the stage
 */

interface ThemeProps { theme: Theme }
interface QueueCardProps extends ThemeProps { addedBy?: string | null }

// ─── Queue variant (48x48 tile + flex-1 info block, as a React Fragment) ────
export function HiddenSongQueueCard({ theme, addedBy }: QueueCardProps) {
    return (
        <>
            <HiddenIconTile theme={theme} size={48} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div
                    style={{
                        fontFamily: theme.fontDisplay,
                        fontWeight: 700,
                        fontSize: 15,
                        letterSpacing: queueTitleLetterSpacing(theme.name),
                        color: hiddenTitleColor(theme),
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textTransform: titleTransform(theme.name),
                        ...queueTitleExtras(theme.name),
                    }}
                >
                    {hiddenLabelFor(theme.name)}
                </div>
                <div
                    style={{
                        fontSize: 12,
                        color: theme.black,
                        opacity: 0.5,
                        fontStyle: subtitleFontStyle(theme.name),
                        fontFamily: theme.fontBody,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {hiddenSubtitleFor(theme.name)}
                </div>
                {addedBy && (
                    <div
                        style={{
                            fontSize: 11,
                            fontFamily: theme.fontDisplay,
                            fontWeight: 600,
                            color: theme.hotRed,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        Added by {addedBy}
                    </div>
                )}
            </div>
        </>
    )
}

// ─── Stage 340x340 panel (replaces album art) ────────────────────────────────
export function HiddenSongStagePanel({ theme }: ThemeProps) {
    return (
        <div
            style={{
                width: 340,
                height: 340,
                borderRadius: theme.radius,
                boxShadow: theme.shadow,
                border: theme.border,
                ...panelExtras(theme),
            }}
        >
            <HiddenStageMotif theme={theme} />
        </div>
    )
}

// ─── Stage heading (replaces <h1> + <p> inside the theme.card) ───────────────
export function HiddenSongStageHeading({ theme }: ThemeProps) {
    return (
        <>
            <h1
                style={{
                    fontFamily: theme.fontDisplay,
                    color: hiddenStageTitleColor(theme),
                    fontSize: 42,
                    fontWeight: 800,
                    lineHeight: 1.15,
                    marginBottom: 10,
                    letterSpacing: stageTitleLetterSpacing(theme.name),
                    textTransform: titleTransform(theme.name),
                    ...stageTitleExtras(theme.name),
                }}
            >
                {hiddenLabelFor(theme.name)}
            </h1>
            <p
                style={{
                    fontSize: 18,
                    color: theme.muted,
                    opacity: theme.name === 'sketch' ? 1 : 0.8,
                    marginBottom: 36,
                    fontStyle: subtitleFontStyle(theme.name),
                    fontFamily: theme.fontBody,
                }}
            >
                {hiddenSubtitleFor(theme.name)}
            </p>
        </>
    )
}

// ─── Shared: small tile used in the queue row ────────────────────────────────
function HiddenIconTile({ theme, size }: ThemeProps & { size: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: theme.radiusSmall,
                border: theme.borderThin,
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
                ...tileExtras(theme),
            }}
        >
            <HiddenTileMotif theme={theme} />
        </div>
    )
}

// ─── Per-theme motif for the small (48x48) tile ──────────────────────────────
function HiddenTileMotif({ theme }: ThemeProps) {
    switch (theme.name) {
        case 'neo-brutal':
            return (
                <div style={centered} className="hs-pulse">
                    <span style={{ fontFamily: theme.fontDisplay, fontWeight: 900, fontSize: 28, color: '#FFD60A' }}>?</span>
                </div>
            )
        case 'cyberpunk':
            return (
                <div style={{ ...centered, color: '#00ff88', fontFamily: theme.fontDisplay, fontSize: 13, fontWeight: 700, letterSpacing: 1 }} className="hs-glitch">
                    [??]
                </div>
            )
        case 'sketch':
            return (
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }} className="hs-wiggle">
                    <path d="M14 18 Q 14 10 24 10 Q 34 10 34 18 Q 34 24 24 27 L 24 33" stroke="#2d2d2d" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="24" cy="38" r="1.8" fill="#2d2d2d" />
                    <path d="M 7 41 q 2 -3 4 0 q 2 3 4 0" stroke="#ff4d4d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
            )
        case 'urban':
            return (
                <>
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, transparent 0 6px, #D4FF00 6px 8px)', opacity: 0.25 }} />
                    <div style={{ ...centered, color: '#D4FF00', fontFamily: theme.fontDisplay, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>??</div>
                </>
            )
        case 'deep-sea':
            return (
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }} className="hs-ds-glow">
                    <ellipse cx="24" cy="20" rx="11" ry="9" fill="rgba(0,255,200,0.12)" stroke="#00ffc8" strokeWidth="1.2" />
                    <path d="M16 26 q -1 4 -2 8 M20 28 q 0 4 -1 8 M24 28 q 0 4 0 8 M28 28 q 0 4 1 8 M32 26 q 1 4 2 8" stroke="#00ffc8" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.8" />
                    <text x="24" y="23" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fontWeight="700" fill="#00ffc8">?</text>
                </svg>
            )
        case 'psychedelic':
            return (
                <>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, #ff2d95 0%, transparent 60%), radial-gradient(circle at 70% 70%, #b6ff2d 0%, transparent 60%)', opacity: 0.55 }} className="hs-psy-hue" />
                    <div style={{ ...centered, fontFamily: theme.fontDisplay, fontSize: 26, fontWeight: 700, color: '#fff', textShadow: '0 0 8px rgba(255,45,149,0.8)' }}>?</div>
                </>
            )
        case 'zen':
            return (
                <div style={{ ...centered, color: '#D4B85A', fontFamily: theme.fontDisplay, fontSize: 22, fontWeight: 400, textShadow: '0 0 8px rgba(201,168,76,0.5)' }} className="hs-zen-pulse">
                    秘
                </div>
            )
        case 'space':
            return (
                <>
                    <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: 'radial-gradient(circle, #000 0%, #000 55%, rgba(224,64,251,0.3) 60%, transparent 75%)', boxShadow: '0 0 12px rgba(224,64,251,0.5)' }} className="hs-space-ring" />
                    <div style={{ ...centered, color: '#E040FB', fontFamily: theme.fontDisplay, fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>???</div>
                </>
            )
        case 'steampunk':
            return (
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }}>
                    <rect x="14" y="22" width="20" height="18" rx="2" fill="#C8973E" stroke="#14110F" strokeWidth="1.5" />
                    <path d="M18 22 v-4 a6 6 0 0 1 12 0 v4" stroke="#C8973E" strokeWidth="2.5" fill="none" />
                    <circle cx="24" cy="31" r="1.8" fill="#14110F" />
                    <rect x="23.3" y="31.5" width="1.4" height="4" fill="#14110F" />
                </svg>
            )
        case 'retrowave':
            return (
                <>
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent 0 2px, rgba(255,45,149,0.15) 2px 3px)' }} />
                    <div style={{ ...centered, color: '#FF2D95', fontFamily: theme.fontDisplay, fontSize: 9, fontWeight: 700, letterSpacing: 1, textShadow: '0 0 6px rgba(255,45,149,0.8)' }} className="hs-retro-flicker">
                        NO SIGNAL
                    </div>
                </>
            )
        default:
            return (
                <div style={{ ...centered, color: theme.black, fontFamily: theme.fontDisplay, fontSize: 22, fontWeight: 800 }}>?</div>
            )
    }
}

// ─── Per-theme motif for the large (340x340) stage panel ─────────────────────
function HiddenStageMotif({ theme }: ThemeProps) {
    switch (theme.name) {
        case 'neo-brutal':
            return (
                <div style={{ ...stageFill, background: '#1A1A1A' }}>
                    <div style={{ position: 'absolute', inset: 20, border: '4px dashed #FFD60A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="hs-pulse" style={{ fontFamily: theme.fontDisplay, fontWeight: 900, fontSize: 220, color: '#FFD60A', lineHeight: 1, textShadow: '8px 8px 0 #B388FF' }}>?</span>
                    </div>
                    <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', background: '#FF3B30', color: '#FFFFFF', fontFamily: theme.fontDisplay, fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', border: '3px solid #FFD60A' }}>
                        CENSORED
                    </div>
                </div>
            )
        case 'cyberpunk':
            return (
                <div style={{ ...stageFill, background: '#060610' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,255,136,0.08) 3px 4px)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(0,255,136,0.15), transparent 70%)' }} />
                    <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', color: '#00ff88', fontFamily: theme.fontDisplay, textShadow: '0 0 10px rgba(0,255,136,0.8)' }}>
                        <div style={{ fontSize: 14, letterSpacing: 2, opacity: 0.7, marginBottom: 8 }}>&gt; sys.access.request</div>
                        <div className="hs-glitch" style={{ fontSize: 38, fontWeight: 700, letterSpacing: 4 }}>[REDACTED]</div>
                        <div style={{ fontSize: 14, letterSpacing: 3, opacity: 0.7, marginTop: 8 }}>// classification: A-7</div>
                    </div>
                </div>
            )
        case 'sketch':
            return (
                <div style={{ ...stageFill, background: '#fdfbf7' }}>
                    <svg width="340" height="340" viewBox="0 0 340 340" style={{ position: 'absolute', inset: 0 }} className="hs-wiggle">
                        <path d="M 95 130 Q 95 70 170 70 Q 245 70 245 130 Q 245 175 170 195 L 170 240" stroke="#2d2d2d" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="170" cy="268" r="9" fill="#2d2d2d" />
                        <path d="M 50 290 q 10 -12 20 0 q 10 12 20 0 q 10 -12 20 0" stroke="#ff4d4d" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d="M 250 290 q 10 -12 20 0 q 10 12 20 0" stroke="#2d5da1" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <circle cx="60" cy="70" r="18" stroke="#fff9c4" strokeWidth="4" strokeDasharray="4 3" fill="none" />
                        <path d="M 270 60 l 15 -8 l -5 16 l 12 -5 l -8 14" stroke="#ff4d4d" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div style={{ position: 'absolute', bottom: 22, left: 0, right: 0, textAlign: 'center', fontFamily: theme.fontBody, color: '#2d5da1', fontSize: 28, transform: 'rotate(-3deg)' }}>
                        shhh…
                    </div>
                </div>
            )
        case 'urban':
            return (
                <div style={{ ...stageFill, background: '#0a0a0a' }}>
                    <div style={{ position: 'absolute', top: 20, left: 0, right: 0, height: 26, background: 'repeating-linear-gradient(135deg, #D4FF00 0 14px, #0a0a0a 14px 28px)', opacity: 0.9 }} />
                    <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, height: 26, background: 'repeating-linear-gradient(135deg, #D4FF00 0 14px, #0a0a0a 14px 28px)', opacity: 0.9 }} />
                    <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                        <div style={{ display: 'inline-block', background: '#000', color: '#D4FF00', fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 44, letterSpacing: 6, padding: '12px 32px', border: '3px solid #D4FF00', textTransform: 'uppercase', clipPath: 'polygon(4% 0, 100% 0, 96% 100%, 0 100%)', textShadow: '3px 3px 0 #FF1E1E' }}>
                            UNKNOWN
                        </div>
                        <div style={{ marginTop: 12, color: '#FF1E1E', fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.9 }}>
                            track redacted
                        </div>
                    </div>
                </div>
            )
        case 'deep-sea':
            return (
                <div style={{ ...stageFill, background: 'linear-gradient(180deg, #040918 0%, #020612 70%, #000 100%)' }}>
                    <svg width="340" height="340" viewBox="0 0 340 340" style={{ position: 'absolute', inset: 0 }} className="hs-ds-float">
                        <defs>
                            <radialGradient id="jelly" cx="50%" cy="40%">
                                <stop offset="0%" stopColor="rgba(0,255,200,0.6)" />
                                <stop offset="60%" stopColor="rgba(0,255,200,0.15)" />
                                <stop offset="100%" stopColor="rgba(0,255,200,0)" />
                            </radialGradient>
                        </defs>
                        <ellipse cx="170" cy="130" rx="90" ry="75" fill="url(#jelly)" stroke="#00ffc8" strokeWidth="1.5" opacity="0.85" />
                        <path d="M90 165 q -10 35 -15 80 M110 180 q -6 35 -8 80 M135 188 q -3 40 -4 90 M170 192 q 0 45 0 95 M205 188 q 3 40 4 90 M230 180 q 6 35 8 80 M250 165 q 10 35 15 80" stroke="#00ffc8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
                        <circle cx="140" cy="120" r="5" fill="#040918" />
                        <circle cx="200" cy="120" r="5" fill="#040918" />
                        <text x="170" y="145" textAnchor="middle" fontFamily="sans-serif" fontSize="54" fontWeight="700" fill="#00ffc8">?</text>
                        <circle cx="60" cy="80" r="2" fill="#00ffc8" opacity="0.6" />
                        <circle cx="280" cy="200" r="3" fill="#00ffc8" opacity="0.5" />
                        <circle cx="50" cy="240" r="1.5" fill="#b44dff" opacity="0.5" />
                        <circle cx="295" cy="100" r="1.5" fill="#b44dff" opacity="0.6" />
                    </svg>
                    <div style={{ position: 'absolute', bottom: 22, left: 0, right: 0, textAlign: 'center', fontFamily: theme.fontDisplay, color: '#00ffc8', fontSize: 16, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', textShadow: '0 0 12px rgba(0,255,200,0.6)' }}>
                        Lost in the deep
                    </div>
                </div>
            )
        case 'psychedelic':
            return (
                <div style={{ ...stageFill, background: '#1a0a2e' }}>
                    <div className="hs-psy-hue" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 35%, #ff2d95 0%, transparent 50%), radial-gradient(ellipse at 70% 65%, #b6ff2d 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #ff8c2d 0%, transparent 45%)', opacity: 0.8, filter: 'blur(12px)' }} />
                    <svg width="340" height="340" viewBox="0 0 340 340" style={{ position: 'absolute', inset: 0 }} className="hs-psy-spin">
                        <circle cx="170" cy="170" r="110" stroke="#f5ecff" strokeWidth="1" fill="none" strokeDasharray="3 6" opacity="0.4" />
                        <circle cx="170" cy="170" r="85" stroke="#f5ecff" strokeWidth="1" fill="none" strokeDasharray="2 8" opacity="0.35" />
                    </svg>
                    <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                        <div className="hs-psy-hue" style={{ fontFamily: theme.fontDisplay, fontSize: 140, fontWeight: 700, color: '#fff', textShadow: '0 0 18px #ff2d95, 0 0 40px #b6ff2d', lineHeight: 1 }}>
                            ?
                        </div>
                        <div style={{ marginTop: 6, fontFamily: theme.fontDisplay, fontSize: 22, color: '#f5ecff', letterSpacing: 3, textTransform: 'uppercase', opacity: 0.9 }}>
                            mystery jam
                        </div>
                    </div>
                </div>
            )
        case 'zen':
            return (
                <div style={{ ...stageFill, background: 'linear-gradient(135deg, #1a1814 0%, #2a241d 100%)' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 55%, rgba(212,184,90,0.15), transparent 60%)' }} />
                    <svg width="340" height="340" viewBox="0 0 340 340" style={{ position: 'absolute', inset: 0 }}>
                        <circle cx="170" cy="170" r="115" stroke="#D4B85A" strokeWidth="4" fill="none" opacity="0.4" strokeDasharray="8 6" className="hs-zen-orbit" />
                    </svg>
                    <div className="hs-zen-pulse" style={{ position: 'relative', zIndex: 2, textAlign: 'center', color: '#D4B85A', fontFamily: theme.fontDisplay, fontSize: 180, lineHeight: 1, fontWeight: 400, textShadow: '0 0 24px rgba(212,184,90,0.6), 0 0 50px rgba(212,184,90,0.3)' }}>
                        秘
                    </div>
                    <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', fontFamily: theme.fontBody, color: '#F0E6D3', fontSize: 18, fontStyle: 'italic', letterSpacing: 4, opacity: 0.7 }}>
                        concealed
                    </div>
                </div>
            )
        case 'space':
            return (
                <div style={{ ...stageFill, background: 'radial-gradient(circle at 50% 50%, #1a0f2a 0%, #08080F 60%)' }}>
                    <svg width="340" height="340" viewBox="0 0 340 340" style={{ position: 'absolute', inset: 0 }}>
                        <circle cx="60" cy="50" r="1" fill="#fff" opacity="0.8" />
                        <circle cx="290" cy="80" r="1.5" fill="#fff" opacity="0.6" />
                        <circle cx="50" cy="270" r="1" fill="#40E0D0" opacity="0.7" />
                        <circle cx="310" cy="240" r="1.2" fill="#fff" opacity="0.8" />
                        <circle cx="270" cy="30" r="1" fill="#FFB740" opacity="0.5" />
                        <circle cx="30" cy="180" r="1" fill="#fff" opacity="0.6" />
                        <circle cx="300" cy="170" r="1.3" fill="#E040FB" opacity="0.7" />
                    </svg>
                    <div className="hs-space-ring" style={{ position: 'absolute', width: 220, height: 220, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: '50%', background: 'radial-gradient(circle, #000 0%, #000 52%, rgba(224,64,251,0.55) 55%, rgba(64,224,208,0.3) 65%, transparent 80%)', boxShadow: '0 0 60px rgba(224,64,251,0.5), 0 0 120px rgba(64,224,208,0.25)' }} />
                    <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', color: '#E040FB', fontFamily: theme.fontDisplay, textShadow: '0 0 14px rgba(224,64,251,0.8)' }}>
                        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase' }} className="hs-pulse">
                            unknown
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 400, letterSpacing: 8, marginTop: 4, opacity: 0.8 }}>
                            signal
                        </div>
                    </div>
                </div>
            )
        case 'steampunk':
            return (
                <div style={{ ...stageFill, background: 'radial-gradient(ellipse at 50% 50%, #2a1f14 0%, #14110F 70%)' }}>
                    <svg width="340" height="340" viewBox="0 0 340 340" style={{ position: 'absolute', inset: 0 }}>
                        <circle cx="50" cy="60" r="30" stroke="#C8973E" strokeWidth="2" fill="none" opacity="0.35" strokeDasharray="2 4" className="hs-gear" />
                        <circle cx="295" cy="280" r="36" stroke="#C8973E" strokeWidth="2" fill="none" opacity="0.35" strokeDasharray="3 4" className="hs-gear-rev" />
                        <rect x="110" y="135" width="120" height="130" rx="6" fill="#C8973E" stroke="#8a6420" strokeWidth="3" />
                        <rect x="118" y="143" width="104" height="114" rx="3" fill="none" stroke="#8a6420" strokeWidth="1.5" opacity="0.6" />
                        <path d="M130 135 v-22 a40 40 0 0 1 80 0 v22" stroke="#C8973E" strokeWidth="10" fill="none" strokeLinecap="round" />
                        <circle cx="170" cy="195" r="9" fill="#14110F" />
                        <rect x="166" y="198" width="8" height="30" fill="#14110F" />
                        <circle cx="122" cy="148" r="2" fill="#8a6420" />
                        <circle cx="218" cy="148" r="2" fill="#8a6420" />
                        <circle cx="122" cy="252" r="2" fill="#8a6420" />
                        <circle cx="218" cy="252" r="2" fill="#8a6420" />
                    </svg>
                    <div style={{ position: 'absolute', top: 18, right: 18, padding: '6px 14px', border: '2.5px solid #E07040', color: '#E07040', fontFamily: theme.fontDisplay, fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', transform: 'rotate(8deg)', background: 'rgba(20,17,15,0.7)' }}>
                        Classified
                    </div>
                </div>
            )
        case 'retrowave':
            return (
                <div style={{ ...stageFill, background: 'linear-gradient(180deg, #0a0614 0%, #1a0f2e 60%, #2a0f3a 100%)' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent 0 2px, rgba(255,45,149,0.08) 2px 3px)' }} />
                    <div className="hs-retro-tracking" style={{ position: 'absolute', left: 0, right: 0, height: 28, background: 'linear-gradient(180deg, transparent, rgba(255,45,149,0.5), rgba(255,255,255,0.3), rgba(0,191,255,0.5), transparent)', mixBlendMode: 'screen' }} />
                    <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                        <div className="hs-retro-flicker" style={{ fontFamily: theme.fontDisplay, fontSize: 48, fontWeight: 700, color: '#FF2D95', letterSpacing: 8, textShadow: '3px 0 0 #00BFFF, -3px 0 0 #FFD700, 0 0 20px rgba(255,45,149,0.8)' }}>
                            NO SIGNAL
                        </div>
                        <div style={{ marginTop: 10, fontFamily: theme.fontDisplay, fontSize: 54, fontWeight: 700, color: '#F0E6FF', letterSpacing: 16, textShadow: '0 0 12px rgba(255,45,149,0.6)' }}>
                            ???
                        </div>
                        <div style={{ marginTop: 14, fontFamily: theme.fontDisplay, fontSize: 13, color: '#00BFFF', letterSpacing: 6, opacity: 0.7 }}>
                            track.dat // error 404
                        </div>
                    </div>
                </div>
            )
        default:
            return (
                <div style={{ ...stageFill, background: theme.black, color: theme.cream }}>
                    <span style={{ fontSize: 180, fontWeight: 800, fontFamily: theme.fontDisplay }}>?</span>
                </div>
            )
    }
}

// ─── Helpers: theme-specific styling decisions ──────────────────────────────
const centered: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}

const stageFill: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
}

function hiddenLabelFor(name: string): string {
    switch (name) {
        case 'cyberpunk': return '[REDACTED]'
        case 'sketch': return 'shhh…'
        case 'urban': return 'UNKNOWN'
        case 'deep-sea': return 'Lost in the deep'
        case 'psychedelic': return 'Mystery Jam'
        case 'zen': return '秘'
        case 'space': return 'UNKNOWN SIGNAL'
        case 'steampunk': return 'Classified'
        case 'retrowave': return 'NO SIGNAL'
        case 'neo-brutal':
        default: return 'HIDDEN SONG'
    }
}

function hiddenSubtitleFor(name: string): string {
    switch (name) {
        case 'cyberpunk': return '// access denied'
        case 'sketch': return 'it\'s a secret!'
        case 'urban': return 'track redacted'
        case 'deep-sea': return 'a song from the abyss'
        case 'psychedelic': return 'guess the groove'
        case 'zen': return 'concealed'
        case 'space': return 'transmission encrypted'
        case 'steampunk': return 'sealed by the archivist'
        case 'retrowave': return 'track.dat — error 404'
        case 'neo-brutal':
        default: return 'surprise pick!'
    }
}

function hiddenTitleColor(theme: Theme): string {
    switch (theme.name) {
        case 'cyberpunk': return '#00ff88'
        case 'deep-sea': return '#00ffc8'
        case 'psychedelic': return '#ff2d95'
        case 'zen': return '#D4B85A'
        case 'space': return '#E040FB'
        case 'steampunk': return '#C8973E'
        case 'retrowave': return '#FF2D95'
        case 'urban': return '#D4FF00'
        default: return theme.black
    }
}

function hiddenStageTitleColor(theme: Theme): string {
    if (theme.name === 'neo-brutal' || theme.name === 'sketch') return theme.black
    return hiddenTitleColor(theme)
}

function queueTitleLetterSpacing(name: string): string {
    switch (name) {
        case 'cyberpunk':
        case 'urban':
        case 'space':
        case 'retrowave':
            return '2px'
        case 'neo-brutal':
            return '0.5px'
        default:
            return 'normal'
    }
}

function stageTitleLetterSpacing(name: string): string {
    switch (name) {
        case 'cyberpunk': return '6px'
        case 'urban': return '8px'
        case 'space': return '10px'
        case 'retrowave': return '10px'
        default: return '-0.5px'
    }
}

function titleTransform(name: string): 'uppercase' | 'none' {
    switch (name) {
        case 'sketch':
        case 'psychedelic':
        case 'zen':
        case 'steampunk':
            return 'none'
        default:
            return 'uppercase'
    }
}

function subtitleFontStyle(name: string): 'italic' | 'normal' {
    switch (name) {
        case 'sketch':
        case 'zen':
            return 'italic'
        default:
            return 'normal'
    }
}

function queueTitleExtras(name: string): React.CSSProperties {
    switch (name) {
        case 'cyberpunk':
            return { textShadow: '0 0 6px rgba(0,255,136,0.6)' }
        case 'deep-sea':
            return { textShadow: '0 0 6px rgba(0,255,200,0.5)' }
        case 'space':
            return { textShadow: '0 0 6px rgba(224,64,251,0.6)' }
        case 'retrowave':
            return { textShadow: '0 0 6px rgba(255,45,149,0.6)' }
        case 'psychedelic':
            return { textShadow: '0 0 6px rgba(255,45,149,0.5)' }
        default:
            return {}
    }
}

function stageTitleExtras(name: string): React.CSSProperties {
    switch (name) {
        case 'cyberpunk':
            return { textShadow: '0 0 12px rgba(0,255,136,0.6)' }
        case 'deep-sea':
            return { textShadow: '0 0 14px rgba(0,255,200,0.5)' }
        case 'space':
            return { textShadow: '0 0 14px rgba(224,64,251,0.7)' }
        case 'retrowave':
            return { textShadow: '3px 0 0 #00BFFF, -3px 0 0 #FFD700, 0 0 14px rgba(255,45,149,0.5)' }
        case 'psychedelic':
            return { textShadow: '0 0 14px rgba(255,45,149,0.5), 0 0 30px rgba(182,255,45,0.4)' }
        case 'zen':
            return { textShadow: '0 0 14px rgba(212,184,90,0.5)' }
        default:
            return {}
    }
}

function tileExtras(theme: Theme): React.CSSProperties {
    switch (theme.name) {
        case 'neo-brutal':
            return { background: '#1A1A1A', borderColor: '#1A1A1A' }
        case 'cyberpunk':
            return { background: '#060610', borderColor: '#00ff88' }
        case 'sketch':
            return { background: '#fdfbf7', borderColor: '#2d2d2d' }
        case 'urban':
            return { background: '#0a0a0a', borderColor: '#D4FF00' }
        case 'deep-sea':
            return { background: '#040918', borderColor: 'rgba(0,255,200,0.4)' }
        case 'psychedelic':
            return { background: '#1a0a2e', borderColor: 'rgba(255,45,149,0.4)' }
        case 'zen':
            return { background: '#1a1814', borderColor: 'rgba(212,184,90,0.4)' }
        case 'space':
            return { background: '#08080F', borderColor: 'rgba(224,64,251,0.4)' }
        case 'steampunk':
            return { background: '#14110F', borderColor: 'rgba(200,151,62,0.4)' }
        case 'retrowave':
            return { background: '#0a0614', borderColor: 'rgba(255,45,149,0.4)' }
        default:
            return {}
    }
}

function panelExtras(theme: Theme): React.CSSProperties {
    switch (theme.name) {
        case 'neo-brutal':
            return { background: '#1A1A1A', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }
        default:
            return { overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }
    }
}
