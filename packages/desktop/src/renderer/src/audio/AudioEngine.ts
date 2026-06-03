/**
 * AudioEngine — Simple HTMLAudioElement wrapper for karaoke instrumental playback.
 *
 * Uses the native `timeupdate` event for lyrics sync (fires ~4x/sec — plenty for lyrics).
 * Uses `file://` URLs which work directly with <audio> elements in Electron.
 */

export class AudioEngine {
    private audio: HTMLAudioElement
    // The vocal `<audio>` element is created lazily on the first song with
    // vocals, then **reused across every subsequent song**. Recreating the
    // element on song boundaries forced Chromium to open a fresh OS audio
    // stream each time, which on Bluetooth monitors (AirPods etc.) meant
    // a full A2DP renegotiation — and audibly different latency per song.
    // Keeping the element + its sinkId around lets the OS hold the audio
    // handle warm so latency stays much more consistent.
    private vocalAudio: HTMLAudioElement | null = null
    private onTimeUpdate: ((timeMs: number) => void) | null = null
    private onEnded: (() => void) | null = null
    private _loaded = false
    private _intendedPlayState = false
    private _vocalOffsetMs = 0
    // AbortController tied to the in-flight load() call. Aborting cleans up
    // canplaythrough/error listeners attached to the persistent audio
    // elements so they can't resolve a stale (superseded) load Promise.
    private _loadAbort: AbortController | null = null

