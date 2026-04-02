/**
 * AudioEngine — Simple HTMLAudioElement wrapper for karaoke instrumental playback.
 *
 * Uses the native `timeupdate` event for lyrics sync (fires ~4x/sec — plenty for lyrics).
 * Uses `file://` URLs which work directly with <audio> elements in Electron.
 */

export class AudioEngine {
    private audio: HTMLAudioElement
    private vocalAudio: HTMLAudioElement | null = null
    private onTimeUpdate: ((timeMs: number) => void) | null = null
    private onEnded: (() => void) | null = null
    private _loaded = false
    private _intendedPlayState = false
    private _vocalOffsetMs = 0

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
        return new Promise((resolve, reject) => {
            // Cleanup previous vocals
            if (this.vocalAudio) {
                this.vocalAudio.pause()
                this.vocalAudio.removeAttribute('src')
                this.vocalAudio.load()
                this.vocalAudio = null
            }

            this.audio.src = stems.instrumental ? `file://${stems.instrumental}` : ''

            if (stems.vocals) {
                this.vocalAudio = new Audio()
                this.vocalAudio.preload = 'auto'
                this.vocalAudio.src = `file://${stems.vocals}`

                // Prevent OS from pausing the vocal track when disconnected
                this.vocalAudio.addEventListener('pause', () => {
                    if (this._intendedPlayState && this.vocalAudio) {
                        this.vocalAudio.play().catch(() => { })
                    }
                })

                const deviceId = monitorDeviceIds[0] || ''
                if (deviceId) {
                    this.vocalAudio.muted = false
                    if (typeof (this.vocalAudio as any).setSinkId === 'function') {
                        ; (this.vocalAudio as any).setSinkId(deviceId).catch((e: any) => console.warn('Failed to setSinkId', e))
                    }
                } else {
                    this.vocalAudio.muted = true
                }
            }

            const elementsToWait = [this.audio]
            if (this.vocalAudio) elementsToWait.push(this.vocalAudio)

            let loadedCount = 0

            if (elementsToWait.length === 0 || !this.audio.src) {
                this._loaded = true
                resolve()
                return
            }

            const checkDone = () => {
                loadedCount++
                if (loadedCount === elementsToWait.length) {
                    this._loaded = true
                    resolve()
                }
            }

            elementsToWait.forEach(audioEl => {
                if (audioEl.readyState >= 4) {
                    checkDone()
                } else {
                    audioEl.addEventListener('canplaythrough', checkDone, { once: true })
                    audioEl.addEventListener('error', () => reject(new Error(`Failed to load audio: ${audioEl.src}`)), { once: true })
                    audioEl.load()
                }
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
        } else {
            this.vocalAudio.muted = false
            if (typeof (this.vocalAudio as any).setSinkId === 'function') {
                ; (this.vocalAudio as any).setSinkId(deviceId).catch((e: any) => console.warn('Failed to set vocal sinkId', e))
            }
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
        this.pause()
        this.audio.removeAttribute('src')
        this.audio.load() // resets the element
        if (this.vocalAudio) {
            this.vocalAudio.pause()
            this.vocalAudio.removeAttribute('src')
            this.vocalAudio.load()
            this.vocalAudio = null
        }
        this._loaded = false
    }
}
