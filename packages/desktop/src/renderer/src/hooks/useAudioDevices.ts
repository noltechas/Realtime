import { useEffect, useState } from 'react'

export interface AudioInputDevice {
    /**
     * Device id passed to consumers. For multi-channel interfaces this is
     * suffixed with `#ch=<index>` so each channel can be selected as a
     * separate mono input (e.g. both mics on a Behringer UMC202HD).
     */
    deviceId: string
    label: string
    /** Underlying hardware deviceId (without any channel suffix). */
    realDeviceId: string
    /** Zero-based channel index; undefined when the device is mono. */
    channelIndex?: number
    /** Total channels reported by the hardware. */
    channelCount: number
}

export interface AudioDevices {
    inputs: AudioInputDevice[]
    outputs: MediaDeviceInfo[]
}

/**
 * Parse a deviceId that may contain a `#ch=N` suffix.
 * Returns the underlying hardware deviceId and the channel index (if any).
 */
export function parseDeviceId(deviceId: string): { realDeviceId: string; channelIndex?: number } {
    const hashIdx = deviceId.indexOf('#')
    if (hashIdx < 0) return { realDeviceId: deviceId }
    const real = deviceId.slice(0, hashIdx)
    const query = deviceId.slice(hashIdx + 1)
    const m = /(?:^|&)ch=(\d+)/.exec(query)
    return { realDeviceId: real, channelIndex: m ? parseInt(m[1], 10) : undefined }
}

/** Cache of probed channel counts keyed by real deviceId. */
const channelCountCache = new Map<string, number>()

async function probeChannelCount(deviceId: string): Promise<number> {
    const cached = channelCountCache.get(deviceId)
    if (cached !== undefined) return cached
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: deviceId } },
        })
        const track = stream.getAudioTracks()[0]
        const caps = track?.getCapabilities?.() as MediaTrackCapabilities | undefined
        const settings = track?.getSettings?.() as MediaTrackSettings | undefined
        const count =
            (caps?.channelCount?.max as number | undefined) ??
            (settings?.channelCount as number | undefined) ??
            1
        stream.getTracks().forEach(t => t.stop())
        channelCountCache.set(deviceId, count)
        return count
    } catch {
        return 1
    }
}

function expandDevice(raw: MediaDeviceInfo, channelCount: number): AudioInputDevice[] {
    const baseLabel = raw.label || `Mic ${raw.deviceId.slice(0, 6)}`
    if (channelCount <= 1) {
        return [{
            deviceId: raw.deviceId,
            label: baseLabel,
            realDeviceId: raw.deviceId,
            channelCount: 1,
        }]
    }
    const entries: AudioInputDevice[] = []
    for (let i = 0; i < channelCount; i++) {
        entries.push({
            deviceId: `${raw.deviceId}#ch=${i}`,
            label: `${baseLabel} \u2014 Ch ${i + 1}`,
            realDeviceId: raw.deviceId,
            channelIndex: i,
            channelCount,
        })
    }
    return entries
}

/**
 * Enumerates audio input/output devices and refreshes the list whenever the
 * OS reports a device change (plug/unplug, Bluetooth connect, etc.).
 *
 * Multi-channel input devices (e.g. USB audio interfaces with 2+ mic inputs)
 * are expanded into one virtual entry per channel so each mic can be assigned
 * to a different singer.
 */
export function useAudioDevices(): AudioDevices {
    const [devices, setDevices] = useState<AudioDevices>({ inputs: [], outputs: [] })

    useEffect(() => {
        let cancelled = false

        const refresh = async () => {
            let list: MediaDeviceInfo[]
            try {
                list = await navigator.mediaDevices.enumerateDevices()
            } catch {
                return
            }
            if (cancelled) return

            const rawInputs = list.filter(d => d.kind === 'audioinput' && d.deviceId)
            const outputs = list.filter(d => d.kind === 'audiooutput')

            // Publish an initial mono-only snapshot so the UI renders quickly,
            // then probe channel counts and re-publish an expanded list.
            const provisional: AudioInputDevice[] = rawInputs.map(d => {
                const cached = channelCountCache.get(d.deviceId)
                return expandDevice(d, cached ?? 1)
            }).flat()
            setDevices({ inputs: provisional, outputs })

            const probed = await Promise.all(
                rawInputs.map(async d => ({ raw: d, count: await probeChannelCount(d.deviceId) }))
            )
            if (cancelled) return

            const expanded = probed.flatMap(({ raw, count }) => expandDevice(raw, count))
            setDevices({ inputs: expanded, outputs })
        }

        refresh()
        navigator.mediaDevices.addEventListener('devicechange', refresh)
        return () => {
            cancelled = true
            navigator.mediaDevices.removeEventListener('devicechange', refresh)
        }
    }, [])

    return devices
}
