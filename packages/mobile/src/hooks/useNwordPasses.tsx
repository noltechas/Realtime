import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  giftNwordPass,
  markNwordPassGiftSeen,
  subscribeToNwordPassGifts,
  type NwordPassGiftRow,
} from '@karaoke/shared'
import { supabase } from '../supabase/client'
import { useSession } from './useSession'
import { useForegroundEpoch } from './useAppForeground'

interface NwordPassContextValue {
  pendingGifts: NwordPassGiftRow[]
  pendingGift: NwordPassGiftRow | null
  unseenGift: NwordPassGiftRow | null
  sharePass: (recipientGuestId: string) => Promise<NwordPassGiftRow>
  acknowledgeGift: (giftId: string) => Promise<void>
}

const defaultValue: NwordPassContextValue = {
  pendingGifts: [],
  pendingGift: null,
  unseenGift: null,
  sharePass: async () => {
    throw new Error('Join a lobby before sharing an N-Word Pass.')
  },
  acknowledgeGift: async () => undefined,
}

const NwordPassContext =
  createContext<NwordPassContextValue>(defaultValue)

export function NwordPassProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { session } = useSession()
  const foregroundEpoch = useForegroundEpoch()
  const [pendingGifts, setPendingGifts] = useState<NwordPassGiftRow[]>([])

  useEffect(() => {
    const guestId = session?.guestId
    if (!guestId) {
      setPendingGifts([])
      return
    }

    return subscribeToNwordPassGifts(
      supabase,
      guestId,
      setPendingGifts,
    )
  }, [session?.guestId, foregroundEpoch])

  const sharePass = useCallback(
    async (recipientGuestId: string): Promise<NwordPassGiftRow> => {
      if (!session) {
        throw new Error('Join a lobby before sharing an N-Word Pass.')
      }
      return giftNwordPass(supabase, {
        sessionId: session.sessionId,
        giverGuestId: session.guestId,
        recipientGuestId,
      })
    },
    [session],
  )

  const acknowledgeGift = useCallback(async (giftId: string): Promise<void> => {
    // Optimistic local acknowledgement prevents the same reveal from replaying
    // if the Realtime UPDATE arrives a moment later.
    const now = new Date().toISOString()
    setPendingGifts(rows =>
      rows.map(row => (row.id === giftId ? { ...row, seen_at: now } : row)),
    )
    try {
      await markNwordPassGiftSeen(supabase, giftId)
    } catch {
      // The authoritative foreground refetch will retry presentation if the
      // acknowledgement truly failed.
    }
  }, [])

  const value = useMemo<NwordPassContextValue>(
    () => ({
      pendingGifts,
      pendingGift: pendingGifts[0] ?? null,
      unseenGift: pendingGifts.find(gift => !gift.seen_at) ?? null,
      sharePass,
      acknowledgeGift,
    }),
    [pendingGifts, sharePass, acknowledgeGift],
  )

  return (
    <NwordPassContext.Provider value={value}>
      {children}
    </NwordPassContext.Provider>
  )
}

export function useNwordPasses(): NwordPassContextValue {
  return useContext(NwordPassContext)
}
