import { useCallback, useEffect, useState } from 'react'
import { listCatalog, shuffleCatalog, type KaraokeCatalogRow } from '@karaoke/shared'
import { supabase } from '../supabase/client'

interface UseCatalogResult {
  catalog: KaraokeCatalogRow[]
  loading: boolean
  refresh: () => Promise<void>
}

export function useCatalog(sessionId: string | undefined): UseCatalogResult {
  const [catalog, setCatalog] = useState<KaraokeCatalogRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const rows = await listCatalog(supabase, sessionId)
      // Mirrors the companion site: randomize so the same tracks don't
      // always sit at the top of the list across sessions.
      setCatalog(shuffleCatalog(rows))
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { catalog, loading, refresh }
}
