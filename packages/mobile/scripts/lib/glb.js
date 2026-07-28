// Shared machinery for the procedural .glb generators
// (generate-space-models.js, generate-psychedelic-models.js).
//
// Extracted so a second theme's generator doesn't have to duplicate the buffer
// writer, the mat4 helpers or the primitive set. Anything genuinely specific to
// one theme's geometry stays in that theme's script.
//
// ── Design rules baked into this module ──────────────────────────────────────
//  • LOW POLY ON PURPOSE. Every model built with these primitives is a few
//    thousand triangles. The themes have to hold frame rate on low-end phones,
//    and the cheapest triangle is the one never submitted.
//  • NO TEXTURES. Materials are pure PBR factors. Filament's directional
//    lighting plus sensible metallic/roughness pairs carry the material read
//    without a single byte of image data.
//  • METALLIC STAYS MODERATE (≤ 0.75). There is no image-based light in these
//    scenes, and a fully metallic surface with nothing to reflect renders black.
//  • VALIDATE AT GENERATE TIME. `addNode` checks index ranges and triangle
//    counts, because a bad offset shows up on device as garbage geometry or a
//    native crash rather than as an error.

const fs = require('fs')
const path = require('path')

const TAU = Math.PI * 2

// ── mat4 helpers ────────────────────────────────────────────────────────────
// Column-major 4x4, same convention as glTF. Only used at build time to bake
// primitive placement into merged geometry, so clarity beats speed.

function m4identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

function m4multiply(a, b) {
  const out = new Array(16).fill(0)
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0
      for (let k = 0; k < 4; k += 1) {
        sum += a[k * 4 + row] * b[col * 4 + k]
      }
      out[col * 4 + row] = sum
    }
  }
  return out
}

function m4compose(...matrices) {
  return matrices.reduce((acc, m) => m4multiply(acc, m), m4identity())
}

function m4translate(x, y, z) {
  const m = m4identity()
  m[12] = x
  m[13] = y
  m[14] = z
  return m
}

function m4scale(x, y = x, z = x) {
  const m = m4identity()
  m[0] = x
  m[5] = y
  m[10] = z
  return m
}

function m4rotX(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const m = m4identity()
  m[5] = c
  m[6] = s
  m[9] = -s
  m[10] = c
  return m
}

function m4rotY(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const m = m4identity()
  m[0] = c
  m[2] = -s
  m[8] = s
  m[10] = c
  return m
}

function m4rotZ(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const m = m4identity()
  m[0] = c
  m[1] = s
  m[4] = -s
  m[5] = c
  return m
}

// ── geometry parts ──────────────────────────────────────────────────────────
// A "part" is one chunk of indexed triangles. Parts get transformed, merged by
// material, and then handed to the glb writer.

function emptyPart() {
  return { positions: [], normals: [], uvs: [], indices: [] }
}

// Applies a transform to a part's positions, and the transform's rotation
// block to its normals. Every call site here uses uniform scale, so skipping
// the inverse-transpose for normals is safe — non-uniform scale would shear
// them. Use scaleY-only boxes via `boxPart` dimensions instead.
function transformPart(part, matrix) {
  const out = emptyPart()
  out.indices = part.indices.slice()
  out.uvs = part.uvs.slice()
  for (let i = 0; i < part.positions.length; i += 3) {
    const [x, y, z] = [part.positions[i], part.positions[i + 1], part.positions[i + 2]]
    out.positions.push(
      matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
      matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
      matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    )
    const [nx, ny, nz] = [part.normals[i], part.normals[i + 1], part.normals[i + 2]]
    const rx = matrix[0] * nx + matrix[4] * ny + matrix[8] * nz
    const ry = matrix[1] * nx + matrix[5] * ny + matrix[9] * nz
    const rz = matrix[2] * nx + matrix[6] * ny + matrix[10] * nz
    const len = Math.hypot(rx, ry, rz) || 1
    out.normals.push(rx / len, ry / len, rz / len)
  }
  return out
}

