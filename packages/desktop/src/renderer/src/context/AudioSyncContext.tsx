import { createContext, useContext } from 'react'
import { useAudioSync, AudioSyncState } from '../hooks/useAudioSync'

const AudioSyncContext = createContext<AudioSyncState | null>(null)

export function AudioSyncProvider({ children }: { children: React.ReactNode }) {
    const audioSync = useAudioSync()
    return (
        <AudioSyncContext.Provider value={audioSync}>
            {children}
        </AudioSyncContext.Provider>
    )
}

export function useAudioSyncContext(): AudioSyncState {
    const ctx = useContext(AudioSyncContext)
    if (!ctx) throw new Error('useAudioSyncContext must be used within AudioSyncProvider')
    return ctx
}
