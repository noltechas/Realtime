import type { LyricLine, Syllable } from '../audio/manager'

function timeToMs(mm: string, ss: string, fr?: string): number {
    const m = parseInt(mm, 10)
    const s = parseInt(ss, 10)
    if (!fr) return m * 60000 + s * 1000
    // Right-pad fractional digits to 3 (milliseconds): "34" -> "340" -> 340ms (i.e. 340 == centi*10)
    const padded = (fr + '000').slice(0, 3)
    const ms = parseInt(padded, 10)
    return m * 60000 + s * 1000 + ms
}

/** Parse a single LRC body — handles both standard and A2-enhanced (with <mm:ss.cc> word tags). */
function parseEnhancedBody(body: string, lineStartMs: number): LyricLine {
    const wordTagRe = /<(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?>/g
    const tags: { idx: number; len: number; ms: number }[] = []
    let m: RegExpExecArray | null
    while ((m = wordTagRe.exec(body)) !== null) {
        tags.push({ idx: m.index, len: m[0].length, ms: timeToMs(m[1], m[2], m[3]) })
    }
    if (tags.length === 0) {
        return { startTimeMs: lineStartMs, words: body.trim() }
    }

    const syllables: Syllable[] = []

    // Text before the first word-tag is sung at lineStartMs (if non-empty)
    const preText = body.slice(0, tags[0].idx)
    if (preText.length > 0 && /\S/.test(preText)) {
        syllables.push({ text: preText, startMs: lineStartMs, durMs: tags[0].ms - lineStartMs })
    }
    // Each tag marks the start of the text segment that follows it
    for (let i = 0; i < tags.length; i++) {
        const start = tags[i]
        const next = tags[i + 1]
        const segStart = start.idx + start.len
        const segEnd = next ? next.idx : body.length
        const text = body.slice(segStart, segEnd)
        if (!text) continue
        const durMs = next ? Math.max(0, next.ms - start.ms) : 0
        syllables.push({ text, startMs: start.ms, durMs })
    }

    const words = body.replace(/<[^>]*>/g, '').trim()
    const endTimeMs = tags[tags.length - 1].ms
    return {
        startTimeMs: lineStartMs,
        endTimeMs,
        words,
        syllables: syllables.length > 0 ? syllables : undefined,
    }
}

/** Parse LRC / Enhanced LRC. A line like `[00:17.12]Hey <00:17.40>guys` becomes one LyricLine with syllables[]. */
export function parseLrc(text: string): LyricLine[] {
    if (!text || typeof text !== 'string') return []
    const lines: LyricLine[] = []
    // Match a leading line-time tag, optionally followed by more grouped tags, then the body up to EOL.
    // Standard LRC supports multiple leading line tags meaning "this body appears at each of these times".
    const lineRe = /((?:\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\])+)\s*([^\r\n]*)/g
    let m: RegExpExecArray | null
    while ((m = lineRe.exec(text)) !== null) {
        const tagGroup = m[1]
        const body = m[2]
        if (!body || !/\S/.test(body)) continue
        const tagRe = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g
        let tm: RegExpExecArray | null
        while ((tm = tagRe.exec(tagGroup)) !== null) {
            const startMs = timeToMs(tm[1], tm[2], tm[3])
            lines.push(parseEnhancedBody(body, startMs))
        }
    }
    return lines.sort((a, b) => a.startTimeMs - b.startTimeMs)
}

// NetEase YRC files often start with 1-3 lines of CJK credit metadata
// (作词 / 作曲 / 编曲 / 制作人 / 混音 / 母带 / 出品人) timed at 0-3 seconds.
// These render as garbage on stage — drop them.
const YRC_CREDIT_RE = /作词|作曲|编曲|制作人|混音|母带|出品人|监制|和声|录音|吉他|贝斯|鼓|键盘/

// NetEase YRC sometimes includes Genius-style section markers as lyric lines
// ([Verse 1], [Chorus], <Refrain: Kanye West>, 【Produced by Kanye West】, etc.).
// These are structural metadata, not lyrics — they shouldn't appear on stage.
// Handles all three bracket styles ([...], <...>, 【...】) and section labels
// with optional artist annotations after a colon.
const SECTION_TAG_RE = /^\s*[<\[【](?:Verse|Chorus|Pre-?Chorus|Post-?Chorus|Bridge|Outro|Intro|Hook|Pre-?Hook|Post-?Hook|Refrain|Interlude|Skit|Coda|Part|Drop|Break|Solo|Instrumental|Produced by)\b[^>\]】]*[>\]】]\s*$/i

