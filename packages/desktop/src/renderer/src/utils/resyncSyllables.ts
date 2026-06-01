import type { Syllable, LyricLine } from '../context/AppContext'

/**
 * Reconcile a lyric line's per-syllable timing with its authoritative `words`
 * text. The on-stage renderer (KaraokePage) shows `syllables[].text` when a line
 * has syllable timing, so if `words` is edited (de-censoring, typo fix, the
 * /add-song skill's post-import corrections) without rewriting the syllables,
 * the stage shows the STALE syllable text ("****", "n!gga", missing spaces).
 *
 * `resyncSyllables(syllables, words)` returns a new syllable array whose joined
 * text equals `words`, while preserving NetEase/Musixmatch timing as closely as
 * possible:
 *   - words unchanged from the syllables  → returned untouched (no-op).
 *   - one corrected word per timing group → only the changed word is rebuilt;
 *                                           unchanged words keep their exact
 *                                           sub-syllable timing.
 *   - syllables with no spaces, one/word  → each word mapped onto one slot.
 *   - word count changed (added/removed)  → whole line spread across the slots
 *                                           proportional to each slot's dur.
 *
 * Mirror of the JS copy in packages/desktop/scripts/lib/syllable-sync.js —
 * keep the two in sync.
 */

function normSpace(s: string): string {
    return (s || '').replace(/\s+/g, ' ').trim()
}

// Spread one corrected word across N timing slots, preserving each slot's
// startMs/durMs. Returns up to N syllables (fewer if the word has fewer chars
// than there are slots — extra slots' durations fold into the previous chunk).
function distributeWord(word: string, slots: Syllable[]): Syllable[] {
    const n = slots.length
    if (n <= 1) return [{ ...slots[0], text: word }]
    const chars = Array.from(word)
    if (chars.length <= 1) {
        const start = slots[0].startMs
        const end = slots[n - 1].startMs + slots[n - 1].durMs
        return [{ text: word, startMs: start, durMs: Math.max(0, end - start) }]
    }
    const out: Syllable[] = []
    const base = Math.floor(chars.length / n)
    const extra = chars.length - base * n // first `extra` slots take one more char
    let idx = 0
    for (let i = 0; i < n; i++) {
        const take = base + (i < extra ? 1 : 0)
        if (take === 0) {
            // No chars left for this slot — fold its time into the previous chunk.
            if (out.length > 0) {
                const prev = out[out.length - 1]
                prev.durMs = (slots[i].startMs + slots[i].durMs) - prev.startMs
            }
            continue
        }
        out.push({ text: chars.slice(idx, idx + take).join(''), startMs: slots[i].startMs, durMs: slots[i].durMs })
        idx += take
    }
    return out
}

// Fallback for word-count-changing edits: spread the whole corrected line across
// the existing slots, weighted by each slot's duration. Not word-aligned, but
// keeps the timing envelope and guarantees the joined text equals `text`.
function distributeLine(text: string, slots: Syllable[]): Syllable[] {
    const chars = Array.from(text)
    const totalDur = slots.reduce((a, s) => a + Math.max(0, s.durMs), 0) || slots.length
    const out: Syllable[] = []
    let idx = 0
    let acc = 0
    for (let i = 0; i < slots.length; i++) {
        const isLast = i === slots.length - 1
        let take: number
        if (isLast) {
            take = chars.length - idx
        } else {
            acc += (Math.max(0, slots[i].durMs) / totalDur) * chars.length
            take = Math.min(Math.max(0, Math.round(acc) - idx), chars.length - idx)
        }
        if (take <= 0 && !isLast) continue
        out.push({ text: chars.slice(idx, idx + take).join(''), startMs: slots[i].startMs, durMs: slots[i].durMs })
        idx += take
    }
    if (idx < chars.length && out.length) out[out.length - 1].text += chars.slice(idx).join('')
    return out.filter(s => s.text.length > 0)
}

