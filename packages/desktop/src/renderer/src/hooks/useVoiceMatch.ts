import { useEffect, useState } from 'react'

// Singer voice profiles (stored by the main process, main/voices.ts) and a
// song's measured part profiles (meta.vocalProfile), for audio/voiceMatch.ts.

/** Same normalization the main process keys profiles by. */
export function voiceKey(name: string): string {
    return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function useVoiceProfiles(): Record<string, VoiceProfile> {
    const [profiles, setProfiles] = useState<Record<string, VoiceProfile>>({})
    useEffect(() => {
        const api = window.electronAPI
        if (!api?.voiceList) return
        let cancelled = false
        api.voiceList().then(p => { if (!cancelled) setProfiles(p || {}) }).catch(() => { })
        const h = api.onVoiceUpdated(p => setProfiles(p || {}))
        return () => {
            cancelled = true
            api.offVoiceUpdated(h)
        }
    }, [])
    return profiles
}

export function useSongVocalProfile(trackId: string | null | undefined): any | null {
    const [profile, setProfile] = useState<any | null>(null)
    useEffect(() => {
        setProfile(null)
        if (!trackId || !window.electronAPI?.getVocalProfile) return
        let cancelled = false
        window.electronAPI.getVocalProfile(trackId).then(p => { if (!cancelled) setProfile(p) }).catch(() => { })
        return () => { cancelled = true }
    }, [trackId])
    return profile
}

/** A singer's voice profile: same guest this session, else the same name. */
export function findVoiceProfile(
    profiles: Record<string, VoiceProfile>,
    singer: { guestId?: string; name?: string },
    resolvedName?: string,
): VoiceProfile | null {
    const list = Object.values(profiles)
    if (singer.guestId) {
        const byGuest = list.find(p => p.guestId === singer.guestId)
        if (byGuest) return byGuest
    }
    const name = resolvedName || singer.name
    return name ? profiles[voiceKey(name)] ?? null : null
}
