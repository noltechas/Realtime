import { useEffect, useRef } from 'react'
// NOT IN GIT. This asset is 54 MB and gitignored, so a fresh clone fails to build right
// here with `Could not resolve "../assets/liquid-light.mp4"`. It lives on disk locally and
// Vite bundles it from there, for both dev and production. Regenerate it with the ffmpeg
// recipe in ../assets/README.md — the 1527px crop and the 175s start offset both matter.
import LIQUID_LIGHT_URL from '../assets/liquid-light.mp4'

// ── The projector ───────────────────────────────────────────────────────────
//
// A real liquid light show on film — oil, water and aniline dyes on an overhead
// projector — used as the psychedelic stage's backdrop. The mobile app runs the same
// footage behind its whole navigator (see packages/mobile/.../psychedelic/atoms/
// SceneLayer.tsx), so the two platforms are literally the same background.
//
// It is footage rather than something generated. Two procedural attempts — a
// lobed-plate vocabulary and then a domain-warped shader — both read as computer
// graphics: the dye's actual behaviour (surface tension, refraction at the oil/water
// boundary, the way a bubble cluster packs) is not something a noise field imitates
// convincingly.
//
// ── The source ──────────────────────────────────────────────────────────────
// The original is a square frame with the projector dish inscribed in it as a CIRCLE,
// so a naive fit shows black corners. The shipped asset is pre-cropped to the largest
// square that fits INSIDE that circle, which means `object-fit: cover` fills any aspect
// ratio — a 16:9 stage, a portrait phone — with no black anywhere and no runtime zoom
// hack. Cropping at encode time also means the decoder never touches pixels that are
// about to be thrown away.

/** Length of the shipped clip, in seconds. Kept in sync with the encode. */
const CLIP_SECONDS = 180

export function LiquidLight({
    performing = false,
    phase = 0,
    filter,
}: {
    performing?: boolean
    /**
     * Fraction of the clip (0..1) to push this instance's random start by.
     *
     * Two instances on screen at once — the full-bleed backdrop and the one filling the
     * idle handbill — must never be showing the same moment, or the plate stops reading
     * as a second projector and looks like a transparency bug. Independent random starts
     * collide often enough to matter, so the caller separates them explicitly: 0 for the
     * backdrop, 0.5 for the plate keeps them half a clip apart however the dice land.
     */
    phase?: number
    /** Overrides the treatment. `performing` still wins if set. */
    filter?: string
}) {
    const ref = useRef<HTMLVideoElement | null>(null)

    useEffect(() => {
        const video = ref.current
        if (!video) return

        // Slightly under real time: the dye already moves slowly, and easing it further
        // makes the backdrop feel ambient rather than busy. Slower again while a song is
        // playing, where the lyrics have to hold the eye.
        video.playbackRate = performing ? 0.6 : 0.85

        // A random start offset per mount, so a long night doesn't always open on the
        // same image and two screens in a room aren't frame-locked. Seeking before
        // metadata lands is ignored by the element, so do it on both paths.
        const seek = () => {
            const span = Number.isFinite(video.duration) && video.duration > 1 ? video.duration : CLIP_SECONDS
            video.currentTime = ((Math.random() + phase) % 1) * span
        }
        if (video.readyState >= 1) seek()
        else video.addEventListener('loadedmetadata', seek, { once: true })

        // Autoplay can still be refused if the element is attached before it is muted;
        // play() returning a rejected promise is not an error worth surfacing on a stage
        // display, so swallow it and let the poster colour stand in.
        void video.play().catch(() => {})

        return () => video.removeEventListener('loadedmetadata', seek)
    }, [performing, phase])

    return (
        <video
            ref={ref}
            src={LIQUID_LIGHT_URL}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                // Dimmed and slightly desaturated while performing, so ink-on-dye lyric
                // plates keep their contrast against whatever colour drifts underneath.
                filter: performing ? 'brightness(0.42) saturate(0.85)' : (filter ?? 'none'),
            }}
        />
    )
}
