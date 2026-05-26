import React from 'react'

// Urban has no decorative page backdrop — the void-black appBg plus the
// jagged tab-bar polygon are the entire visual chrome. Returns null so the
// dispatcher mounts nothing behind screen content.
export function Backdrop(): React.ReactElement | null {
  return null
}
