import { ReactNode, CSSProperties, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'

/**
 * Console UI kit — the fixed design system for every host-facing page.
 * Intentionally independent of the stage theme system: nothing in here reads
 * ThemeContext. Visual tokens live in styles/admin.css (`--adm-*`).
 */

/* ── Icons (inline SVG, stroke-based, 24-unit grid) ─────────────────────── */

export type IconName =
    | 'search' | 'music' | 'mic' | 'headphones' | 'play' | 'pause' | 'prev' | 'skip'
    | 'restart' | 'trash' | 'pencil' | 'plus' | 'minus' | 'x' | 'check' | 'lock'
    | 'grip' | 'users' | 'inbox' | 'trophy' | 'sliders' | 'chevronDown' | 'chevronRight'
    | 'video' | 'upload' | 'monitor' | 'radio' | 'waveform' | 'qr' | 'arrowUp' | 'arrowDown'
    | 'clock' | 'palette' | 'key' | 'spark' | 'eyeOff' | 'volume'

const PATHS: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16" y2="16" /></>,
    music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v1a7 7 0 0 0 14 0v-1" /><line x1="12" y1="18" x2="12" y2="22" /></>,
    headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="7" rx="2" /><rect x="17" y="14" width="4" height="7" rx="2" /></>,
    play: <polygon points="7 4 20 12 7 20" fill="currentColor" stroke="none" />,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" /></>,
    prev: <><rect x="4" y="5" width="3" height="14" rx="1" fill="currentColor" stroke="none" /><polygon points="20 5 9 12 20 19" fill="currentColor" stroke="none" /></>,
    skip: <><polygon points="4 5 15 12 4 19" fill="currentColor" stroke="none" /><rect x="17" y="5" width="3" height="14" rx="1" fill="currentColor" stroke="none" /></>,
    restart: <><polyline points="2 5 2 11 8 11" /><path d="M4.5 15a8 8 0 1 0 1.9-8.4L2 11" /></>,
    trash: <><path d="M4 7h16" /><path d="M18 7v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>,
    pencil: <><path d="M17 3a2.8 2.8 0 1 1 4 4L8 20l-5 1 1-5Z" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    minus: <line x1="5" y1="12" x2="19" y2="12" />,
    x: <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>,
    check: <polyline points="4 12.5 10 18 20 6" />,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    grip: <g fill="currentColor" stroke="none"><circle cx="9" cy="5" r="1.6" /><circle cx="15" cy="5" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="19" r="1.6" /><circle cx="15" cy="19" r="1.6" /></g>,
    users: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a7 7 0 0 1 14 0v1" /><path d="M17 4.5a4 4 0 0 1 0 7" /><path d="M19.5 14.5a7 7 0 0 1 2.5 5.5v1" /></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5 4h14l3 8v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-7Z" /></>,
    trophy: <><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v6a5 5 0 0 1-10 0Z" /><path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 1.5 4 4 4.5" /><path d="M17 6h3a1 1 0 0 1 1 1c0 2.5-1.5 4-4 4.5" /></>,
    sliders: <><line x1="5" y1="4" x2="5" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="19" y1="4" x2="19" y2="20" /><circle cx="5" cy="14" r="2.4" fill="var(--adm-card)" /><circle cx="12" cy="8" r="2.4" fill="var(--adm-card)" /><circle cx="19" cy="16" r="2.4" fill="var(--adm-card)" /></>,
    chevronDown: <polyline points="6 9 12 15 18 9" />,
    chevronRight: <polyline points="9 6 15 12 9 18" />,
    video: <><rect x="2" y="6" width="13" height="12" rx="2" /><path d="M15 10.5 22 7v10l-7-3.5" /></>,
    upload: <><path d="M12 16V4" /><polyline points="6 9 12 3.5 18 9" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
    monitor: <><rect x="2" y="4" width="20" height="13" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>,
    radio: <><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /><path d="M7.5 7.5a6.5 6.5 0 0 0 0 9" /><path d="M16.5 7.5a6.5 6.5 0 0 1 0 9" /><path d="M4.6 4.6a10.5 10.5 0 0 0 0 14.8" /><path d="M19.4 4.6a10.5 10.5 0 0 1 0 14.8" /></>,
    waveform: <><line x1="3" y1="10" x2="3" y2="14" /><line x1="7" y1="7" x2="7" y2="17" /><line x1="11" y1="3" x2="11" y2="21" /><line x1="15" y1="8" x2="15" y2="16" /><line x1="19" y1="10" x2="19" y2="14" /></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14h1M14 20h1M20 20h1M17 17h4v4" /></>,
    arrowUp: <><line x1="12" y1="20" x2="12" y2="5" /><polyline points="6 11 12 5 18 11" /></>,
    arrowDown: <><line x1="12" y1="4" x2="12" y2="19" /><polyline points="6 13 12 19 18 13" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></>,
    palette: <><path d="M12 21a9 9 0 1 1 9-9c0 2.5-1.5 3.5-3 3.5h-2a2.5 2.5 0 0 0-2 4c.5.8 0 1.5-2 1.5Z" /><circle cx="7.5" cy="11" r="1.2" fill="currentColor" stroke="none" /><circle cx="10.5" cy="7" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="7.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="17.5" cy="11.5" r="1.2" fill="currentColor" stroke="none" /></>,
    key: <><circle cx="8" cy="15" r="4.5" /><path d="M11.2 11.8 20 3" /><path d="M16.5 6.5 19 9" /></>,
    spark: <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8Z" />,
    eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.8M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4.3-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    volume: <><polygon points="11 5 6 9 3 9 3 15 6 15 11 19" fill="currentColor" stroke="none" /><path d="M15 9a4 4 0 0 1 0 6" /><path d="M18 6.5a8 8 0 0 1 0 11" /></>,
}

