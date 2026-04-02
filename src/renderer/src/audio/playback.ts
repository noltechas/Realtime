import { AudioEngine } from './AudioEngine'

let engine: AudioEngine | null = null

export function getEngine(): AudioEngine {
    if (!engine) engine = new AudioEngine()
    return engine
}

export function destroyEngine(): void {
    engine?.destroy()
    engine = null
}
