// Shared types for the awards system. Mirror the karaoke_awards /
// karaoke_award_votes / karaoke_award_results Supabase schema.

export type AwardSubjectType = 'performance' | 'singer' | 'group'

export type AwardSlug = 'best-performance' | 'singer-of-the-night' | 'best-duo-group'

export interface Award {
    id: string
    sessionId: string
    slug: AwardSlug | null
    title: string
    subjectType: AwardSubjectType
    iconId: string | null
    iconDataUrl: string | null
    isDefault: boolean
    createdByGuestId: string | null
    finalizedAt: string | null
    createdAt: string
    updatedAt: string
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

// Tally snapshot used for the admin's live preview AND for the reveal payload.
export interface AwardTally {
    awardId: string
    votes: AwardVote[]                 // detailed vote rows (admin only)
    byCandidate: Array<{
        candidate: AwardCandidate | null  // null = candidate no longer resolvable (deleted)
        count: number
    }>
    winners: AwardCandidate[]          // could be 0 (no votes) or >1 (tie)
    totalVotes: number
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
    | 'opening'      // intro card ("Tonight's Awards")
    | 'nominees'     // show award title + candidate names
    | 'drumroll'     // build-up
    | 'winner'       // reveal winner(s) with confetti
    | 'finale'       // montage of all winners
    | 'done'         // teardown
    | 'idle'         // not active

export interface RevealStep {
    phase: RevealPhase
    awardIndex: number               // 0-based among the award list
    totalAwards: number
    award?: Award                    // populated for nominees/drumroll/winner
    candidates?: AwardCandidate[]    // nominees being considered (for nominees phase)
    winners?: AwardCandidate[]       // who won (may be empty -> "no winner")
    voteCount?: number               // only on winner phase
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
    nominees: 2500,
    drumroll: 2000,
    winner: 4500,
    gap: 800,            // pause between awards
    finale: 5000,
    done: 1500
} as const