function mergeParts(parts) {
  const out = emptyPart()
  parts.forEach((part) => {
    const offset = out.positions.length / 3
    out.positions.push(...part.positions)
    out.normals.push(...part.normals)
    out.uvs.push(...part.uvs)
    part.indices.forEach((index) => out.indices.push(index + offset))
  })
  return out
}

// Stitches a (rows × cols) vertex grid into triangles. `wrapCols` closes the
// seam for primitives whose columns wrap all the way around (sphere, torus).
function gridIndices(rows, cols, wrapCols) {
  const indices = []
  const stride = wrapCols ? cols : cols + 1
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const nextCol = wrapCols ? (col + 1) % cols : col + 1
      const a = row * stride + col
      const b = row * stride + nextCol
      const c = (row + 1) * stride + col
      const d = (row + 1) * stride + nextCol
      indices.push(a, c, b, b, c, d)
    }
  }
  return indices
}

// UV sphere, centred on the origin, poles on ±Y.
function spherePart(radius, segments = 16, rings = 10) {
  const part = emptyPart()
  for (let ring = 0; ring <= rings; ring += 1) {
    const v = ring / rings
    const theta = v * Math.PI
    const sinTheta = Math.sin(theta)
    const cosTheta = Math.cos(theta)
    for (let seg = 0; seg < segments; seg += 1) {
      const u = seg / segments
      const phi = u * TAU
      const nx = Math.cos(phi) * sinTheta
      const ny = cosTheta
      const nz = Math.sin(phi) * sinTheta
      part.positions.push(nx * radius, ny * radius, nz * radius)
      part.normals.push(nx, ny, nz)
      part.uvs.push(u, v)
    }
  }
  part.indices = gridIndices(rings, segments, true)
  return part
}

// Torus lying in the XY plane, so its axis of rotation is +Z.
function torusPart(majorRadius, minorRadius, majorSegments = 40, minorSegments = 8) {
  const part = emptyPart()
  for (let i = 0; i <= majorSegments; i += 1) {
    const u = (i % majorSegments) / majorSegments
    const angle = u * TAU
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    for (let j = 0; j < minorSegments; j += 1) {
      const v = j / minorSegments
      const tubeAngle = v * TAU
      const cosT = Math.cos(tubeAngle)
      const sinT = Math.sin(tubeAngle)
      const nx = cosA * cosT
      const ny = sinA * cosT
      const nz = sinT
      part.positions.push(
        cosA * majorRadius + nx * minorRadius,
        sinA * majorRadius + ny * minorRadius,
        nz * minorRadius,
      )
      part.normals.push(nx, ny, nz)
      part.uvs.push(u, v)
    }
  }
  part.indices = gridIndices(majorSegments, minorSegments, true)
  return part
}

// Cylinder along +Z, centred on the origin. `sides` low (6, 8) reads as a
// machined hex/oct extrusion rather than a tube — used for struts and bosses.
function cylinderPart(radius, length, sides = 16, capped = true) {
  const part = emptyPart()
  const halfLength = length / 2
  // Side wall: duplicated rings so the side normals stay perpendicular to the
  // axis instead of being averaged into the caps.
  for (let end = 0; end < 2; end += 1) {
    const z = end === 0 ? -halfLength : halfLength
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * TAU
      const nx = Math.cos(angle)
      const ny = Math.sin(angle)
      part.positions.push(nx * radius, ny * radius, z)
      part.normals.push(nx, ny, 0)
      part.uvs.push(side / sides, end)
    }
  }
  part.indices = gridIndices(1, sides, true)

  if (capped) {
    for (let end = 0; end < 2; end += 1) {
      const z = end === 0 ? -halfLength : halfLength
      const normalZ = end === 0 ? -1 : 1
      const centre = part.positions.length / 3
      part.positions.push(0, 0, z)
      part.normals.push(0, 0, normalZ)
      part.uvs.push(0.5, 0.5)
      for (let side = 0; side < sides; side += 1) {
        const angle = (side / sides) * TAU
        part.positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, z)
        part.normals.push(0, 0, normalZ)
        part.uvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5)
      }
      for (let side = 0; side < sides; side += 1) {
        const a = centre + 1 + side
        const b = centre + 1 + ((side + 1) % sides)
        if (normalZ > 0) part.indices.push(centre, a, b)
        else part.indices.push(centre, b, a)
      }
    }
  }
  return part
}

