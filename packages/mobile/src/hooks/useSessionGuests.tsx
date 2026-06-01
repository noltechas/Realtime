import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  subscribeToGuests,
  guestsById,
  type KaraokeGuestRow,
} from '@karaoke/shared'
import { supabase } from '../supabase/client'
import { useSession } from './useSession'

// Live `guestId -> guest` lookup for the active session. Singers reference
// guests by id, so every renderer (queue rows, stage, wizard, awards) resolves
// a singer's CURRENT name + avatar from this map via `resolveSinger`. That way
// a profile edit propagates everywhere without re-queueing. Provided once near
// the top of the in-session tree (SessionTabs) so the single realtime
// subscription is shared by all consumers.
const SessionGuestsContext = createContext<Map<string, KaraokeGuestRow>>(
  new Map(),
)

export function SessionGuestsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { session } = useSession()
  const [map, setMap] = useState<Map<string, KaraokeGuestRow>>(new Map())

  useEffect(() => {
    const sessionId = session?.sessionId
    if (!sessionId) {
      setMap(new Map())
      return
    }
    // subscribeToGuests does an initial fetch + realtime refresh and returns
    // an unsubscribe fn. It uses a unique channel name internally.
    const unsub = subscribeToGuests(supabase, sessionId, (rows) =>
      setMap(guestsById(rows)),
    )
    return unsub
  }, [session?.sessionId])

  return (
    <SessionGuestsContext.Provider value={map}>
      {children}
    </SessionGuestsContext.Provider>
  )
}

/** Live `guestId -> guest` map for the active session. */
export function useSessionGuests(): Map<string, KaraokeGuestRow> {
  return useContext(SessionGuestsContext)
}