    constructor() {
        this.audio = new Audio()
        this.audio.preload = 'auto'

        // Prevent OS device disconnections (like AirPods) from pausing the primary track randomly
        this.audio.addEventListener('pause', () => {
            if (this._intendedPlayState) this.audio.play().catch(() => { })
        })

        // Native timeupdate fires ~4 times per second — reliable and battery-friendly
        this.audio.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) {
                this.onTimeUpdate(this.audio.currentTime * 1000)
            }
        })

        this.audio.addEventListener('ended', () => {
            this._intendedPlayState = false // Don't let pause handler restart when track ends naturally
            if (this.onTimeUpdate) {
                this.onTimeUpdate(this.durationMs)
            }
            if (this.onEnded) {
                this.onEnded()
            }
        })
    }

    get isPlaying() { return !this.audio.paused }
    get currentTimeMs() { return this.audio.currentTime * 1000 }
    get durationMs() { return (this.audio.duration || 0) * 1000 }
    get isLoaded() { return this._loaded }

    setOnTimeUpdate(cb: (timeMs: number) => void) {
        this.onTimeUpdate = cb
    }

    setOnEnded(cb: () => void) {
        this.onEnded = cb
    }
    async load(stems: { instrumental?: string, vocals?: string }, monitorDeviceIds: string[] = []): Promise<void> {
        // Abort listeners attached by any prior in-flight load() so a stale
        // canplaythrough/error event can't resolve the previous Promise.
        this._loadAbort?.abort()
        this._loadAbort = new AbortController()
        const signal = this._loadAbort.signal

        return new Promise((resolve, reject) => {
            this.audio.src = stems.instrumental ? `file://${stems.instrumental}` : ''

            if (stems.vocals) {
                // Create the persistent vocal element exactly once, the first
                // time a song with vocals loads. After that, we just swap src
                // on the same element — sinkId, listeners, and the underlying
                // OS audio stream survive the song boundary.
                if (!this.vocalAudio) {
                    this.vocalAudio = new Audio()
                    this.vocalAudio.preload = 'auto'
                    this.vocalAudio.muted = true
                    // Prevent OS device disconnections (AirPods etc.) from
                    // pausing the vocal track.
                    this.vocalAudio.addEventListener('pause', () => {
                        if (this._intendedPlayState && this.vocalAudio) {
                            this.vocalAudio.play().catch(() => { })
                        }
                    })
                }
                this.vocalAudio.src = `file://${stems.vocals}`

                const deviceId = monitorDeviceIds[0] || ''
                if (deviceId) {
                    this.vocalAudio.muted = false
                    // Only call setSinkId when the device actually changed —
                    // a no-op setSinkId on Bluetooth can still trigger a
                    // brief A2DP renegotiation we'd rather avoid.
                    const currentSink = (this.vocalAudio as unknown as { sinkId?: string }).sinkId
                    if (currentSink !== deviceId) {
                        void this._applyVocalSink(deviceId)
                    }
                } else {
                    this.vocalAudio.muted = true
                }
            } else if (this.vocalAudio) {
                // This song has no vocals. Pause + clear src but keep the
                // element around for whatever song comes next.
                this.vocalAudio.pause()
                this.vocalAudio.removeAttribute('src')
            }

            const elementsToWait: HTMLAudioElement[] = []
            if (this.audio.src) elementsToWait.push(this.audio)
            if (this.vocalAudio && this.vocalAudio.src) elementsToWait.push(this.vocalAudio)

            if (elementsToWait.length === 0) {
                this._loaded = true
                resolve()
                return
            }

            let loadedCount = 0
            const markDone = () => {
                if (signal.aborted) return
                loadedCount++
                if (loadedCount === elementsToWait.length) {
                    this._loaded = true
                    resolve()
                }
            }

            elementsToWait.forEach(audioEl => {
                let done = false
                const onReady = () => {
                    if (done || signal.aborted) return
                    done = true
                    markDone()
                }
                audioEl.addEventListener('canplaythrough', onReady, { once: true, signal })
                audioEl.addEventListener('error', () => {
                    if (done || signal.aborted) return
                    reject(new Error(`Failed to load audio: ${audioEl.src}`))
                }, { once: true, signal })
                // CRITICAL: always (re)load after swapping `.src`. These <audio>
                // elements are REUSED across songs, and `readyState` reflects the
                // PREVIOUS source until the new load completes — assigning `.src`
                // does NOT reset it synchronously. Trusting `readyState >= 4` and
                // skipping `.load()` meant a reused element still buffered with the
                // last song reported "ready", resolved this promise, and kept
                // playing the OLD audio while the lyrics (driven by React state)
                // already showed the new song. Forcing load() + waiting for
                // canplaythrough guarantees the element is on the new source
                // before we report it loaded.
                audioEl.load()
                // Safety net for the rare case canplaythrough never arrives for a
                // local file: after load() has had time to re-fetch, readyState
                // genuinely reflects the NEW source (load() reset it above), so a
                // delayed HAVE_FUTURE_DATA check is safe (unlike a synchronous one).
                setTimeout(() => {
                    if (audioEl.readyState >= 3) onReady()
                }, 5000)
            })
        })
    }

    play() {
        this._intendedPlayState = true
        if (this._loaded) {
            this.audio.play().catch(() => { })
            if (this.vocalAudio) {
                this._syncVocalToOffset()
                this.vocalAudio.play().catch(() => { })
            }
        }
    }

    pause() {
        this._intendedPlayState = false
        this.audio.pause()
        if (this.vocalAudio) this.vocalAudio.pause()
    }

    seek(timeMs: number) {
        const t = Math.max(0, timeMs / 1000)
        this.audio.currentTime = t
        if (this.vocalAudio) {
            const vocalT = Math.max(0, t + this._vocalOffsetMs / 1000)
            this.vocalAudio.currentTime = Math.min(vocalT, this.vocalAudio.duration || vocalT)
        }
        if (this.onTimeUpdate) this.onTimeUpdate(t * 1000)
    }

    setVolume(vol: number) {
        const clamped = Math.max(0, Math.min(1, vol))
        this.audio.volume = clamped
    }

    setVocalVolume(vol: number) {
        if (this.vocalAudio) {
            const clamped = Math.max(0, Math.min(1, vol))
            this.vocalAudio.volume = clamped
        }
    }

    setMainSinkId(deviceId: string) {
        if (typeof (this.audio as any).setSinkId === 'function') {
            ; (this.audio as any).setSinkId(deviceId).catch((e: any) => console.warn('Failed to set main sinkId', e))
        }
    }

    setVocalSinkId(deviceId: string) {
        if (!this.vocalAudio) return

        if (!deviceId) {
            this.vocalAudio.muted = true
            return
        }
        this.vocalAudio.muted = false
        // Skip the round trip if the element is already on the requested
        // sink — every setSinkId on Bluetooth can re-handshake the link.
        const currentSink = (this.vocalAudio as unknown as { sinkId?: string }).sinkId
        if (currentSink === deviceId) return
        void this._applyVocalSink(deviceId)
    }

    // Robustly point the vocal `<audio>` at `deviceId`. Chromium has a quirk
    // where the first setSinkId call on a freshly-created (or freshly-unmuted)
    // media element is accepted but silently no-ops — the element keeps
    // playing on the system-default sink until a second call lands. We verify
    // via the `sinkId` getter and retry once after a brief delay, which has
    // been enough to make routing reliable on the first device change.
    private async _applyVocalSink(deviceId: string): Promise<void> {
        if (!this.vocalAudio || !deviceId) return
        const va = this.vocalAudio as unknown as {
            setSinkId?: (id: string) => Promise<void>
            sinkId?: string
        }
        if (typeof va.setSinkId !== 'function') return
        try {
            await va.setSinkId(deviceId)
            if (va.sinkId !== deviceId) {
                await new Promise(r => setTimeout(r, 30))
                await va.setSinkId(deviceId)
            }
        } catch (e) {
            console.warn('Failed to set vocal sinkId', e)
        }
    }

    setVocalOffset(ms: number) {
        this._vocalOffsetMs = Math.max(0, Math.min(2000, ms))
        if (this.vocalAudio && this._intendedPlayState) {
            this._syncVocalToOffset()
        }
    }

    get vocalOffsetMs() { return this._vocalOffsetMs }

    private _syncVocalToOffset() {
        if (!this.vocalAudio) return
        const vocalT = Math.max(0, this.audio.currentTime + this._vocalOffsetMs / 1000)
        const maxT = this.vocalAudio.duration || vocalT
        this.vocalAudio.currentTime = Math.min(vocalT, maxT)
    }

    destroy() {
        // Cancel any pending load listeners so a stale canplaythrough/error
        // can't resolve the previous load Promise after we've reset.
        this._loadAbort?.abort()
        this._loadAbort = null

        this.pause()
        this.onTimeUpdate = null
        this.onEnded = null
        this.audio.removeAttribute('src')
        this.audio.load() // resets the element
        if (this.vocalAudio) {
            // **Keep the element alive across song boundaries.** Pause + clear
            // src, but don't null the reference and don't call .load() with
            // an empty src — that would tear down the OS audio stream and
            // force a fresh A2DP handshake on the next song. The element
            // (and its sinkId) survive and the next load() just swaps src.
            this.vocalAudio.pause()
            this.vocalAudio.removeAttribute('src')
        }
        this._loaded = false
    }
}
