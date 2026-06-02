// Shared types for the awards system. Mirror the karaoke_awards /
// karaoke_award_votes / karaoke_award_results Supabase schema.

export type AwardSubjectType = 'performance' | 'singer' | 'group'

export type AwardSlug = 'best-performance' | 'singer-of-the-night' | 'best-duo-group'

export interface Award {
    id: string
    sessionId: string
    slug: AwardSlug | null
    title: string
    description: string
    subjectType: AwardSubjectType
    iconId: string | null
    iconDataUrl: string | null
    isDefault: boolean
    createdByGuestId: string | null
    finalizedAt: string | null
    createdAt: string
    updatedAt: string
    // Admin manual per-candidate score adjustments: subjectKey -> point delta.
    scoreAdjustments: Record<string, number>
}

// A vote cast by a single guest on a single award. Exactly one of
// `subjectQueueRowId` / `subjectGuestId` is populated based on the award's
// `subjectType`.
export interface AwardVote {
    id: string
    awardId: string
    voterGuestId: string
    subjectQueueRowId: string | null
    subjectGuestId: string | null
    // Ranked ballot position: 1 = first place (3 pts), 2 = second (2), 3 = third (1).
    rank: number
    createdAt: string
    updatedAt: string
}

// A candidate that a guest can vote on. Synthesized client-side from the
// queue history / guest list — not a DB-backed entity. `subjectKey` is a
// stable identifier the voter uses to pick this candidate.
export interface AwardCandidate {
    subjectKey: string                 // queue row id OR guest id
    subjectType: AwardSubjectType
    label: string                      // primary display text
    subtitle?: string                  // optional secondary line
    avatarUrl?: string | null          // profile picture or album art
    accent?: string | null             // colour stripe for theming
    singers?: Array<{ name: string; color?: string; profilePicture?: string | null }>
    trackName?: string
    trackArtist?: string
    // Used by self-vote prevention: the set of guest IDs / names that
    // appear "in" this candidate. If the voter matches, the vote is blocked.
    bannedVoterGuestIds?: string[]
    bannedVoterNames?: string[]
}

// A candidate's standing in an award: weighted score plus the per-rank
// breakdown used for display and tie-breaking.
export interface AwardStanding {
    candidate: AwardCandidate | null   // null = candidate no longer resolvable (deleted)
    subjectKey: string
    score: number                      // weighted points (3/2/1) incl. admin adjustment
    adjustment: number                 // the admin manual delta applied
    firstPlaceVotes: number
    secondPlaceVotes: number
    thirdPlaceVotes: number
    totalVotes: number                 // distinct ballots that ranked this candidate
}

// Tally snapshot used for the admin's live preview AND for the reveal payload.
// Ranked-ballot scoring: 1st = 3 pts, 2nd = 2, 3rd = 1. Winner is the highest
// score, ties broken by 1st-place votes (then 2nd, then 3rd).
export interface AwardTally {
    awardId: string
    votes: AwardVote[]                 // detailed vote rows (admin only)
    standings: AwardStanding[]         // sorted best-first
    finalists: AwardStanding[]         // top ≤3 with score > 0
    winner: AwardStanding | null       // single winner (null = no votes)
    totalBallots: number               // distinct voters who ranked anyone
}

// Persisted reveal result (one row per winner per award).
export interface AwardResult {
    id: string
    awardId: string
    sessionId: string
    sessionCode: string
    rank: number
    winnerLabel: string
    winnerSubtitle: string | null
    winnerAvatarUrl: string | null
    winnerMeta: Record<string, unknown> | null
    voteCount: number
    createdAt: string
}

// --- Reveal sequencing -----------------------------------------------------
// Broadcast over the `ar-{sessionId}` realtime channel. Stage and companion
// both render the same view from this payload.
export type RevealPhase =
    | 'opening'      // show ("Tonight's Awards")
    | 'overview'     // all awards floating (icon + name) before going one-by-one
    | 'intro'        // introduce ONE award: logo + title + description citation
    | 'finalist'     // spotlight ONE top-3 finalist (random order, one at a time)
    | 'lineup'       // all ≤3 finalists shown together in a row
    | 'winner'       // the winning finalist grows full-screen + stats
    | 'finale'       // montage of all winners
    | 'done'         // teardown
    | 'idle'         // not active

// A finalist's payload for the spotlight phase: the candidate, their stats,
// and (for singer awards) the list of songs they sang, scrolled on stage.
export interface RevealFinalist {
    candidate: AwardCandidate
    score: number
    firstPlaceVotes: number
    totalVotes: number
    order: number                    // 0-based reveal order (already randomized)
    count: number                    // how many finalists this award has
    songs?: Array<{ trackName: string; trackArtist: string; artUrl: string | null }>
}

export interface RevealStep {
    phase: RevealPhase
    awardIndex: number               // 0-based among the award list
    totalAwards: number
    award?: Award                    // populated for finalist/lineup/winner
    overview?: Award[]               // all awards (icon + name) for the overview phase
    finalist?: RevealFinalist        // for the finalist spotlight phase
    lineup?: AwardCandidate[]        // the ≤3 finalists (lineup + winner phases)
    winners?: AwardCandidate[]       // who won (may be empty -> "no winner")
    winnerKey?: string               // subjectKey of the winner (for the grow)
    winnerStats?: { score: number; firstPlaceVotes: number; totalVotes: number }
    voteCount?: number               // winner score (kept for back-compat)
    finaleSummary?: Array<{          // for finale phase
        award: Award
        winners: AwardCandidate[]
    }>
    startedAt: string                // ISO timestamp the sequencer used
}

// Phase timings (ms). Single source of truth so admin sequencer and stage
// animation agree.
export const REVEAL_TIMING = {
    opening: 3000,
    finalist: 5200,     // per finalist spotlight (songs scroll here)
    lineup: 3200,       // all finalists in a row
    winner: 6500,       // winner grows full-screen + stats linger
    gap: 900,           // pause between awards
    finale: 5000,
    done: 1500
} as const