// Hollow ring with thickness — a docking collar / iris housing. Axis is +Z.
function tubePart(outerRadius, innerRadius, length, sides = 24) {
  const halfLength = length / 2
  const parts = []

  // Outer + inner walls (inner wall's normals point inward).
  ;[
    { radius: outerRadius, sign: 1 },
    { radius: innerRadius, sign: -1 },
  ].forEach(({ radius, sign }) => {
    const wall = emptyPart()
    for (let end = 0; end < 2; end += 1) {
      const z = end === 0 ? -halfLength : halfLength
      for (let side = 0; side < sides; side += 1) {
        const angle = (side / sides) * TAU
        const nx = Math.cos(angle)
        const ny = Math.sin(angle)
        wall.positions.push(nx * radius, ny * radius, z)
        wall.normals.push(nx * sign, ny * sign, 0)
        wall.uvs.push(side / sides, end)
      }
    }
    wall.indices = gridIndices(1, sides, true)
    if (sign < 0) wall.indices.reverse()
    parts.push(wall)
  })

  // Flat annular faces on both ends.
  for (let end = 0; end < 2; end += 1) {
    const z = end === 0 ? -halfLength : halfLength
    const normalZ = end === 0 ? -1 : 1
    const face = emptyPart()
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * TAU
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      face.positions.push(cosA * innerRadius, sinA * innerRadius, z)
      face.normals.push(0, 0, normalZ)
      face.uvs.push(side / sides, 0)
    }
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * TAU
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      face.positions.push(cosA * outerRadius, sinA * outerRadius, z)
      face.normals.push(0, 0, normalZ)
      face.uvs.push(side / sides, 1)
    }
    for (let side = 0; side < sides; side += 1) {
      const next = (side + 1) % sides
      const inner = side
      const innerNext = next
      const outer = sides + side
      const outerNext = sides + next
      if (normalZ > 0) face.indices.push(inner, outer, innerNext, innerNext, outer, outerNext)
      else face.indices.push(inner, innerNext, outer, innerNext, outerNext, outer)
    }
    parts.push(face)
  }

  return mergeParts(parts)
}

// Flat annulus facing +Z — the pod's iris and flare rings.
function annulusPart(outerRadius, innerRadius, sides = 32) {
  const part = emptyPart()
  for (let side = 0; side < sides; side += 1) {
    const angle = (side / sides) * TAU
    part.positions.push(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius, 0)
    part.normals.push(0, 0, 1)
    part.uvs.push(side / sides, 0)
  }
  for (let side = 0; side < sides; side += 1) {
    const angle = (side / sides) * TAU
    part.positions.push(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius, 0)
    part.normals.push(0, 0, 1)
    part.uvs.push(side / sides, 1)
  }
  for (let side = 0; side < sides; side += 1) {
    const next = (side + 1) % sides
    part.indices.push(side, sides + side, next, next, sides + side, sides + next)
  }
  return part
}

