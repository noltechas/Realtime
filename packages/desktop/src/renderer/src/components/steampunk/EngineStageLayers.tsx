// Layers on the Vox Engine stage while a song plays.
//
//   EngineLinePlate  the active line's nameplate: deep green engine enamel in
//                    a riveted brass frame (karaoke.css, VOX ENGINE STAGE)
//   EngineFrame      the engine house behind the song (when there's no video),
//                    and the machine around the edges of the screen: a train of
//                    gears in the corner turning with the room's voice, the
//                    room-pressure gauge mounted on them, copper pipes along
//                    the foot and side, steam blowing off
import { useMemo } from 'react'
import { meshTrain } from './parts'
import { Design, Gauge, GearTrain, Pipe, SteamVent, useEngine } from './EngineParts'
import { EngineHouse } from './EngineScreens'

export function EngineLinePlate({ seed }: { seed: number }) {
    return <span className="st-plate" aria-hidden data-seed={seed} />
}

export function EngineFrame({ video = false }: { video?: boolean }) {
    useEngine()
    const gears = useMemo(
        () =>
            meshTrain(
                { teeth: 44, x: 1935, y: 1095, phase: 5 },
                [
                    { teeth: 24, deg: -133 },
                    { teeth: 14, deg: -62 },
                    { teeth: 18, from: 0, deg: -178 },
                ],
                0.78,
            ),
        [],
    )
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
            {/* with no video, the song plays in the engine house, the blurred
                art beneath washing it in the song's colours */}
            {!video && (
                <div style={{ position: 'absolute', inset: 0, opacity: 0.72, mixBlendMode: 'luminosity' }}>
                    <EngineHouse dim={0.62} />
                </div>
            )}
            <Design>
                <>
                    <Pipe x={-20} y={1066} length={1960} d={38} every={360} />
                    <Pipe x={22} y={150} length={920} d={30} vertical every={300} />
                    <GearTrain gears={gears} shadow={8} />
                    <div style={{ position: 'absolute', left: 1772 - 85, top: 880 - 85 }}>
                        <Gauge size={170} />
                    </div>
                    <SteamVent x={420} y={1048} scale={0.9} period={7} />
                    <SteamVent x={1300} y={1048} scale={0.8} period={8.5} delay={3} />
                </>
            </Design>
        </div>
    )
}
