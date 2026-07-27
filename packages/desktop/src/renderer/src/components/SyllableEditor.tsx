import { useEffect, useRef, useState, useCallback } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Syllable, LyricLine } from '../context/AppContext'
import { deriveTapTimings } from '../utils/resyncSyllables'
import { Button, Icon, IconButton } from './ui'

/**
 * Inline per-syllable editor for a single lyric line.
 *
 * Two editing surfaces:
 *  - Text chips: each syllable is an editable input; split / merge / delete / add.
 *  - Timing: "tap along to the track" — play the instrumental and tap (Spacebar or
 *    the TAP button) once per syllable to set each one's start; durations are derived
 *    from consecutive starts on Stop. Numeric ms fine-tune is also available.
 *
 * CONTRACT (see resyncSyllables.ts): the saved `words` must equal
 * `syllables.map(s => s.text).join('').trim()`, and word boundaries are encoded as a
 * trailing space on a syllable's `text` (e.g. "threw "). We keep that trailing space
 * inside `text` so the literal join stays correct ("nigga", not "ni gg a") and
 * `resyncLyrics` on save is a no-op. `onChange` always reports both syllables and the
 * derived words so the parent stays consistent.
 */

const MIN_SYL_MS = 60
const PREROLL_MS = 2000

const joinWords = (syls: Syllable[]) => syls.map(s => s.text).join('').trim()
const deepCopy = (syls: Syllable[]): Syllable[] => syls.map(s => ({ ...s }))
const endsWithSpace = (t: string) => /\s$/.test(t || '')
const trimmed = (t: string) => (t || '').replace(/\s+$/, '')

function median(nums: number[]): number {
    const xs = nums.filter(n => n > 0).sort((a, b) => a - b)
    if (xs.length === 0) return 0
    const mid = Math.floor(xs.length / 2)
    return xs.length % 2 ? xs[mid] : Math.round((xs[mid - 1] + xs[mid]) / 2)
}

