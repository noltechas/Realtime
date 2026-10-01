import type { LyricLine, Singer } from '../context/AppContext'

// "Fill-in" vocals: when a multi-singer song is performed with some parts
// unclaimed (a duet with one guest), the original artist sings the parts
// nobody took. AudioEngine plays the vocal stem on the main output and opens
// it only inside these segments.
//
// A line is unclaimed by the same rule the stage uses to color lyrics
// (KaraokePage groupedLyrics): a real role index that no singer's roleIndices
// include. roleIndex -1 ("everyone") and lines without a role belong to the
// guests.

export interface FillSegment {
    startMs: number
    endMs: number
}

/** Gate fade time; segment edges are placed so a fade finishes before a guest's line. */
export const FILL_FADE_MS = 90
// Open a hair early (a lyric's start can trail its first sound) and let the
// last word ring out.
const PRE_ROLL_MS = 120
const POST_ROLL_MS = 280
// Keep the part open across a breath between two of its own lines, so ad-libs
// and pickups in between aren't chopped.
const MERGE_GAP_MS = 1500
const MIN_SEGMENT_MS = 250

type SingerRoles = Pick<Singer, 'roleIndices'>

export function computeFillSegments(
    lyrics: LyricLine[] | undefined,
    roles: string[] | undefined,
    singers: SingerRoles[] | undefined,
): FillSegment[] {
    if (!lyrics || lyrics.length === 0 || !roles || roles.length < 2 || !singers || singers.length === 0) return []
    // A singer with no assigned part sings the whole song — nothing to fill.
    if (singers.some(s => !s.roleIndices || s.roleIndices.length === 0)) return []

    const claimed = new Set<number>()
    for (const s of singers) for (const r of s.roleIndices!) claimed.add(r)
    const unclaimed = (l: LyricLine) =>
        typeof l.roleIndex === 'number' && l.roleIndex >= 0 && l.roleIndex < roles.length && !claimed.has(l.roleIndex)

    const lines = [...lyrics].sort((a, b) => a.startTimeMs - b.startTimeMs)
    if (lines.every(l => !unclaimed(l))) return []

    const endOf = (k: number): number => {
        const l = lines[k]
        if (typeof l.endTimeMs === 'number' && l.endTimeMs > l.startTimeMs) return l.endTimeMs
        const next = lines.slice(k + 1).find(n => n.startTimeMs > l.startTimeMs)
        return next ? next.startTimeMs : l.startTimeMs + 4000
    }
    const guestSpans = lines
        .map((l, k) => ({ l, k }))
        .filter(({ l }) => !unclaimed(l))
        .map(({ l, k }) => ({ start: l.startTimeMs, end: endOf(k) }))
    // Lines sharing a start time are sung together (call-and-response pairs);
    // if a guest has one of them, the guest is singing that moment.
    const guestStarts = new Set(guestSpans.map(g => g.start))

    const raw: FillSegment[] = []
    lines.forEach((l, k) => {
        if (!unclaimed(l) || guestStarts.has(l.startTimeMs)) return
        const lineEnd = endOf(k)
        let start = l.startTimeMs - PRE_ROLL_MS
        let end = lineEnd + POST_ROLL_MS
        for (const g of guestSpans) {
            if (g.start > l.startTimeMs) {
                // A guest line after this one: be fully faded out by its start.
                end = Math.min(end, g.start - FILL_FADE_MS)
            } else if (g.end > start) {
                // A guest line still sounding as this one begins: wait for it.
                start = Math.max(start, Math.min(g.end, lineEnd))
            }
        }
        if (end - start >= MIN_SEGMENT_MS) raw.push({ startMs: Math.max(0, start), endMs: end })
    })

    const merged: FillSegment[] = []
    for (const seg of raw) {
        const prev = merged[merged.length - 1]
        const guestInGap = prev && guestSpans.some(g => g.start > prev.endMs && g.start < seg.startMs)
        if (prev && seg.startMs - prev.endMs < MERGE_GAP_MS && !guestInGap) {
            prev.endMs = Math.max(prev.endMs, seg.endMs)
        } else {
            merged.push({ ...seg })
        }
    }
    return merged
}

/** True if `timeMs` falls inside a segment (segments sorted, non-overlapping). */
export function inFillSegment(segments: FillSegment[], timeMs: number): boolean {
    let lo = 0, hi = segments.length - 1
    while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const s = segments[mid]
        if (timeMs < s.startMs) hi = mid - 1
        else if (timeMs >= s.endMs) lo = mid + 1
        else return true
    }
    return false
}