// Axis-aligned box centred on the origin. Flat-shaded (per-face normals) so
// the machined edges stay crisp.
function boxPart(width, height, depth) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const halfDepth = depth / 2
  const faces = [
    { normal: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { normal: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { normal: [1, 0, 0], corners: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { normal: [-1, 0, 0], corners: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
    { normal: [0, 1, 0], corners: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
    { normal: [0, -1, 0], corners: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  ]
  const part = emptyPart()
  faces.forEach((face) => {
    const base = part.positions.length / 3
    face.corners.forEach(([x, y, z], index) => {
      part.positions.push(x * halfWidth, y * halfHeight, z * halfDepth)
      part.normals.push(...face.normal)
      part.uvs.push(index === 1 || index === 2 ? 1 : 0, index >= 2 ? 1 : 0)
    })
    part.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  })
  return part
}

// ── chamfered plate ─────────────────────────────────────────────────────────
// The theme's panel silhouette as real geometry: a rectangle with the top-left
// and bottom-right corners cut at 45°, extruded, with a bevelled front face.
//
// This is what the tab bar's selector is built from. An earlier version used a
// hex collar and the feedback was that it read as an unidentifiable blob — a
// plate that matches the exact outline of every card on screen reads
// immediately as "the selected slot", and the bevel is what catches the light
// as it travels.

/** Outline points (CCW, +Z toward viewer) for a chamfered rectangle. */
function chamferRing(width, height, cut) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const c = Math.max(0, Math.min(cut, Math.min(halfWidth, halfHeight)))
  return [
    [-halfWidth, -halfHeight],
    [halfWidth - c, -halfHeight],
    [halfWidth, -halfHeight + c], // bottom-right chamfer
    [halfWidth, halfHeight],
    [-halfWidth + c, halfHeight],
    [-halfWidth, halfHeight - c], // top-left chamfer
  ]
}

/** Triangle fan over a convex outline, facing ±Z. */
function ringFacePart(ring, z, normalZ) {
  const part = emptyPart()
  const cx = ring.reduce((sum, point) => sum + point[0], 0) / ring.length
  const cy = ring.reduce((sum, point) => sum + point[1], 0) / ring.length
  part.positions.push(cx, cy, z)
  part.normals.push(0, 0, normalZ)
  part.uvs.push(0.5, 0.5)
  ring.forEach(([x, y]) => {
    part.positions.push(x, y, z)
    part.normals.push(0, 0, normalZ)
    part.uvs.push(0.5, 0.5)
  })
  for (let index = 0; index < ring.length; index += 1) {
    const a = 1 + index
    const b = 1 + ((index + 1) % ring.length)
    if (normalZ > 0) part.indices.push(0, a, b)
    else part.indices.push(0, b, a)
  }
  return part
}

/**
 * Quad band between two outlines at two depths, with normals derived from the
 * band's own slope — so one function covers a 45° bevel, a straight side wall,
 * and a flat in-plane band.
 *
 * WINDING MATTERS. Triangles are emitted (a, c, b) / (b, c, d) and the normal is
 * (c-a) × (b-a): the pair is what makes the band front-facing for CCW input
 * rings. Emitting (a, b, c) instead — the intuitive order — produces a band that
 * faces *away* from the camera, gets back-face culled, and turns the selector
 * into an unlit dark blob. That was a real bug here, not a hypothetical.
 */
function ringBandPart(fromRing, fromZ, toRing, toZ) {
  const part = emptyPart()
  const count = fromRing.length
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count
    const a = [fromRing[index][0], fromRing[index][1], fromZ]
    const b = [fromRing[next][0], fromRing[next][1], fromZ]
    const c = [toRing[index][0], toRing[index][1], toZ]
    const d = [toRing[next][0], toRing[next][1], toZ]
    const e1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const e2 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    let nx = e1[1] * e2[2] - e1[2] * e2[1]
    let ny = e1[2] * e2[0] - e1[0] * e2[2]
    let nz = e1[0] * e2[1] - e1[1] * e2[0]
    const length = Math.hypot(nx, ny, nz) || 1
    nx /= length
    ny /= length
    nz /= length
    const base = part.positions.length / 3
    ;[a, b, c, d].forEach((point) => {
      part.positions.push(point[0], point[1], point[2])
      part.normals.push(nx, ny, nz)
    })
    part.uvs.push(0, 0, 1, 0, 0, 1, 1, 1)
    part.indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
  }
  return part
}

/**
 * Extruded chamfered plate, returned as SEPARATE parts so each surface can take
 * its own material. That split is the point: the face is a lit ice panel, the
 * 45° bevel is polished steel that catches the key light, and the side wall is
 * darker titanium. One merged mesh would flatten the whole thing to a silhouette.
 */
function chamferedPlateParts(width, height, depth, cut, bevel) {
  const outer = chamferRing(width, height, cut)
  const inner = chamferRing(width - bevel * 2, height - bevel * 2, cut - bevel)
  const frontZ = depth / 2
  const backZ = -depth / 2
  return {
    face: ringFacePart(inner, frontZ, 1),
    bevel: ringBandPart(inner, frontZ, outer, frontZ - bevel),
    wall: ringBandPart(outer, frontZ - bevel, outer, backZ),
    back: ringFacePart(outer, backZ, -1),
  }
}

/** Flat band tracing a chamfered outline — used for the selector's flare ring. */
function chamferBandPart(width, height, cut, thickness) {
  const outer = chamferRing(width, height, cut)
  const inner = chamferRing(width - thickness * 2, height - thickness * 2, cut - thickness)
  return ringBandPart(inner, 0, outer, 0)
}

// A chamfered regular prism: `sides`-sided extrusion whose front and back
// faces are ringed by a 45° cut. This is the theme's signature silhouette —
// the same cut-corner geometry the 2D panels draw in SVG — so the nav pod's
// collar reads as the same machined family as every card on screen.
function chamferedPrismPart(sides, outerRadius, length, chamfer, innerRadius = 0) {
  const halfLength = length / 2
  const rings = [
    { radius: outerRadius - chamfer, z: -halfLength },
    { radius: outerRadius, z: -halfLength + chamfer },
    { radius: outerRadius, z: halfLength - chamfer },
    { radius: outerRadius - chamfer, z: halfLength },
  ]
  const part = emptyPart()

  // Outer skin: three bands (front chamfer, straight wall, back chamfer). Each
  // band gets its own duplicated ring pair so normals stay per-band.
  for (let band = 0; band < 3; band += 1) {
    const from = rings[band]
    const to = rings[band + 1]
    const bandPart = emptyPart()
    // Band normal tilts with the chamfer: radial for the wall, 45° for cuts.
    const dr = to.radius - from.radius
    const dz = to.z - from.z
    const len = Math.hypot(dr, dz) || 1
    const radialComponent = dz / len
    const axialComponent = -dr / len
    ;[from, to].forEach((ring, end) => {
      for (let side = 0; side < sides; side += 1) {
        const angle = (side / sides) * TAU
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        bandPart.positions.push(cosA * ring.radius, sinA * ring.radius, ring.z)
        bandPart.normals.push(cosA * radialComponent, sinA * radialComponent, axialComponent)
        bandPart.uvs.push(side / sides, end)
      }
    })
    bandPart.indices = gridIndices(1, sides, true)
    // Each band contributes exactly two rings of `sides` vertices, so the
    // running vertex offset is a plain multiple of the band index.
    const offset = band * 2 * sides
    part.positions.push(...bandPart.positions)
    part.normals.push(...bandPart.normals)
    part.uvs.push(...bandPart.uvs)
    bandPart.indices.forEach((index) => part.indices.push(index + offset))
  }

  // End faces — annular when hollow, solid fans otherwise.
  const endParts = []
  for (let end = 0; end < 2; end += 1) {
    const ring = end === 0 ? rings[0] : rings[3]
    const normalZ = end === 0 ? -1 : 1
    if (innerRadius > 0) {
      const face = annulusPart(ring.radius, innerRadius, sides)
      const placed = transformPart(
        normalZ > 0 ? face : transformPart(face, m4rotY(Math.PI)),
        m4translate(0, 0, ring.z),
      )
      endParts.push(placed)
    } else {
      const face = emptyPart()
      face.positions.push(0, 0, ring.z)
      face.normals.push(0, 0, normalZ)
      face.uvs.push(0.5, 0.5)
      for (let side = 0; side < sides; side += 1) {
        const angle = (side / sides) * TAU
        face.positions.push(Math.cos(angle) * ring.radius, Math.sin(angle) * ring.radius, ring.z)
        face.normals.push(0, 0, normalZ)
        face.uvs.push(0.5, 0.5)
      }
      for (let side = 0; side < sides; side += 1) {
        const a = 1 + side
        const b = 1 + ((side + 1) % sides)
        if (normalZ > 0) face.indices.push(0, a, b)
        else face.indices.push(0, b, a)
      }
      endParts.push(face)
    }
  }

  // Inner bore wall, so a hollow collar isn't see-through.
  if (innerRadius > 0) {
    const bore = emptyPart()
    for (let end = 0; end < 2; end += 1) {
      const z = end === 0 ? rings[0].z : rings[3].z
      for (let side = 0; side < sides; side += 1) {
        const angle = (side / sides) * TAU
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        bore.positions.push(cosA * innerRadius, sinA * innerRadius, z)
        bore.normals.push(-cosA, -sinA, 0)
        bore.uvs.push(side / sides, end)
      }
    }
    bore.indices = gridIndices(1, sides, true)
    bore.indices.reverse()
    endParts.push(bore)
  }

  return mergeParts([part, ...endParts])
}

// ── glb writer ──────────────────────────────────────────────────────────────
// One builder per output file. Accumulates buffer views + accessors, then
// serialises a single-buffer .glb.

class GlbBuilder {
  constructor(generatorName) {
    this.generatorName = generatorName
    this.chunks = []
    this.byteLength = 0
    this.bufferViews = []
    this.accessors = []
    this.meshes = []
    this.nodes = []
    this.materials = []
    this.materialIndexByName = new Map()
  }

  appendBuffer(data, target) {
    const byteOffset = this.byteLength
    const padded = Buffer.alloc((data.length + 3) & ~3)
    data.copy(padded)
    this.chunks.push(padded)
    this.byteLength += padded.length
    const view = { buffer: 0, byteOffset, byteLength: data.length }
    if (target != null) view.target = target
    this.bufferViews.push(view)
    return this.bufferViews.length - 1
  }

  addFloatAccessor(values, type, components) {
    const data = Buffer.alloc(values.length * 4)
    values.forEach((value, index) => data.writeFloatLE(value, index * 4))
    const bufferView = this.appendBuffer(data, 34962)
    const accessor = {
      bufferView,
      componentType: 5126,
      count: values.length / components,
      type,
    }
    // glTF requires min/max on the POSITION accessor; Filament also uses it
    // for the model's bounding box, which our camera framing depends on.
    if (components === 3 && type === 'VEC3') {
      const min = [Infinity, Infinity, Infinity]
      const max = [-Infinity, -Infinity, -Infinity]
      for (let i = 0; i < values.length; i += 3) {
        for (let axis = 0; axis < 3; axis += 1) {
          min[axis] = Math.min(min[axis], values[i + axis])
          max[axis] = Math.max(max[axis], values[i + axis])
        }
      }
      accessor.min = min
      accessor.max = max
    }
    this.accessors.push(accessor)
    return this.accessors.length - 1
  }

  addIndexAccessor(values) {
    const data = Buffer.alloc(values.length * 2)
    values.forEach((value, index) => data.writeUInt16LE(value, index * 2))
    const bufferView = this.appendBuffer(data, 34963)
    this.accessors.push({
      bufferView,
      componentType: 5123,
      count: values.length,
      type: 'SCALAR',
      min: [Math.min(...values)],
      max: [Math.max(...values)],
    })
    return this.accessors.length - 1
  }

  material(definition) {
    const existing = this.materialIndexByName.get(definition.name)
    if (existing != null) return existing
    this.materials.push(definition)
    const index = this.materials.length - 1
    this.materialIndexByName.set(definition.name, index)
    return index
  }

  // `groups` is [{ material, parts: [...] }]. Parts sharing a material are
  // merged into one primitive so each node is a single draw call per material.
  addNode(name, groups) {
    const primitives = groups
      .filter((group) => group.parts.length > 0)
      .map((group) => {
        const geometry = mergeParts(group.parts)
        const vertexCount = geometry.positions.length / 3
        if (vertexCount > 65535) {
          throw new Error(
            `${name}: ${vertexCount} vertices exceeds the uint16 index limit`,
          )
        }
        // Catches primitive-builder offset mistakes at generate time rather
        // than as garbage geometry (or a native crash) on device.
        const maxIndex = Math.max(...geometry.indices)
        if (maxIndex >= vertexCount) {
          throw new Error(
            `${name}/${group.material.name}: index ${maxIndex} is out of range for ` +
              `${vertexCount} vertices`,
          )
        }
        if (geometry.indices.length % 3 !== 0) {
          throw new Error(
            `${name}/${group.material.name}: ${geometry.indices.length} indices is not a whole number of triangles`,
          )
        }
        return {
          attributes: {
            POSITION: this.addFloatAccessor(geometry.positions, 'VEC3', 3),
            NORMAL: this.addFloatAccessor(geometry.normals, 'VEC3', 3),
            TEXCOORD_0: this.addFloatAccessor(geometry.uvs, 'VEC2', 2),
          },
          indices: this.addIndexAccessor(geometry.indices),
          material: this.material(group.material),
        }
      })
    this.meshes.push({ name: `${name}Mesh`, primitives })
    this.nodes.push({ name, mesh: this.meshes.length - 1 })
    return this.nodes.length - 1
  }

  write(outputPath) {
    // Root node parents every part so a single transform can move the whole
    // model, while named children stay individually addressable from JS via
    // <EntitySelector byName="…"> and the transform manager.
    const childIndices = this.nodes.map((_, index) => index)
    const nodes = [...this.nodes, { name: 'Root', children: childIndices }]
    const binary = Buffer.concat(this.chunks)
    const gltf = {
      asset: { version: '2.0', generator: this.generatorName },
      scene: 0,
      scenes: [{ nodes: [nodes.length - 1] }],
      nodes,
      meshes: this.meshes,
      materials: this.materials,
      accessors: this.accessors,
      bufferViews: this.bufferViews,
      buffers: [{ byteLength: binary.length }],
    }

    const jsonBuffer = Buffer.from(JSON.stringify(gltf))
    const paddedJson = Buffer.alloc((jsonBuffer.length + 3) & ~3, 0x20)
    jsonBuffer.copy(paddedJson)

    const header = Buffer.alloc(12)
    header.writeUInt32LE(0x46546c67, 0) // "glTF"
    header.writeUInt32LE(2, 4)
    header.writeUInt32LE(12 + 8 + paddedJson.length + 8 + binary.length, 8)

    const jsonHeader = Buffer.alloc(8)
    jsonHeader.writeUInt32LE(paddedJson.length, 0)
    jsonHeader.writeUInt32LE(0x4e4f534a, 4) // "JSON"

    const binaryHeader = Buffer.alloc(8)
    binaryHeader.writeUInt32LE(binary.length, 0)
    binaryHeader.writeUInt32LE(0x004e4942, 4) // "BIN"

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(
      outputPath,
      Buffer.concat([header, jsonHeader, paddedJson, binaryHeader, binary]),
    )
    const triangles = this.meshes.reduce(
      (total, mesh) =>
        total +
        mesh.primitives.reduce((sum, prim) => sum + this.accessors[prim.indices].count / 3, 0),
      0,
    )
    console.log(
      `${path.basename(outputPath)}  ${(binary.length / 1024).toFixed(1)} KB binary, ` +
        `${triangles} triangles, ${this.nodes.length} nodes`,
    )
  }
}

module.exports = {
  TAU,
  m4identity,
  m4multiply,
  m4compose,
  m4translate,
  m4scale,
  m4rotX,
  m4rotY,
  m4rotZ,
  emptyPart,
  transformPart,
  mergeParts,
  gridIndices,
  spherePart,
  torusPart,
  cylinderPart,
  tubePart,
  annulusPart,
  boxPart,
  chamferRing,
  ringFacePart,
  ringBandPart,
  chamferedPlateParts,
  chamferBandPart,
  chamferedPrismPart,
  GlbBuilder,
}