// Any line containing angle-bracket pairs is almost certainly metadata —
// either a song-title header ("Tame Impala -<The Less I Know the Better>")
// or an embedded annotation. Angle brackets aren't legitimate lyric
// punctuation, so any line with them gets dropped.
const ANGLE_BRACKET_RE = /<[^>]*>/

// "Artist Name - Song Title lyrics" style title headers some YRC files emit
// as their first lyric line. We can't validate the artist/title here at parse
// time, but the trailing "lyrics" keyword is a strong signal.
const LYRICS_HEADER_RE = /\blyrics\s*$/i

// Production / writing / sample credits that NetEase YRC sometimes emits as
// the first few "lyric" lines of a song (e.g. "Producer: Bink!", "Writers:
// Mike Dean/Carol King/...", "Sample: Father Stretch My Hands"). Also covers
// per-instrument outro credits (Billie Jean style: "Drums : Leon Ndugu...").
// Detection key is the role keyword at the very start of the line followed
// by a colon — distinguishes from lyrics that incidentally use colons
// ("She said:", "Treat my rap like Cali weed:", "New watch alert:" etc).
const CREDIT_LINE_RE = /^\s*(?:Producer|Producers|Co-?Producer|Co-?Producers|Additional Producer|Additional Producers|Executive Producer|Executive Producers|Writer|Writers|Composer|Composers|Lyricist|Lyricists|Sample|Samples|Sampled|Artist|Album|Song|Track|Title|Mixed|Mixed by|Mastered|Mastered by|Engineered|Engineered by|Engineer|Recorded|Recorded by|Featuring|Vocals|Background Vocals|Talkbox|Drums|Bass|Guitar|Keyboards|Piano|Lyricon|Rhodes Piano|Synthesizer|Synthesizers|Synthesizer Programming|String Arrangement|String Conducting|Arrangement|Conducting)\s*:/i

// Inline censorship: NetEase substitutes a vowel inside an explicit word with
// `!`, `-`, `x`, `*`, `#`, `@`, or `1` (e.g. "n!gga", "b-tch", "fxck", "sh1t").
// These are different from the run-of-asterisks pattern that mergeStarRuns
// handles (those are whole-word censorship; this is single-character).
// Detection preserves the leading letter's case.
const INLINE_CENSOR_C = '[!\\-xX*#@1]'
const INLINE_CENSOR_PATTERNS: Array<{ re: RegExp; fn: (...args: string[]) => string }> = [
    // nigga family (vowel "i" hidden)
    { re: new RegExp(`\\b([Nn])${INLINE_CENSOR_C}(gg[aA]s?)\\b`, 'g'), fn: (_, n, rest) => n + 'i' + rest },
    // bitch family (vowel "i" hidden)
    { re: new RegExp(`\\b([Bb])${INLINE_CENSOR_C}(tch(?:es|es')?)\\b`, 'g'), fn: (_, b, rest) => b + 'i' + rest },
    // shit family (vowel "i" hidden)
    { re: new RegExp(`\\b([Ss])h${INLINE_CENSOR_C}(t(?:s|ty)?)\\b`, 'g'), fn: (_, s, rest) => s + 'hi' + rest },
    // fuck family (vowel "u" hidden — fxck, f!ck, f-ck, etc.)
    { re: new RegExp(`\\b([Ff])${INLINE_CENSOR_C}(ck(?:in|ing|ed|er|ers|s)?)\\b`, 'g'), fn: (_, f, rest) => f + 'u' + rest },
    // pussy (vowel "u" hidden)
    { re: new RegExp(`\\b([Pp])${INLINE_CENSOR_C}(ssy)\\b`, 'g'), fn: (_, p, rest) => p + 'u' + rest },
    // motherfucker — the censor lives in the "fucker" segment after "mother"
    { re: new RegExp(`\\b([Mm])other${INLINE_CENSOR_C}(cker(?:s)?)\\b`, 'g'), fn: (_, m, rest) => m + 'otherfu' + rest },
    // ass (single censor before "s", as in "a-s", "a*s")
    { re: new RegExp(`\\b([Aa])${INLINE_CENSOR_C}s\\b`, 'g'), fn: (_, a) => a + 'ss' },
]

function stripInlineCensorship(s: string): string {
    let out = s
    for (const { re, fn } of INLINE_CENSOR_PATTERNS) out = out.replace(re, fn)
    return out
}

