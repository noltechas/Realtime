import { ArtTile, Card, CardHeader, Chip, Icon, IconButton, Meter, Spinner, Toggle } from './ui'
import { AUTOGEN_STAGE_LABEL, isAutogenActive, useAutogen } from '../hooks/useAutogen'

type Autogen = ReturnType<typeof useAutogen>

// What the agent pass did, in one line (shown once a job is ready).
function agentNote(job: AutogenJob): { text: string; tone: 'green' | 'amber' } | null {
    if (job.stage !== 'ready' || job.alreadyInLibrary) return null
    if (job.agent === 'done') return { text: 'Singers, lyrics and effects tuned by Claude', tone: 'green' }
    if (job.agent === 'skipped') return { text: `Playable on default effects — ${job.agentReason || 'Claude pass skipped'}`, tone: 'amber' }
    if (job.agent === 'failed') return { text: `Playable on default effects — Claude pass failed: ${job.agentReason || 'unknown error'}`, tone: 'amber' }
    return null
}

/** Stage + progress bar + actions for one generation job. */
export function AutogenJobLine({ job, autogen }: { job: AutogenJob; autogen: Autogen }) {
    const active = isAutogenActive(job)
    const failed = job.stage === 'failed'
    const note = agentNote(job)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {active && <Spinner size={12} />}
                {job.stage === 'ready' && <span style={{ color: 'var(--adm-green)', display: 'inline-flex' }}><Icon name="check" size={13} /></span>}
                <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: failed ? 'var(--adm-red)' : job.stage === 'ready' ? 'var(--adm-green)' : 'var(--adm-text-2)',
                }}>
                    {job.alreadyInLibrary ? 'Already in the library' : AUTOGEN_STAGE_LABEL[job.stage]}
                </span>
                {active && <span style={{ fontSize: 11.5, color: 'var(--adm-text-3)', fontVariantNumeric: 'tabular-nums' }}>{job.overall}%</span>}
                <div style={{ flex: 1 }} />
                {active && (
                    <IconButton icon="x" size={24} title="Cancel" onClick={() => autogen.cancel(job.trackId)} />
                )}
                {failed && job.errorCode !== 'cancelled' && (
                    <IconButton icon="restart" size={24} title="Retry" onClick={() => autogen.retry(job.trackId)} />
                )}
                {!active && (
                    <IconButton icon="x" size={24} title="Clear" onClick={() => autogen.dismiss(job.trackId)} />
                )}
            </div>
            {active && <Meter value={job.overall / 100} progress />}
            {failed && job.error && (
                <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', lineHeight: 1.4 }} title={job.logPath}>
                    {job.error}
                </div>
            )}
            {note && (
                <div style={{ fontSize: 11.5, lineHeight: 1.4, color: note.tone === 'green' ? 'var(--adm-text-3)' : 'var(--adm-amber-bright)' }}>
                    {note.text}
                </div>
            )}
        </div>
    )
}

/** Compact status for a Spotify search row. */
export function AutogenRowStatus({ job }: { job: AutogenJob }) {
    if (job.stage === 'failed') return <Chip tone="red" style={{ fontSize: 10.5 }}>Failed</Chip>
    if (job.stage === 'ready') return <Chip tone="green" style={{ fontSize: 10.5 }}><Icon name="check" size={10} /> Generated</Chip>
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--adm-text-3)', flexShrink: 0 }}>
            <Spinner size={12} /> {job.stage === 'queued' ? 'Queued' : `${job.overall}%`}
        </span>
    )
}

/** The generator card: auto-generate toggle, setup state, and the job list. */
export function AutogenQueueCard({ autogen }: { autogen: Autogen }) {
    const status = autogen.status
    if (!status) return null
    const jobs = [...status.jobs].sort((a, b) => {
        const rank = (j: AutogenJob) => (isAutogenActive(j) ? (j.stage === 'queued' ? 1 : 0) : 2)
        return rank(a) - rank(b) || a.createdAt - b.createdAt
    })
    return (
        <Card>
            <CardHeader
                icon="spark"
                label="Auto"
                title="Song Generator"
                desc="Spotify track → separated stems → tuned library song, no export needed"
            />
            <div className="adm-well" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Auto-generate guest requests</div>
                    <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 2 }}>
                        A requested song starts generating right away and lands in the catalog when it's done.
                    </div>
                </div>
                <Toggle
                    on={status.settings.autoGenerateRequests}
                    onToggle={() => autogen.setAutoGenerate(!status.settings.autoGenerateRequests)}
                    title="Auto-generate guest requests"
                />
            </div>

            {!status.available && (
                <div style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.45,
                    color: 'var(--adm-amber-bright)', marginBottom: 14,
                }}>
                    <Icon name="lock" size={14} style={{ marginTop: 1 }} />
                    <span>Not set up yet: {status.unavailableReason}</span>
                </div>
            )}

            {jobs.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--adm-text-3)', lineHeight: 1.5 }}>
                    Nothing generating. Search a song under Add Song and press <b style={{ color: 'var(--adm-text-2)' }}>Generate</b>,
                    or let guests request one.
                </div>
            ) : (
                <div className="adm-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420 }}>
                    {jobs.map(job => (
                        <div key={job.trackId} className="adm-row" style={{ background: 'var(--adm-well)', alignItems: 'flex-start' }}>
                            <ArtTile src={job.artUrl} size={40} radius={6} />
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.name}</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {job.artist}{job.requestedBy ? ` · requested by ${job.requestedBy}` : ''}
                                    </div>
                                </div>
                                <AutogenJobLine job={job} autogen={autogen} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    )
}
