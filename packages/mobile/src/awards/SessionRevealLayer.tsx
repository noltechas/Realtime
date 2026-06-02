import React from 'react'
import type { AwardsRevealStep } from '@karaoke/shared'
import { RevealOverlay } from './RevealOverlay'
import { useSession } from '../hooks/useSession'
import { useSessionRow } from '../hooks/useSessionRow'

// Always-mounted awards reveal layer. It lives at the SessionTabs level (NOT
// inside the Awards tab) so the ceremony takes over the whole app the instant
// the host starts it — on whichever tab the guest happens to be on, and even
// if they just reopened the app while a reveal is already running.
//
// The step is read from the persisted `awards_reveal` column on the session
// row (host writes it on every step). `useSessionRow` does an authoritative
// initial fetch + live UPDATE subscription, so a late-joining device resumes
// the in-progress reveal instead of missing the ephemeral broadcast that the
// old (Awards-tab-only) subscription relied on.
export function SessionRevealLayer() {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  const raw = row?.awards_reveal ?? null
  // The host writes `null` (not an idle/done step) when the reveal ends, so a
  // non-null value is always an active step. The string cast keeps a defensive
  // guard against stale idle/done payloads without tripping the type checker
  // (AwardsRevealStep.phase doesn't model those terminal phases).
  const phase = raw ? (raw.phase as string) : null
  const step: AwardsRevealStep | null =
    raw && phase !== 'idle' && phase !== 'done' ? raw : null

  // Visibility is entirely host-controlled: the overlay appears when a reveal
  // step is present and disappears when the host ends it (awards_reveal →
  // null / idle). There's deliberately no manual dismiss — guests should
  // always be taken to the ceremony.
  return <RevealOverlay step={step} onDismiss={() => {}} />
}