export function Icon({ name, size = 15, strokeWidth = 1.9, style }: { name: IconName; size?: number; strokeWidth?: number; style?: CSSProperties }) {
    return (
        <svg
            width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, display: 'block', ...style }} aria-hidden="true"
        >
            {PATHS[name]}
        </svg>
    )
}

/* ── Buttons ────────────────────────────────────────────────────────────── */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'live'
    size?: 'sm' | 'md' | 'lg'
    icon?: IconName
}

export function Button({ variant = 'secondary', size = 'md', icon, children, className, ...rest }: ButtonProps) {
    const cls = [
        'adm-btn',
        `adm-btn--${variant}`,
        size === 'sm' ? 'adm-btn--sm' : size === 'lg' ? 'adm-btn--lg' : '',
        className || '',
    ].filter(Boolean).join(' ')
    return (
        <button className={cls} {...rest}>
            {icon && <Icon name={icon} size={size === 'sm' ? 13 : size === 'lg' ? 17 : 15} />}
            {children}
        </button>
    )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconName
    danger?: boolean
    size?: number
}

export function IconButton({ icon, danger, size = 30, style, className, ...rest }: IconButtonProps) {
    return (
        <button
            className={['adm-iconbtn', danger ? 'adm-iconbtn--danger' : '', className || ''].filter(Boolean).join(' ')}
            style={{ width: size, height: size, ...style }}
            {...rest}
        >
            <Icon name={icon} size={Math.round(size * 0.5)} />
        </button>
    )
}

/* ── Cards & sections ───────────────────────────────────────────────────── */

export function Card({ children, style, className, pad = true }: { children: ReactNode; style?: CSSProperties; className?: string; pad?: boolean }) {
    return (
        <section className={['adm-card', pad ? 'adm-card--pad' : '', className || ''].filter(Boolean).join(' ')} style={style}>
            {children}
        </section>
    )
}

