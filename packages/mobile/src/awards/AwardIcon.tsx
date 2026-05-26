import React, { useEffect, useRef, useState } from 'react'
import { View, Image } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { awardsIconCdnUrl, AWARDS_FALLBACK_SVG } from '@karaoke/shared'
import { getAwardsManifest } from './manifest'

// In-memory cache for non-featured icons fetched from iconify CDN. The
// companion site uses CSS mask-image for the same effect; here we fetch the
// SVG text once per icon and reuse it everywhere it renders.
const cdnCache: Record<string, string | 'pending' | 'error'> = {}
const cdnWaiters: Record<string, Array<(svg: string | null) => void>> = {}

function fetchCdnSvg(iconId: string): Promise<string | null> {
  if (cdnCache[iconId] && cdnCache[iconId] !== 'pending') {
    const v = cdnCache[iconId]
    return Promise.resolve(v === 'error' ? null : (v as string))
  }
  if (cdnCache[iconId] === 'pending') {
    return new Promise((res) => {
      ;(cdnWaiters[iconId] = cdnWaiters[iconId] || []).push(res)
    })
  }
  cdnCache[iconId] = 'pending'
  const url = awardsIconCdnUrl(iconId)
  if (!url) {
    cdnCache[iconId] = 'error'
    return Promise.resolve(null)
  }
  return fetch(url)
    .then((r) => (r.ok ? r.text() : null))
    .then((txt) => {
      cdnCache[iconId] = txt ? txt : 'error'
      ;(cdnWaiters[iconId] || []).forEach((cb) => cb(txt))
      delete cdnWaiters[iconId]
      return txt
    })
    .catch(() => {
      cdnCache[iconId] = 'error'
      ;(cdnWaiters[iconId] || []).forEach((cb) => cb(null))
      delete cdnWaiters[iconId]
      return null
    })
}

interface AwardIconProps {
  iconId?: string | null
  iconDataUrl?: string | null
  color: string
  size: number
  // Round only matters for the data-URL image fallback (square photos crop to
  // a circle on award cards). The SVG path always fills the parent.
  rounded?: boolean
}

// Renders the visual for an award. Priority matches docs/js/render/awards.js's
// awardsIconBody():
//   1. photo upload (icon_data_url) → <Image>
//   2. featured icon (inlined SVG string from the manifest) → <SvgXml>
//   3. non-featured icon (fetched from iconify CDN) → <SvgXml>
//   4. fallback trophy → <SvgXml>
export function AwardIcon({
  iconId,
  iconDataUrl,
  color,
  size,
  rounded,
}: AwardIconProps) {
  // Recolor the SVG by injecting `fill="<color>"` on the root <svg> tag and
  // replacing `currentColor` (iconify icons commonly use it). This mirrors the
  // companion site's CSS strategy where `.awards-icon-mask { background:
  // currentColor }` and SVG paths use `fill: currentColor`.
  const recolor = (svg: string): string => recolorSvg(svg, color)

  const manifest = getAwardsManifest()
  const featuredSvg = iconId && manifest?.featuredSvgs[iconId]
  const [cdnSvg, setCdnSvg] = useState<string | null>(null)
  const lastRequested = useRef<string | null>(null)

  useEffect(() => {
    if (iconDataUrl || !iconId || featuredSvg) return
    lastRequested.current = iconId
    fetchCdnSvg(iconId).then((svg) => {
      if (lastRequested.current === iconId) setCdnSvg(svg)
    })
    return () => {
      // Drop the result if the icon switched before fetch resolves.
      lastRequested.current = null
    }
  }, [iconId, iconDataUrl, featuredSvg])

  if (iconDataUrl) {
    return (
      <Image
        source={{ uri: iconDataUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: rounded ? size / 2 : 0,
        }}
        resizeMode="cover"
      />
    )
  }
  const svg =
    (featuredSvg && recolor(featuredSvg)) ||
    (cdnSvg && recolor(cdnSvg)) ||
    recolor(AWARDS_FALLBACK_SVG)
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  )
}

function recolorSvg(svg: string, color: string): string {
  let out = svg
  // currentColor is iconify's standard "use my CSS color" sentinel. Replace
  // all instances so fills, strokes, and gradient stops all pick up the tint.
  out = out.split('currentColor').join(color)
  // For icons that hardcode their own fill (game-icons set), inject a fill on
  // the root <svg> tag if one isn't already present. We only want to override
  // when no explicit fill exists, so the icon's intended colors win.
  if (!/<svg[^>]*\sfill\s*=/.test(out)) {
    out = out.replace(/<svg\b/, `<svg fill="${color}"`)
  }
  return out
}