/** Parse NetEase YRC format. Each line: `[lineStartMs,lineDurMs](sylStartMs,sylDurMs,flag)text...` */
export function parseYrc(text: string): LyricLine[] {
    if (!text || typeof text !== 'string') return []
    const lines: LyricLine[] = []
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line) continue
        // Skip role/translation metadata JSON header lines
        if (line.startsWith('{')) continue
        // Skip standard ID3-style tags like [ti:Title], [ar:Artist]
        if (/^\[[a-zA-Z]+:/.test(line)) continue
        const lineMatch = line.match(/^\[(\d+),(\d+)\]/)
        if (!lineMatch) continue
        const startTimeMs = parseInt(lineMatch[1], 10)
        const durMs = parseInt(lineMatch[2], 10)
        const endTimeMs = startTimeMs + durMs
        const body = line.slice(lineMatch[0].length)
        const sylRe = /\((\d+),(\d+),\d+\)([^(]*)/g
        const syllables: Syllable[] = []
        const parts: string[] = []
        let sm: RegExpExecArray | null
        while ((sm = sylRe.exec(body)) !== null) {
            const sylText = sm[3]
            if (!sylText) continue
            // De-censor inline-substituted vowels (n!gga, b-tch, fxck, sh1t, etc.)
            // at parse time so the per-syllable text stays in sync with line.words.
            const cleanedSyl = stripInlineCensorship(sylText)
            syllables.push({
                text: cleanedSyl,
                startMs: parseInt(sm[1], 10),
                durMs: parseInt(sm[2], 10),
            })
            parts.push(cleanedSyl)
        }
        const words = parts.join('').trim()
        if (!words) continue
        if (YRC_CREDIT_RE.test(words)) continue
        if (SECTION_TAG_RE.test(words)) continue
        if (ANGLE_BRACKET_RE.test(words)) continue
        if (LYRICS_HEADER_RE.test(words)) continue
        if (CREDIT_LINE_RE.test(words)) continue
        lines.push({
            startTimeMs,
            endTimeMs,
            words,
            syllables: syllables.length > 0 ? syllables : undefined,
        })
    }
    return lines.sort((a, b) => a.startTimeMs - b.startTimeMs)
}

interface RichSyncEntry {
    ts: number              // line start in seconds
    te: number              // line end in seconds
    l?: { c: string; o: number }[]  // word chunks; o is seconds offset from ts
    x?: string              // full line text fallback
}

/** Parse Musixmatch RichSync JSON body. Reserved — wired in tier 2 once an API key is configured. */
export function parseRichSync(body: string | RichSyncEntry[]): LyricLine[] {
    let entries: RichSyncEntry[]
    if (typeof body === 'string') {
        try { entries = JSON.parse(body) } catch { return [] }
    } else {
        entries = body
    }
    if (!Array.isArray(entries)) return []
    const lines: LyricLine[] = []
    for (const e of entries) {
        if (typeof e?.ts !== 'number') continue
        const startTimeMs = Math.round(e.ts * 1000)
        const endTimeMs = typeof e.te === 'number' ? Math.round(e.te * 1000) : undefined
        const chunks = Array.isArray(e.l) ? e.l : []
        const syllables: Syllable[] = []
        const parts: string[] = []
        for (let i = 0; i < chunks.length; i++) {
            const c = chunks[i]
            const next = chunks[i + 1]
            if (typeof c?.c !== 'string' || typeof c?.o !== 'number') continue
            const sylStart = startTimeMs + Math.round(c.o * 1000)
            const sylEnd = next && typeof next.o === 'number'
                ? startTimeMs + Math.round(next.o * 1000)
                : (endTimeMs ?? sylStart)
            syllables.push({ text: c.c, startMs: sylStart, durMs: Math.max(0, sylEnd - sylStart) })
            parts.push(c.c)
        }
        const words = (parts.length > 0 ? parts.join('') : (e.x || '')).trim()
        if (!words) continue
        lines.push({
            startTimeMs,
            endTimeMs,
            words,
            syllables: syllables.length > 0 ? syllables : undefined,
        })
    }
    return lines.sort((a, b) => a.startTimeMs - b.startTimeMs)
}

export function hasSyllableTiming(lines: LyricLine[] | undefined | null): boolean {
    if (!lines) return false
    for (const l of lines) {
        if (l.syllables && l.syllables.length > 0) return true
    }
    return false
}