/** Card header row: silkscreen label + title/description, optional right-side actions. */
export function CardHeader({ label, title, desc, icon, actions, style }: {
    label?: string; title?: ReactNode; desc?: ReactNode; icon?: IconName; actions?: ReactNode; style?: CSSProperties
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, ...style }}>
            {icon && (
                <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--adm-amber-soft)', color: 'var(--adm-amber-bright)',
                    border: '1px solid rgba(245,165,36,0.28)',
                    boxShadow: '0 0 14px -4px var(--adm-amber-glow)',
                }}>
                    <Icon name={icon} size={16} />
                </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                {label && <div className="adm-label" style={{ marginBottom: title ? 3 : 0 }}>{label}</div>}
                {title && <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 15, letterSpacing: '-0.2px' }}>{title}</div>}
                {desc && <div style={{ fontSize: 12.5, color: 'var(--adm-text-2)', marginTop: 2 }}>{desc}</div>}
            </div>
            {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{actions}</div>}
        </div>
    )
}

/* ── Form primitives ────────────────────────────────────────────────────── */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    function Input({ className, ...rest }, ref) {
        return <input ref={ref} className={['adm-input', className || ''].filter(Boolean).join(' ')} {...rest} />
    }
)

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={['adm-textarea', className || ''].filter(Boolean).join(' ')} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
    return <select className={['adm-select', className || ''].filter(Boolean).join(' ')} {...rest}>{children}</select>
}

/** Search input with leading icon. */
export function SearchInput({ style, ...rest }: InputHTMLAttributes<HTMLInputElement> & { style?: CSSProperties }) {
    return (
        <div style={{ position: 'relative', ...style }}>
            <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, display: 'flex', alignItems: 'center', color: 'var(--adm-text-3)', pointerEvents: 'none' }}>
                <Icon name="search" size={14} />
            </div>
            <input className="adm-input" style={{ paddingLeft: 34 }} {...rest} />
        </div>
    )
}

/** Label + control wrapper. */
export function Field({ label, children, style, hint }: { label: string; children: ReactNode; style?: CSSProperties; hint?: ReactNode }) {
    return (
        <div style={style}>
            <div className="adm-label" style={{ marginBottom: 7 }}>{label}</div>
            {children}
            {hint && <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 5 }}>{hint}</div>}
        </div>
    )
}

export function Toggle({ on, onToggle, disabled, title }: { on: boolean; onToggle: () => void; disabled?: boolean; title?: string }) {
    return (
        <button
            type="button" role="switch" aria-checked={on} onClick={onToggle} disabled={disabled}
            className="adm-toggle" title={title}
            style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
        />
    )
}

/** Console fader — styled range input with a filled track. */
export function Fader({ value, min, max, step, onChange, color, disabled, style }: {
    value: number; min: number; max: number; step?: number
    onChange: (v: number) => void
    color?: string
    disabled?: boolean
    style?: CSSProperties
}) {
    const pct = max === min ? 0 : ((value - min) / (max - min)) * 100
    return (
        <input
            type="range" className="adm-fader"
            min={min} max={max} step={step ?? 'any'} value={value} disabled={disabled}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{ '--fill': `${pct}%`, ...(color ? { '--fader-color': color } : {}), ...style } as CSSProperties}
        />
    )
}

/** Labeled fader row with live value readout — the standard FX-parameter control. */
export function FaderRow({ label, value, min, max, unit, onChange, color, decimals }: {
    label: string; value: number; min: number; max: number; unit?: string
    onChange: (v: number) => void; color?: string; decimals?: number
}) {
    const step = max - min > 10 ? 1 : 0.1
    const shown = decimals !== undefined ? value.toFixed(decimals) : String(Math.round(value * 10) / 10)
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--adm-text-2)' }}>{label}</span>
                <span className="adm-mono" style={{ fontSize: 11, color: 'var(--adm-text)' }}>{shown}{unit}</span>
            </div>
            <Fader value={value} min={min} max={max} step={step} onChange={onChange} color={color} />
        </div>
    )
}

/* ── Status & data display ──────────────────────────────────────────────── */

