/**
 * MicrophoneManager - Captures and routes mic input for each singer
 *
 * Enumerates audio input devices, captures up to 3 simultaneous mic streams,
 * and routes each through individual effect chains.
 */

export interface MicStream {
    singerId: number
    deviceId: string
    stream: MediaStream
    analyser: AnalyserNode
    gainNode: GainNode
    source: MediaStreamAudioSourceNode
}

export class MicrophoneManager {
    private audioContext: AudioContext
    private streams: Map<number, MicStream> = new Map()
    private destination: AudioNode

    constructor(audioContext: AudioContext, destination: AudioNode) {
        this.audioContext = audioContext
        this.destination = destination
    }

    static async getDevices(): Promise<MediaDeviceInfo[]> {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices.filter(d => d.kind === 'audioinput')
    }

    async addSinger(singerId: number, deviceId: string): Promise<MicStream> {
        // Request mic access for specific device
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: { exact: deviceId },
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        })

        const source = this.audioContext.createMediaStreamSource(stream)
        const gainNode = this.audioContext.createGain()
        gainNode.gain.value = 1.0

        const analyser = this.audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8

        source.connect(gainNode)
        gainNode.connect(analyser)
        // Don't connect to destination yet - VocalEffects will handle routing

        const micStream: MicStream = {
            singerId,
            deviceId,
            stream,
            analyser,
            gainNode,
            source
        }

        this.streams.set(singerId, micStream)
        return micStream
    }

    removeSinger(singerId: number) {
        const mic = this.streams.get(singerId)
        if (mic) {
            mic.stream.getTracks().forEach(t => t.stop())
            mic.source.disconnect()
            mic.gainNode.disconnect()
            mic.analyser.disconnect()
            this.streams.delete(singerId)
            this.levelBuffers.delete(singerId)
        }
    }

    private levelBuffers: Map<number, Uint8Array> = new Map()

    getMicLevel(singerId: number): number {
        const mic = this.streams.get(singerId)
        if (!mic) return 0
        let dataArray = this.levelBuffers.get(singerId)
        if (!dataArray || dataArray.length !== mic.analyser.frequencyBinCount) {
            dataArray = new Uint8Array(mic.analyser.frequencyBinCount)
            this.levelBuffers.set(singerId, dataArray)
        }
        mic.analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        return sum / (dataArray.length * 255)
    }

    setGain(singerId: number, gain: number) {
        const mic = this.streams.get(singerId)
        if (mic) mic.gainNode.gain.value = gain
    }

    getStream(singerId: number): MicStream | undefined {
        return this.streams.get(singerId)
    }

    destroyAll() {
        for (const [id] of this.streams) {
            this.removeSinger(id)
        }
    }
}