/** Returns syllables re-synced to `words`, or the original array when already in sync. */
export function resyncSyllables(syllables: Syllable[], words: string): Syllable[] {
    if (!Array.isArray(syllables) || syllables.length === 0) return syllables
    const target = normSpace(words)
    if (!target) return syllables // never blow away timing for an empty words field
    const joined = syllables.map(s => s.text || '').join('')
    if (joined.trim() === (words || '').trim()) return syllables // already in sync

    // Group slots into words by trailing whitespace.
    const groups: Syllable[][] = []
    let cur: Syllable[] = []
    for (const s of syllables) {
        cur.push(s)
        if (/\s$/.test(s.text || '')) { groups.push(cur); cur = [] }
    }
    if (cur.length) groups.push(cur)

    const targetWords = target.split(' ')

    // Best case: one timing group per word → rebuild only the words that changed.
    if (groups.length === targetWords.length) {
        const result: Syllable[] = []
        for (let i = 0; i < groups.length; i++) {
            const g = groups[i]
            const tw = targetWords[i]
            const isLast = i === groups.length - 1
            if (g.map(s => s.text || '').join('').trim() === tw) {
                for (const s of g) result.push({ ...s })
            } else {
                for (const s of distributeWord(tw, g)) result.push(s)
            }
            const lastSlot = result[result.length - 1]
            if (isLast) lastSlot.text = (lastSlot.text || '').replace(/\s+$/, '')
            else if (!/\s$/.test(lastSlot.text || '')) lastSlot.text = (lastSlot.text || '') + ' '
        }
        return result
    }

    // Spaceless one-slot-per-word source (e.g. "You'vebeentelling...").
    if (syllables.length === targetWords.length) {
        return syllables.map((s, i) => ({ ...s, text: targetWords[i] + (i < syllables.length - 1 ? ' ' : '') }))
    }

    // Word count changed — proportional spread across all slots.
    return distributeLine(target, syllables)
}

/**
 * Derive per-syllable start/duration from tap-along timing. `tapStarts[i]` is the
 * absolute ms a tap assigned to syllable i (or null if untapped). Tapped starts are
 * used as-is; the untapped tail is interpolated across (lastTappedStart .. nextBoundary)
 * weighted by each remaining syllable's original duration. Starts are forced strictly
 * monotonic and every duration is clamped to `minMs`. Text is preserved verbatim so
 * the words↔syllables join contract is untouched. Mirror of the JS copy in
 * packages/desktop/scripts/lib/syllable-sync.js.
 */
export function deriveTapTimings(base: Syllable[], tapStarts: (number | null)[], nextBoundary: number, minMs = 60): Syllable[] {
    const n = base.length
    const tappedIdx = tapStarts.map((s, i) => (s != null ? i : -1)).filter(i => i >= 0)
    if (tappedIdx.length === 0) return base.map(s => ({ ...s }))
    const lastTapped = tappedIdx[tappedIdx.length - 1]
    const newStarts: number[] = new Array(n)
    for (let i = 0; i <= lastTapped; i++) {
        newStarts[i] = tapStarts[i] != null ? (tapStarts[i] as number) : (i > 0 ? newStarts[i - 1] + minMs : base[i].startMs)
    }
    if (lastTapped < n - 1) {
        const anchor = newStarts[lastTapped]
        const window = Math.max(minMs * (n - lastTapped), nextBoundary - anchor)
        const weights = base.slice(lastTapped, n).map(s => Math.max(1, s.durMs))
        const sumW = weights.reduce((a, b) => a + b, 0)
        let cum = 0
        for (let i = lastTapped + 1; i < n; i++) {
            cum += weights[i - 1 - lastTapped]
            newStarts[i] = Math.round(anchor + window * (cum / sumW))
        }
    }
    for (let i = 1; i < n; i++) if (newStarts[i] <= newStarts[i - 1]) newStarts[i] = newStarts[i - 1] + minMs
    return base.map((s, i) => {
        const start = newStarts[i]
        const end = i < n - 1 ? newStarts[i + 1] : Math.max(nextBoundary, start + minMs)
        return { ...s, startMs: start, durMs: Math.max(minMs, end - start) }
    })
}

/** Re-sync every line in a lyric array that has syllable timing. Returns a new array. */
export function resyncLyrics(lyrics: LyricLine[]): LyricLine[] {
    return lyrics.map(line => {
        if (!line.syllables || line.syllables.length === 0) return line
        const synced = resyncSyllables(line.syllables, line.words)
        return synced === line.syllables ? line : { ...line, syllables: synced }
    })
}