const fmtTime = (ms: number) => {
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const cs = Math.floor((ms % 1000))
    return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(3, '0')}`
}

interface Props {
    line: LyricLine
    nextLineStartMs?: number
    instrumentalPath: string | null
    onChange: (next: { syllables: Syllable[]; words: string }) => void
    onClose: () => void
}

export function SyllableEditor({ line, nextLineStartMs, instrumentalPath, onChange, onClose }: Props) {
    // Working syllables (source of truth while the editor is open). Initialised once.
    const [syls, setSyls] = useState<Syllable[]>(() => deepCopy(line.syllables || []))
    const originalRef = useRef<Syllable[]>(deepCopy(line.syllables || []))

    // Audio + tap state
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const rafRef = useRef<number | null>(null)
    const [audioReady, setAudioReady] = useState(false)
    const [audioError, setAudioError] = useState(false)
    const [tapMode, setTapMode] = useState(false)
    const [armed, setArmed] = useState(0)
    const [playheadMs, setPlayheadMs] = useState(0)
    const tapStartsRef = useRef<(number | null)[]>([])
    const armedRef = useRef(0)
    const sylsRef = useRef<Syllable[]>(syls)
    sylsRef.current = syls

    const hasAudio = !!instrumentalPath && !audioError

    // The line's time window, used for the timeline + auto-stop.
    const nextBoundary =
        (typeof nextLineStartMs === 'number' && nextLineStartMs > line.startTimeMs ? nextLineStartMs : undefined) ??
        (typeof line.endTimeMs === 'number' && line.endTimeMs > line.startTimeMs ? line.endTimeMs : undefined) ??
        (() => {
            const last = syls[syls.length - 1]
            const med = median(syls.map(s => s.durMs)) || 400
            return last ? last.startMs + last.durMs + med : line.startTimeMs + 2000
        })()
    const windowStart = Math.max(0, line.startTimeMs - PREROLL_MS)
    const windowEnd = Math.max(nextBoundary, windowStart + 500)
    const windowSpan = windowEnd - windowStart

    // ── Audio element lifecycle ──────────────────────────────────────────────
    useEffect(() => {
        if (!instrumentalPath) { setAudioReady(false); return }
        const audio = new Audio()
        audio.preload = 'auto'
        audio.src = 'file://' + instrumentalPath
        const onCanPlay = () => setAudioReady(true)
        const onErr = () => { setAudioError(true); setAudioReady(false) }
        audio.addEventListener('canplay', onCanPlay)
        audio.addEventListener('loadedmetadata', onCanPlay)
        audio.addEventListener('error', onErr)
        audioRef.current = audio
        return () => {
            audio.pause()
            audio.removeEventListener('canplay', onCanPlay)
            audio.removeEventListener('loadedmetadata', onCanPlay)
            audio.removeEventListener('error', onErr)
            audio.src = ''
            audioRef.current = null
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
    }, [instrumentalPath])

    const commit = useCallback((next: Syllable[]) => {
        setSyls(next)
        onChange({ syllables: next, words: joinWords(next) })
    }, [onChange])

    // ── Tap-to-time ──────────────────────────────────────────────────────────
    const stopTapMode = useCallback((opts: { commitTaps: boolean }) => {
        const audio = audioRef.current
        if (audio) audio.pause()
        if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
        setTapMode(false)

        if (opts.commitTaps) {
            const starts = tapStartsRef.current
            const base = sylsRef.current
            if (starts.some(s => s != null)) {
                commit(deriveTapTimings(base, starts, nextBoundary, MIN_SYL_MS))
            }
        }
        tapStartsRef.current = []
        armedRef.current = 0
        setArmed(0)
    }, [commit, nextBoundary])

    const tick = useCallback(() => {
        const audio = audioRef.current
        if (!audio) return
        const ms = Math.round(audio.currentTime * 1000)
        setPlayheadMs(ms)
        // Auto-stop a bit past the line so it doesn't run forever.
        if (ms > nextBoundary + 1500) { stopTapMode({ commitTaps: true }); return }
        rafRef.current = requestAnimationFrame(tick)
    }, [nextBoundary, stopTapMode])

    const startTapMode = useCallback(async () => {
        const audio = audioRef.current
        if (!audio || !audioReady) return
        tapStartsRef.current = new Array(sylsRef.current.length).fill(null)
        armedRef.current = 0
        setArmed(0)
        setTapMode(true)
        audio.currentTime = windowStart / 1000
        try { await audio.play() } catch { /* play() rejection (autoplay race) — ignore */ }
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(tick)
    }, [audioReady, windowStart, tick])

    const recordTap = useCallback(() => {
        const audio = audioRef.current
        if (!audio || !tapMode) return
        const i = armedRef.current
        if (i >= sylsRef.current.length) return
        const now = Math.round(audio.currentTime * 1000)
        // Monotonic vs the previous tapped start.
        let prev = -Infinity
        for (let k = i - 1; k >= 0; k--) { if (tapStartsRef.current[k] != null) { prev = tapStartsRef.current[k] as number; break } }
        const start = Math.max(now, prev + MIN_SYL_MS)
        tapStartsRef.current[i] = start
        armedRef.current = i + 1
        setArmed(i + 1)
        if (i + 1 >= sylsRef.current.length) stopTapMode({ commitTaps: true })
    }, [tapMode, stopTapMode])

    // Re-arm at a specific syllable (clears that index onward so re-tapping overwrites).
    const reArm = useCallback((idx: number) => {
        if (!tapMode) return
        for (let k = idx; k < tapStartsRef.current.length; k++) tapStartsRef.current[k] = null
        armedRef.current = idx
        setArmed(idx)
    }, [tapMode])

    // Spacebar tap — only when the editor (not a text field) is focused.
    useEffect(() => {
        if (!tapMode) return
        const onKey = (e: KeyboardEvent) => {
            if (e.code !== 'Space' && e.key !== ' ') return
            if (e.repeat) return
            const el = document.activeElement
            // Skip when a field or button is focused: text inputs need the space, and a
            // focused button (e.g. TAP itself) already fires its onClick on Space — so
            // handling it here too would double-count the tap.
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON')) return
            e.preventDefault()
            recordTap()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [tapMode, recordTap])

    const reset = useCallback(() => {
        if (tapMode) stopTapMode({ commitTaps: false })
        const restored = deepCopy(originalRef.current)
        commit(restored)
    }, [tapMode, stopTapMode, commit])

    // ── Chip text editing ────────────────────────────────────────────────────
    const setChipText = (idx: number, value: string) => {
        const next = syls.map((s, i) => {
            if (i !== idx) return s
            const keepSpace = endsWithSpace(s.text) && i < syls.length - 1
            return { ...s, text: trimmed(value) + (keepSpace ? ' ' : '') }
        })
        setSyls(next) // local while typing; parent updated on blur
    }
    const flush = () => onChange({ syllables: syls, words: joinWords(syls) })

    const toggleBoundary = (idx: number) => {
        // Flip whether syllable `idx` ends its word (trailing space).
        const next = syls.map((s, i) => i === idx ? { ...s, text: trimmed(s.text) + (endsWithSpace(s.text) ? '' : ' ') } : s)
        commit(next)
    }

    const splitChip = (idx: number) => {
        const s = syls[idx]
        const bare = trimmed(s.text)
        if (bare.length < 2) return
        const at = Math.ceil(bare.length / 2)
        const d1 = Math.max(MIN_SYL_MS, Math.round(s.durMs * (at / bare.length)))
        const d2 = Math.max(MIN_SYL_MS, s.durMs - d1)
        const first: Syllable = { text: bare.slice(0, at), startMs: s.startMs, durMs: d1 }
        const second: Syllable = { text: bare.slice(at) + (endsWithSpace(s.text) ? ' ' : ''), startMs: s.startMs + d1, durMs: d2 }
        commit([...syls.slice(0, idx), first, second, ...syls.slice(idx + 1)])
    }

    const mergeNext = (idx: number) => {
        if (idx >= syls.length - 1) return
        const a = syls[idx], b = syls[idx + 1]
        const merged: Syllable = { text: trimmed(a.text) + b.text, startMs: a.startMs, durMs: a.durMs + b.durMs }
        commit([...syls.slice(0, idx), merged, ...syls.slice(idx + 2)])
    }

    const deleteChip = (idx: number) => {
        if (syls.length <= 1) return
        const removed = syls[idx]
        const next = syls.filter((_, i) => i !== idx)
        // Fold the removed duration into the neighbor so timing stays continuous.
        const giveTo = idx < next.length ? idx : next.length - 1
        next[giveTo] = { ...next[giveTo], durMs: next[giveTo].durMs + removed.durMs }
        if (idx < next.length) next[giveTo] = { ...next[giveTo], startMs: removed.startMs }
        commit(next)
    }

    const addAfter = (idx: number) => {
        const s = syls[idx]
        const half = Math.max(MIN_SYL_MS, Math.round(s.durMs / 2))
        const shortened: Syllable = { ...s, text: trimmed(s.text), durMs: half }
        const created: Syllable = { text: endsWithSpace(s.text) ? ' ' : '', startMs: s.startMs + half, durMs: Math.max(MIN_SYL_MS, s.durMs - half) }
        commit([...syls.slice(0, idx), shortened, created, ...syls.slice(idx + 1)])
    }

    const setTiming = (idx: number, field: 'startMs' | 'durMs', value: number) => {
        const next = syls.map((s, i) => i === idx ? { ...s, [field]: Math.max(field === 'durMs' ? MIN_SYL_MS : 0, Math.round(value)) } : s)
        commit(next)
    }

    // Flush any unsaved text edits when the editor unmounts/closes.
    useEffect(() => () => { onChange({ syllables: sylsRef.current, words: joinWords(sylsRef.current) }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Render ────────────────────────────────────────────────────────────────
    const panel: CSSProperties = {
        margin: '2px 12px 10px 48px', padding: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
    }

    return (
        <div className="adm-well" style={panel} tabIndex={0}>
            <style>{`@keyframes admSylPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,165,36,0)}50%{box-shadow:0 0 0 4px rgba(245,165,36,0.35)}}`}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="adm-label">Per-syllable editor</div>
                <IconButton icon="x" size={24} title="Close editor" onClick={onClose} />
            </div>

            {/* Timeline strip */}
            <div style={{
                position: 'relative', height: 30, overflow: 'hidden',
                background: 'var(--adm-card)', borderRadius: 'var(--adm-r-sm)',
                border: '1px solid var(--adm-line)',
            }}>
                {syls.map((s, i) => {
                    const left = ((s.startMs - windowStart) / windowSpan) * 100
                    const width = (s.durMs / windowSpan) * 100
                    const active = tapMode && i < armed
                    return (
                        <div key={i} title={`${trimmed(s.text) || '·'} — ${fmtTime(s.startMs)} (${s.durMs}ms)`}
                            style={{
                                position: 'absolute', top: 3, bottom: 3, left: `${left}%`, width: `${Math.max(0.6, width)}%`,
                                background: active ? 'var(--adm-amber)' : 'rgba(76,195,232,0.35)',
                                border: '1px solid rgba(0,0,0,0.35)', borderRadius: 3, overflow: 'hidden',
                                fontSize: 9, color: active ? '#191104' : 'var(--adm-text)',
                                lineHeight: '22px', textAlign: 'center', whiteSpace: 'nowrap',
                            }}>{trimmed(s.text)}</div>
                    )
                })}
                {tapMode && playheadMs >= windowStart && (
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${Math.min(100, ((playheadMs - windowStart) / windowSpan) * 100)}%`,
                        width: 2, background: 'var(--adm-red)', boxShadow: '0 0 5px var(--adm-red)',
                    }} />
                )}
            </div>

            {/* Syllable chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 2 }}>
                {syls.map((s, i) => {
                    const isArmed = tapMode && i === armed
                    const isTapped = tapMode && i < armed
                    const boundary = endsWithSpace(s.text) && i < syls.length - 1
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <div
                                onClick={tapMode ? () => reArm(i) : undefined}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                    padding: 3, borderRadius: 6, cursor: tapMode ? 'pointer' : 'default',
                                    background: isTapped ? 'var(--adm-amber-soft)' : 'transparent',
                                    border: `1px solid ${isArmed ? 'var(--adm-amber)' : 'transparent'}`,
                                    animation: isArmed ? 'admSylPulse 1s ease-in-out infinite' : undefined,
                                }}
                            >
                                <input
                                    value={trimmed(s.text)}
                                    onChange={e => setChipText(i, e.target.value)}
                                    onBlur={flush}
                                    disabled={tapMode}
                                    style={{
                                        width: `${Math.max(2, trimmed(s.text).length + 1)}ch`, minWidth: 18, textAlign: 'center',
                                        fontSize: 13, fontFamily: 'var(--adm-body)', color: 'var(--adm-text)',
                                        background: 'var(--adm-card)', border: '1px solid var(--adm-line)',
                                        borderRadius: 4, padding: '3px 2px', outline: 'none',
                                    }}
                                />
                                {!tapMode && (
                                    <div style={{ display: 'flex', gap: 1 }}>
                                        <ChipBtn title="Split syllable" onClick={() => splitChip(i)}>⇆</ChipBtn>
                                        {i < syls.length - 1 && <ChipBtn title="Merge with next" onClick={() => mergeNext(i)}>⋯</ChipBtn>}
                                        <ChipBtn title="Add syllable after" onClick={() => addAfter(i)}>+</ChipBtn>
                                        <ChipBtn title="Delete syllable" onClick={() => deleteChip(i)}>✕</ChipBtn>
                                    </div>
                                )}
                            </div>
                            {/* Word-boundary toggle between chips */}
                            {i < syls.length - 1 && (
                                <button
                                    onClick={tapMode ? undefined : () => toggleBoundary(i)}
                                    title={boundary ? 'Word break (click to join)' : 'Joined (click to add space)'}
                                    disabled={tapMode}
                                    style={{
                                        width: boundary ? 10 : 4, alignSelf: 'stretch', minHeight: 26, margin: '0 1px',
                                        background: boundary ? 'rgba(159,172,202,0.22)' : 'var(--adm-cyan)', border: 'none',
                                        borderRadius: 2, cursor: tapMode ? 'default' : 'pointer', padding: 0,
                                    }}
                                />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Tap controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {!tapMode ? (
                    <Button size="sm" icon="play" onClick={startTapMode} disabled={!hasAudio || !audioReady}>
                        Play &amp; Tap timing
                    </Button>
                ) : (
                    <>
                        <Button variant="primary" onClick={recordTap} style={{ padding: '8px 26px', fontWeight: 700 }}>
                            TAP (Space)
                        </Button>
                        <Button size="sm" onClick={() => stopTapMode({ commitTaps: true })}>Stop &amp; keep</Button>
                        <Button variant="ghost" size="sm" onClick={() => stopTapMode({ commitTaps: false })}>Cancel</Button>
                        <span style={{ fontSize: 12, color: 'var(--adm-text-2)' }}>
                            {armed < syls.length ? `Tap syllable ${armed + 1} / ${syls.length}: “${trimmed(syls[armed]?.text) || '·'}”` : 'All tapped — stopping…'}
                        </span>
                    </>
                )}
                <button
                    onClick={reset}
                    disabled={tapMode}
                    style={{
                        background: 'none', border: 'none', fontSize: 12,
                        color: tapMode ? 'var(--adm-text-3)' : 'var(--adm-text-2)',
                        cursor: tapMode ? 'default' : 'pointer', textDecoration: 'underline',
                        fontFamily: 'var(--adm-body)',
                    }}
                >
                    Reset line
                </button>
                {!hasAudio && <span style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>No instrumental — numeric fine-tune only.</span>}
                {hasAudio && !audioReady && !tapMode && <span style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>Loading audio…</span>}
            </div>

            {/* Numeric fine-tune */}
            {!tapMode && (
                <details>
                    <summary className="adm-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="clock" size={11} /> Fine-tune timing (ms)
                    </summary>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        {syls.map((s, i) => (
                            <div key={i} style={{
                                display: 'flex', flexDirection: 'column', gap: 2, padding: 5,
                                border: '1px solid var(--adm-line)', borderRadius: 6, background: 'var(--adm-card)',
                            }}>
                                <span style={{ fontSize: 10, color: 'var(--adm-text-2)', textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trimmed(s.text) || '·'}</span>
                                <div style={{ display: 'flex', gap: 3 }}>
                                    <NumField label="start" value={s.startMs} onCommit={v => setTiming(i, 'startMs', v)} />
                                    <NumField label="dur" value={s.durMs} onCommit={v => setTiming(i, 'durMs', v)} />
                                </div>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    )
}

function ChipBtn({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: 16, height: 16, fontSize: 10, lineHeight: '14px', padding: 0,
                background: 'var(--adm-card-2)', border: '1px solid var(--adm-line)', borderRadius: 3,
                color: 'var(--adm-text-2)', cursor: 'pointer',
            }}
        >{children}</button>
    )
}

function NumField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
    const [v, setV] = useState(String(value))
    useEffect(() => { setV(String(value)) }, [value])
    return (
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 8, color: 'var(--adm-text-3)' }}>{label}</span>
            <input
                value={v}
                onChange={e => setV(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => { const n = parseInt(v, 10); if (!isNaN(n)) onCommit(n) }}
                className="adm-mono"
                style={{
                    width: 52, fontSize: 11, textAlign: 'center', color: 'var(--adm-text)',
                    background: 'var(--adm-well)', border: '1px solid var(--adm-line)',
                    borderRadius: 3, padding: '2px 0', outline: 'none',
                }}
            />
        </label>
    )
}