export function Chip({ children, tone, onClick, style, title }: {
    children: ReactNode
    tone?: 'amber' | 'green' | 'red' | 'cyan'
    onClick?: () => void
    style?: CSSProperties
    title?: string
}) {
    const cls = ['adm-chip', tone ? `adm-chip--${tone}` : '', onClick ? 'adm-chip--click' : ''].filter(Boolean).join(' ')
    if (onClick) return <button className={cls} onClick={onClick} style={style} title={title}>{children}</button>
    return <span className={cls} style={style} title={title}>{children}</span>
}

export function Led({ state = 'off' }: { state?: 'off' | 'on' | 'rec' | 'amber' }) {
    return <span className={`adm-led${state !== 'off' ? ` adm-led--${state}` : ''}`} />
}

export function Spinner({ size = 18 }: { size?: number }) {
    return <div className="adm-spinner" style={{ width: size, height: size }} />
}

export function Meter({ value, progress, style }: { value: number; progress?: boolean; style?: CSSProperties }) {
    return (
        <div className="adm-meter" style={{ flex: 1, ...style }}>
            <div className={`adm-meter__fill${progress ? ' adm-meter__fill--progress' : ''}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
        </div>
    )
}

export function EmptyState({ icon, title, desc, action, style }: {
    icon: IconName; title: string; desc?: ReactNode; action?: ReactNode; style?: CSSProperties
}) {
    return (
        <div style={{ textAlign: 'center', padding: '52px 20px', ...style }}>
            <div style={{
                width: 52, height: 52, margin: '0 auto 16px', borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--adm-card-2)', border: '1px solid var(--adm-line)',
                color: 'var(--adm-text-3)', boxShadow: 'var(--adm-card-shadow)',
            }}>
                <Icon name={icon} size={22} />
            </div>
            <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 16, marginBottom: 6 }}>{title}</div>
            {desc && <div style={{ fontSize: 13, color: 'var(--adm-text-2)', maxWidth: 380, margin: '0 auto' }}>{desc}</div>}
            {action && <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>{action}</div>}
        </div>
    )
}

/** Circular avatar: profile picture when available, colored initial otherwise. */
export function Avatar({ name, src, color, size = 28 }: { name?: string | null; src?: string | null; color?: string | null; size?: number }) {
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
    const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
    const bg = color || `hsl(${hue}, 48%, 46%)`
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: bg, color: '#0b0d12',
            fontFamily: 'var(--adm-display)', fontWeight: 700, fontSize: size * 0.42,
            border: '1px solid rgba(0,0,0,0.4)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.25) inset, 0 2px 6px rgba(0,0,0,0.35)',
        }}>
            {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
        </div>
    )
}

/** Album-art tile with music-note fallback. */
export function ArtTile({ src, size = 48, radius = 8 }: { src?: string | null; size?: number; radius?: number }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden',
            background: 'var(--adm-card-2)', border: '1px solid var(--adm-line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-text-3)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        }}>
            {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <Icon name="music" size={size * 0.42} />}
        </div>
    )
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */

export function Tabs<T extends string>({ tabs, active, onChange }: {
    tabs: Array<{ id: T; label: string; icon?: IconName; count?: number }>
    active: T
    onChange: (id: T) => void
}) {
    return (
        <div className="adm-tabs">
            {tabs.map(t => (
                <button
                    key={t.id}
                    className={`adm-tab${active === t.id ? ' adm-tab--active' : ''}`}
                    onClick={() => onChange(t.id)}
                >
                    {t.icon && <Icon name={t.icon} size={14} />}
                    {t.label}
                    {t.count !== undefined && t.count > 0 && <span className="adm-tab__count">{t.count}</span>}
                </button>
            ))}
        </div>
    )
}

/* ── Page header ────────────────────────────────────────────────────────── */

export function PageHeader({ title, desc, actions, label }: { title: ReactNode; desc?: ReactNode; actions?: ReactNode; label?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
                {label && <div className="adm-label" style={{ marginBottom: 6, color: 'var(--adm-amber)' }}>{label}</div>}
                <h1 className="adm-h1">{title}</h1>
                {desc && <p className="adm-sub" style={{ marginTop: 5 }}>{desc}</p>}
            </div>
            {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
        </div>
    )
}
