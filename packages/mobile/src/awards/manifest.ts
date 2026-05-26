// Lazy loader for the 7000+ award-icon manifest hosted at
// https://noltechas.github.io/Realtime/awards-icons/manifest.js.
//
// The companion site injects this 905KB file via <script src=> on demand
// (events/awards.js → ensureAwardsManifest). We do the same on mobile, but the
// file is JS that assigns globals (window.AWARDS_ICONS / AWARDS_FEATURED_SVGS),
// so we can't use a typical `fetch().then(r=>r.json())`. Instead we fetch the
// text and extract the two embedded JSON blobs by character offset.

export interface AwardsIcon {
  id: string
  label: string
  category: string
  prefix: string
  featured?: boolean
}

const MANIFEST_URL = 'https://noltechas.github.io/Realtime/awards-icons/manifest.js'

let cache: {
  icons: AwardsIcon[]
  featuredSvgs: Record<string, string>
} | null = null
let inflight: Promise<{ icons: AwardsIcon[]; featuredSvgs: Record<string, string> }> | null = null

export function getAwardsManifest(): {
  icons: AwardsIcon[]
  featuredSvgs: Record<string, string>
} | null {
  return cache
}

export async function ensureAwardsManifest(): Promise<{
  icons: AwardsIcon[]
  featuredSvgs: Record<string, string>
}> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    const r = await fetch(MANIFEST_URL)
    if (!r.ok) throw new Error(`awards manifest fetch failed: ${r.status}`)
    const text = await r.text()
    // Format (from docs/awards-icons/manifest.js):
    //   window.AWARDS_ICONS = [{...},{...},...];
    //   window.AWARDS_FEATURED_SVGS = {"id":"<svg .../>", ...};
    // We pull the bracket-balanced JSON for each side by indexing on the known
    // assignment prefix. No eval, no regex backtracking on 900KB.
    const iconsStart = text.indexOf('[', text.indexOf('AWARDS_ICONS'))
    const iconsEnd = findMatchingBracket(text, iconsStart, '[', ']')
    const featStart = text.indexOf('{', text.indexOf('AWARDS_FEATURED_SVGS'))
    const featEnd = findMatchingBracket(text, featStart, '{', '}')
    if (iconsStart < 0 || iconsEnd < 0 || featStart < 0 || featEnd < 0) {
      throw new Error('awards manifest: could not locate JSON blobs')
    }
    const icons = JSON.parse(text.slice(iconsStart, iconsEnd + 1)) as AwardsIcon[]
    const featuredSvgs = JSON.parse(text.slice(featStart, featEnd + 1)) as Record<
      string,
      string
    >
    cache = { icons, featuredSvgs }
    return cache
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

// Linear bracket-balance scan. Handles JSON-quoted strings (and the escape
// sequences inside them) so SVG payloads containing `]` or `}` don't fool it.
function findMatchingBracket(
  text: string,
  start: number,
  open: '[' | '{',
  close: ']' | '}',
): number {
  if (start < 0 || text.charAt(start) !== open) return -1
  let depth = 0
  let i = start
  let inStr = false
  while (i < text.length) {
    const ch = text.charAt(i)
    if (inStr) {
      if (ch === '\\') {
        i += 2
        continue
      }
      if (ch === '"') inStr = false
      i++
      continue
    }
    if (ch === '"') {
      inStr = true
      i++
      continue
    }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

export function awardsFilteredIcons(
  shuffled: AwardsIcon[] | null,
  fullList: AwardsIcon[],
  searchQ: string,
): AwardsIcon[] {
  const list = shuffled && shuffled.length ? shuffled : fullList
  const q = (searchQ || '').trim().toLowerCase()
  if (!q) return list.slice()
  const out: AwardsIcon[] = []
  for (const ic of list) {
    if (
      ic.label.toLowerCase().indexOf(q) === -1 &&
      ic.id.toLowerCase().indexOf(q) === -1
    ) {
      continue
    }
    out.push(ic)
  }
  return out
}

export function shuffleAwardIcons(icons: AwardsIcon[]): AwardsIcon[] {
  return icons
    .map((v) => ({ v, s: Math.random() }))
    .sort((a, b) => a.s - b.s)
    .map((o) => o.v)
}
