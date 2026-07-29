// ── No "You're Up!" callout on this theme ───────────────────────────────────
//
// This atom renders NOTHING, deliberately, and that is the whole file.
//
// The Stage screen's panel is a fixed-height stack — callout, album art, song
// title, artist, play button, the two FX toggles, Skip — with no scroll. This
// theme's type is set in Chicle at poster sizes and its controls are plates with
// heavy keylines, so the same stack runs taller here than anywhere else and the
// bottom of it was being pushed off the panel on a normal phone.
//
// The callout is also the least load-bearing thing in that stack. The screen only
// renders this branch when the guest is up (`guestIsUp`) and the stage is paused,
// and it already announces that: the guest's own song title sits directly below,
// under a play button the size of a fist. A cream panel shouting "You're Up!" on
// top of that spends the panel's tallest element on information the guest has.
//
// Returning null rather than omitting the atom is intentional — the screen falls
// back to a plain "You're Up!" heading when a theme doesn't provide one, which is
// the thing being removed.
export function PsychedelicYoureUpHero(): null {
  return null
}
