import { useCallback, useEffect, useState } from 'react'

// Live view of the main-process song generation queue (src/main/autogen.ts).
export function useAutogen() {
    const [status, setStatus] = useState<AutogenStatus | null>(null)

    useEffect(() => {
        const api = window.electronAPI
        if (!api?.autogenStatus) return
        let cancelled = false
        api.autogenStatus().then(s => { if (!cancelled) setStatus(s) }).catch(() => { })
        const handler = api.onAutogenUpdate(s => setStatus(s))
        return () => {
            cancelled = true
            api.offAutogenUpdate(handler)
        }
    }, [])

    const jobFor = useCallback(
        (trackId: string): AutogenJob | undefined => status?.jobs.find(j => j.trackId === trackId),
        [status],
    )

    const enqueue = useCallback((input: AutogenTrackInput) => {
        window.electronAPI.autogenEnqueue(input).then(setStatus).catch(() => { })
    }, [])

    return {
        status,
        jobFor,
        enqueue,
        cancel: (trackId: string) => window.electronAPI.autogenCancel(trackId),
        retry: (trackId: string) => window.electronAPI.autogenRetry(trackId),
        dismiss: (trackId: string) => window.electronAPI.autogenDismiss(trackId),
    }
}

// Reload a catalog whenever the generator lands a new song.
export function useAutogenSongReady(onReady: (trackId: string) => void) {
    useEffect(() => {
        const api = window.electronAPI
        if (!api?.onAutogenSongReady) return
        const handler = api.onAutogenSongReady(onReady)
        return () => api.offAutogenSongReady(handler)
    }, [onReady])
}

export const AUTOGEN_STAGE_LABEL: Record<AutogenStage, string> = {
    queued: 'Queued',
    resolving: 'Looking up track',
    searching: 'Finding the recording',
    downloading: 'Downloading',
    separating: 'Separating vocals',
    importing: 'Importing lyrics',
    analyzing: 'Detecting key',
    tuning: 'Claude is tuning it',
    ready: 'Ready',
    failed: 'Failed',
}

export function isAutogenActive(job: AutogenJob | undefined): boolean {
    return !!job && job.stage !== 'ready' && job.stage !== 'failed'
}
