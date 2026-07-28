const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const earcutModule = require('earcut')
const delauneyFont = require('./delauney-glyphs.json')

const earcut = earcutModule.default || earcutModule

const OUTPUT_PATH = path.resolve(
  __dirname,
  '../assets/models/nword-pass.glb',
)
const OBAMA_INLAY_PATH = path.resolve(
  __dirname,
  '../assets/models/obama-inlay.png',
)
const MLK_INLAY_PATH = path.resolve(
  __dirname,
  '../assets/models/mlk-inlay.png',
)
const BLACK_PANTHER_INLAY_PATH = path.resolve(
  __dirname,
  '../assets/models/black-panther-inlay.png',
)
const RYAN_GOSLING_INLAY_PATH = path.resolve(
  __dirname,
  '../assets/models/ryan-gosling-inlay.png',
)

const chunks = []
const bufferViews = []
const accessors = []

function align4(value) {
  return (value + 3) & ~3
}

function appendBuffer(data, target) {
  const offset = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const paddedLength = align4(data.length)
  const padded = Buffer.alloc(paddedLength)
  data.copy(padded)
  chunks.push(padded)

  const view = {
    buffer: 0,
    byteOffset: offset,
    byteLength: data.length,
  }
  if (target != null) view.target = target
  bufferViews.push(view)
  return bufferViews.length - 1
}

function addFloatAccessor(values, type, components, min, max) {
  const data = Buffer.alloc(values.length * 4)
  values.forEach((value, index) => data.writeFloatLE(value, index * 4))
  const bufferView = appendBuffer(data, 34962)
  accessors.push({
    bufferView,
    componentType: 5126,
    count: values.length / components,
    type,
    min,
    max,
  })
  return accessors.length - 1
}

function addIndexAccessor(values) {
  const data = Buffer.alloc(values.length * 2)
  values.forEach((value, index) => data.writeUInt16LE(value, index * 2))
  const bufferView = appendBuffer(data, 34963)
  accessors.push({
    bufferView,
    componentType: 5123,
    count: values.length,
    type: 'SCALAR',
    min: [Math.min(...values)],
    max: [Math.max(...values)],
  })
  return accessors.length - 1
}

function bounds(values) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], values[index + axis])
      max[axis] = Math.max(max[axis], values[index + axis])
    }
  }
  return { min, max }
}

function roundedRing(width, height, radius, z, segments = 10) {
  const points = []
  const centers = [
    [width / 2 - radius, height / 2 - radius, 0],
    [-width / 2 + radius, height / 2 - radius, Math.PI / 2],
    [-width / 2 + radius, -height / 2 + radius, Math.PI],
    [width / 2 - radius, -height / 2 + radius, Math.PI * 1.5],
  ]

  centers.forEach(([centerX, centerY, startAngle], cornerIndex) => {
    for (let step = 0; step <= segments; step += 1) {
      // Avoid duplicate points where neighboring rounded corners meet.
      if (points.length > 0 && step === 0) continue
      if (cornerIndex === centers.length - 1 && step === segments) continue
      const angle = startAngle + (step / segments) * (Math.PI / 2)
      points.push([
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
        z,
      ])
    }
  })

  return points
}

function normalForSide(a, b) {
  const edgeX = b[0] - a[0]
  const edgeY = b[1] - a[1]
  const length = Math.hypot(edgeX, edgeY) || 1
  return [edgeY / length, -edgeX / length, 0]
}

function createFace(ring, normalZ) {
  const width = 3.37
  const height = 2.125
  const centerX =
    ring.reduce((total, point) => total + point[0], 0) / ring.length
  const centerY =
    ring.reduce((total, point) => total + point[1], 0) / ring.length
  const positions = [centerX, centerY, ring[0][2]]
  const normals = [0, 0, normalZ]
  const uvs = [centerX / width + 0.5, centerY / height + 0.5]
  const indices = []

  ring.forEach(([x, y, z]) => {
    positions.push(x, y, z)
    normals.push(0, 0, normalZ)
    uvs.push(x / width + 0.5, y / height + 0.5)
  })

  for (let index = 0; index < ring.length; index += 1) {
    const next = (index + 1) % ring.length
    if (normalZ > 0) {
      indices.push(0, index + 1, next + 1)
    } else {
      indices.push(0, next + 1, index + 1)
    }
  }

  return { positions, normals, uvs, indices }
}

function createRingBridge(inner, outer, frontFacing) {
  const positions = []
  const normals = []
  const uvs = []
  const indices = []
  const width = 3.37
  const height = 2.125

  inner.forEach(([x, y, z], index) => {
    const next = (index + 1) % inner.length
    const sideNormal = normalForSide(inner[index], inner[next])
    positions.push(x, y, z)
    normals.push(
      sideNormal[0] * 0.34,
      sideNormal[1] * 0.34,
      frontFacing ? 0.94 : -0.94,
    )
    uvs.push(x / width + 0.5, y / height + 0.5)
  })
  outer.forEach(([x, y, z], index) => {
    const next = (index + 1) % outer.length
    const sideNormal = normalForSide(outer[index], outer[next])
    positions.push(x, y, z)
    normals.push(
      sideNormal[0] * 0.72,
      sideNormal[1] * 0.72,
      frontFacing ? 0.69 : -0.69,
    )
    uvs.push(x / width + 0.5, y / height + 0.5)
  })

  const offset = inner.length
  for (let index = 0; index < inner.length; index += 1) {
    const next = (index + 1) % inner.length
    if (frontFacing) {
      indices.push(index, offset + index, offset + next)
      indices.push(index, offset + next, next)
    } else {
      indices.push(index, offset + next, offset + index)
      indices.push(index, next, offset + next)
    }
  }

  return { positions, normals, uvs, indices }
}

function createSide(front, back) {
  const positions = []
  const normals = []
  const uvs = []
  const indices = []

  for (let index = 0; index < front.length; index += 1) {
    const next = (index + 1) % front.length
    const normal = normalForSide(front[index], front[next])
    const u = index / front.length
    positions.push(...front[index], ...front[next], ...back[next], ...back[index])
    normals.push(...normal, ...normal, ...normal, ...normal)
    uvs.push(u, 1, (index + 1) / front.length, 1, (index + 1) / front.length, 0, u, 0)
    const base = index * 4
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  return { positions, normals, uvs, indices }
}

function createRaisedRail() {
  const width = 0.032
  const height = 1.22
  const radius = width / 2
  const front = roundedRing(width, height, radius, 0.071, 6).map(
    ([x, y, z]) => [x - 1.37, y, z],
  )
  const back = roundedRing(width, height, radius, 0.059, 6).map(
    ([x, y, z]) => [x - 1.37, y, z],
  )
  const face = createFace(front, 1)
  const side = createSide(front, back)
  return {
    positions: [...face.positions, ...side.positions],
    normals: [...face.normals, ...side.normals],
    uvs: [...face.uvs, ...side.uvs],
    indices: [
      ...face.indices,
      ...side.indices.map((index) => index + face.positions.length / 3),
    ],
  }
}

function mergeGeometry(parts) {
  const merged = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
  }

  parts.forEach(part => {
    const offset = merged.positions.length / 3
    merged.positions.push(...part.positions)
    merged.normals.push(...part.normals)
    merged.uvs.push(...part.uvs)
    merged.indices.push(...part.indices.map(index => index + offset))
  })

  return merged
}

function polygonArea(contour) {
  let area = 0
  for (let index = 0; index < contour.length; index += 1) {
    const [x1, y1] = contour[index]
    const [x2, y2] = contour[(index + 1) % contour.length]
    area += x1 * y2 - x2 * y1
  }
  return area / 2
}

function pointInPolygon([x, y], contour) {
  let inside = false
  for (
    let index = 0, previous = contour.length - 1;
    index < contour.length;
    previous = index, index += 1
  ) {
    const [x1, y1] = contour[index]
    const [x2, y2] = contour[previous]
    if (
      y1 > y !== y2 > y &&
      x < ((x2 - x1) * (y - y1)) / (y2 - y1 || 1) + x1
    ) {
      inside = !inside
    }
  }
  return inside
}

function classifyContours(contours) {
  const entries = contours.map(contour => ({
    contour,
    area: Math.abs(polygonArea(contour)),
    parent: null,
    depth: 0,
  }))

  entries.forEach((entry, index) => {
    let parentArea = Infinity
    entries.forEach((candidate, candidateIndex) => {
      if (
        candidateIndex !== index &&
        candidate.area > entry.area &&
        candidate.area < parentArea &&
        pointInPolygon(entry.contour[0], candidate.contour)
      ) {
        entry.parent = candidateIndex
        parentArea = candidate.area
      }
    })
  })

  const resolveDepth = index => {
    const entry = entries[index]
    if (entry.parent == null) return 0
    return resolveDepth(entry.parent) + 1
  }
  entries.forEach((entry, index) => {
    entry.depth = resolveDepth(index)
  })

  return entries
    .map((entry, index) => ({ ...entry, index }))
    .filter(entry => entry.depth % 2 === 0)
    .map(entry => [
      entry.contour,
      ...entries
        .map((candidate, index) => ({ ...candidate, index }))
        .filter(
          candidate =>
            candidate.parent === entry.index &&
            candidate.depth === entry.depth + 1,
        )
        .map(candidate => candidate.contour),
    ])
}

function createExtrudedPolygon(contours, transform, zA, zB) {
  const zMin = Math.min(zA, zB)
  const zMax = Math.max(zA, zB)
  const transformed = contours.map(contour => contour.map(transform))
  const flat = []
  const holes = []
  transformed.forEach((contour, contourIndex) => {
    if (contourIndex > 0) holes.push(flat.length / 2)
    contour.forEach(([x, y]) => flat.push(x, y))
  })

  const triangles = earcut(flat, holes, 2)
  const positions = []
  const normals = []
  const uvs = []
  const indices = []
  const pointCount = flat.length / 2

  for (let point = 0; point < pointCount; point += 1) {
    const x = flat[point * 2]
    const y = flat[point * 2 + 1]
    positions.push(x, y, zMax)
    normals.push(0, 0, 1)
    uvs.push(x / 3.37 + 0.5, y / 2.125 + 0.5)
  }
  triangles.forEach(index => indices.push(index))

  const backOffset = positions.length / 3
  for (let point = 0; point < pointCount; point += 1) {
    const x = flat[point * 2]
    const y = flat[point * 2 + 1]
    positions.push(x, y, zMin)
    normals.push(0, 0, -1)
    uvs.push(x / 3.37 + 0.5, y / 2.125 + 0.5)
  }
  for (let index = 0; index < triangles.length; index += 3) {
    indices.push(
      backOffset + triangles[index + 2],
      backOffset + triangles[index + 1],
      backOffset + triangles[index],
    )
  }

  transformed.forEach(contour => {
    const clockwise = polygonArea(contour) < 0
    for (let index = 0; index < contour.length; index += 1) {
      const [x1, y1] = contour[index]
      const [x2, y2] = contour[(index + 1) % contour.length]
      const dx = x2 - x1
      const dy = y2 - y1
      const length = Math.hypot(dx, dy) || 1
      const normal = clockwise
        ? [-dy / length, dx / length, 0]
        : [dy / length, -dx / length, 0]
      const sideOffset = positions.length / 3
      positions.push(
        x1, y1, zMin,
        x2, y2, zMin,
        x2, y2, zMax,
        x1, y1, zMax,
      )
      normals.push(...normal, ...normal, ...normal, ...normal)
      uvs.push(0, 1, 1, 1, 1, 0, 0, 0)
      indices.push(
        sideOffset,
        sideOffset + 1,
        sideOffset + 2,
        sideOffset,
        sideOffset + 2,
        sideOffset + 3,
      )
    }
  })

  return { positions, normals, uvs, indices }
}

function createDelauneyText(
  text,
  {
    x,
    y,
    scale,
    tracking = 24,
    zA,
    zB,
    mirrorX = false,
  },
) {
  const parts = []
  let cursor = 0

  for (const character of text) {
    const glyph = delauneyFont.glyphs[character]
    if (!glyph) {
      cursor += delauneyFont.unitsPerEm * 0.45 + tracking
      continue
    }
    const groups = classifyContours(glyph.contours)
    groups.forEach(contours => {
      parts.push(
        createExtrudedPolygon(
          contours,
          ([pointX, pointY]) => {
            const modelX = x + (cursor + pointX) * scale
            return [
              mirrorX ? -modelX : modelX,
              y + pointY * scale,
            ]
          },
          zA,
          zB,
        ),
      )
    })
    cursor += glyph.advance + tracking
  }

  return mergeGeometry(parts)
}

function measureDelauneyText(text, scale, tracking = 24) {
  let width = 0
  for (const character of text) {
    const glyph = delauneyFont.glyphs[character]
    width += (glyph ? glyph.advance : delauneyFont.unitsPerEm * 0.45) + tracking
  }
  return Math.max(0, (width - tracking) * scale)
}

function createCenteredDelauneyText(text, y, options) {
  return createCenteredAtDelauneyText(text, 0, y, options)
}

function createCenteredAtDelauneyText(text, centerX, y, options) {
  const width = measureDelauneyText(
    text,
    options.scale,
    options.tracking ?? 24,
  )
  return createDelauneyText(text, {
    ...options,
    x: centerX - width / 2,
    y,
  })
}

function createExtrudedBar(x1, y1, x2, y2, width, zA, zB) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const px = -uy * width * 0.5
  const py = ux * width * 0.5
  const capX = ux * width * 0.5
  const capY = uy * width * 0.5
  const zMin = Math.min(zA, zB)
  const zMax = Math.max(zA, zB)
  const outline = [
    [x1 - capX + px, y1 - capY + py],
    [x2 + capX + px, y2 + capY + py],
    [x2 + capX - px, y2 + capY - py],
    [x1 - capX - px, y1 - capY - py],
  ]
  const positions = []
  const normals = []
  const uvs = []
  const indices = []

  const addFace = (points, normal) => {
    const base = positions.length / 3
    points.forEach(([x, y, z], index) => {
      positions.push(x, y, z)
      normals.push(...normal)
      uvs.push(index === 1 || index === 2 ? 1 : 0, index >= 2 ? 1 : 0)
    })
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  addFace(
    outline.map(([x, y]) => [x, y, zMax]),
    [0, 0, 1],
  )
  addFace(
    [...outline].reverse().map(([x, y]) => [x, y, zMin]),
    [0, 0, -1],
  )
  for (let index = 0; index < 4; index += 1) {
    const next = (index + 1) % 4
    const [ax, ay] = outline[index]
    const [bx, by] = outline[next]
    const sideX = by - ay
    const sideY = -(bx - ax)
    const sideLength = Math.hypot(sideX, sideY) || 1
    addFace(
      [
        [ax, ay, zMin],
        [bx, by, zMin],
        [bx, by, zMax],
        [ax, ay, zMax],
      ],
      [sideX / sideLength, sideY / sideLength, 0],
    )
  }

  return { positions, normals, uvs, indices }
}

const GLYPH_STROKES = {
  A: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.22, 0.43, 0.78, 0.43]],
  B: [[0, 0, 0, 1], [0, 1, 0.68, 1], [0.68, 1, 0.92, 0.78], [0.92, 0.78, 0.68, 0.52], [0.68, 0.52, 0, 0.52], [0.68, 0.52, 0.94, 0.28], [0.94, 0.28, 0.68, 0], [0.68, 0, 0, 0]],
  C: [[0.92, 0.86, 0.72, 1], [0.72, 1, 0.2, 1], [0.2, 1, 0, 0.78], [0, 0.78, 0, 0.22], [0, 0.22, 0.2, 0], [0.2, 0, 0.72, 0], [0.72, 0, 0.92, 0.14]],
  D: [[0, 0, 0, 1], [0, 1, 0.62, 1], [0.62, 1, 0.94, 0.72], [0.94, 0.72, 0.94, 0.28], [0.94, 0.28, 0.62, 0], [0.62, 0, 0, 0]],
  E: [[0.92, 1, 0, 1], [0, 1, 0, 0], [0, 0.52, 0.72, 0.52], [0, 0, 0.92, 0]],
  F: [[0, 0, 0, 1], [0, 1, 0.94, 1], [0, 0.52, 0.72, 0.52]],
  G: [[0.94, 0.82, 0.72, 1], [0.72, 1, 0.2, 1], [0.2, 1, 0, 0.78], [0, 0.78, 0, 0.22], [0, 0.22, 0.2, 0], [0.2, 0, 0.76, 0], [0.76, 0, 0.94, 0.2], [0.94, 0.2, 0.94, 0.5], [0.94, 0.5, 0.54, 0.5]],
  H: [[0, 0, 0, 1], [1, 0, 1, 1], [0, 0.5, 1, 0.5]],
  I: [[0.1, 1, 0.9, 1], [0.5, 1, 0.5, 0], [0.1, 0, 0.9, 0]],
  J: [[0.06, 0.18, 0.22, 0], [0.22, 0, 0.68, 0], [0.68, 0, 0.88, 0.22], [0.88, 0.22, 0.88, 1], [0.38, 1, 0.88, 1]],
  K: [[0, 0, 0, 1], [0.94, 1, 0, 0.46], [0.3, 0.62, 1, 0]],
  L: [[0, 1, 0, 0], [0, 0, 0.94, 0]],
  M: [[0, 0, 0, 1], [0, 1, 0.5, 0.42], [0.5, 0.42, 1, 1], [1, 1, 1, 0]],
  N: [[0, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 1]],
  O: [[0.2, 0, 0, 0.22], [0, 0.22, 0, 0.78], [0, 0.78, 0.2, 1], [0.2, 1, 0.8, 1], [0.8, 1, 1, 0.78], [1, 0.78, 1, 0.22], [1, 0.22, 0.8, 0], [0.8, 0, 0.2, 0]],
  P: [[0, 0, 0, 1], [0, 1, 0.7, 1], [0.7, 1, 0.94, 0.78], [0.94, 0.78, 0.7, 0.52], [0.7, 0.52, 0, 0.52]],
  Q: [[0.2, 0, 0, 0.22], [0, 0.22, 0, 0.78], [0, 0.78, 0.2, 1], [0.2, 1, 0.8, 1], [0.8, 1, 1, 0.78], [1, 0.78, 1, 0.22], [1, 0.22, 0.8, 0], [0.8, 0, 0.2, 0], [0.58, 0.3, 1.04, -0.08]],
  R: [[0, 0, 0, 1], [0, 1, 0.7, 1], [0.7, 1, 0.94, 0.78], [0.94, 0.78, 0.7, 0.52], [0.7, 0.52, 0, 0.52], [0.54, 0.52, 1, 0]],
  S: [[0.92, 0.84, 0.72, 1], [0.72, 1, 0.2, 1], [0.2, 1, 0, 0.78], [0, 0.78, 0.2, 0.56], [0.2, 0.56, 0.74, 0.44], [0.74, 0.44, 0.94, 0.22], [0.94, 0.22, 0.74, 0], [0.74, 0, 0.18, 0], [0.18, 0, 0, 0.16]],
  T: [[0, 1, 1, 1], [0.5, 1, 0.5, 0]],
  U: [[0, 1, 0, 0.22], [0, 0.22, 0.22, 0], [0.22, 0, 0.78, 0], [0.78, 0, 1, 0.22], [1, 0.22, 1, 1]],
  V: [[0, 1, 0.5, 0], [0.5, 0, 1, 1]],
  W: [[0, 1, 0.2, 0], [0.2, 0, 0.5, 0.55], [0.5, 0.55, 0.8, 0], [0.8, 0, 1, 1]],
  X: [[0, 1, 1, 0], [0, 0, 1, 1]],
  Y: [[0, 1, 0.5, 0.52], [1, 1, 0.5, 0.52], [0.5, 0.52, 0.5, 0]],
  Z: [[0, 1, 1, 1], [1, 1, 0, 0], [0, 0, 1, 0]],
  '-': [[0.08, 0.5, 0.82, 0.5]],
  '.': [[0.42, 0, 0.46, 0]],
}

function glyphWidth(character) {
  if (character === ' ') return 0.48
  if (character === '-') return 0.62
  if (character === '.') return 0.28
  if (character === 'I') return 0.7
  return 1
}

function measureStrokeText(text, size, tracking) {
  let width = 0
  for (const character of text) {
    width += (glyphWidth(character) + tracking) * size
  }
  return Math.max(0, width - tracking * size)
}

function createStrokeText(
  text,
  {
    x,
    y,
    size,
    tracking = 0.22,
    weight,
    zA,
    zB,
    mirrorX = false,
  },
) {
  const parts = []
  let cursor = x

  for (const character of text) {
    const strokes = GLYPH_STROKES[character] || []
    strokes.forEach(([x1, y1, x2, y2]) => {
      const startX = cursor + x1 * size
      const endX = cursor + x2 * size
      parts.push(
        createExtrudedBar(
          mirrorX ? -startX : startX,
          y + y1 * size,
          mirrorX ? -endX : endX,
          y + y2 * size,
          weight,
          zA,
          zB,
        ),
      )
    })
    cursor += (glyphWidth(character) + tracking) * size
  }

  return mergeGeometry(parts)
}

function createCenteredStrokeText(text, y, options) {
  const width = measureStrokeText(text, options.size, options.tracking ?? 0.22)
  return createStrokeText(text, { ...options, x: -width / 2, y })
}

function createChamferedFrame(
  centerX,
  centerY,
  frameWidth,
  frameHeight,
  bevel,
  weight,
  zA,
  zB,
  mirrorX = false,
) {
  const left = centerX - frameWidth / 2
  const right = centerX + frameWidth / 2
  const bottom = centerY - frameHeight / 2
  const top = centerY + frameHeight / 2
  const points = [
    [left + bevel, top],
    [right - bevel, top],
    [right, top - bevel],
    [right, bottom + bevel],
    [right - bevel, bottom],
    [left + bevel, bottom],
    [left, bottom + bevel],
    [left, top - bevel],
  ]
  return mergeGeometry(
    points.map((point, index) => {
      const next = points[(index + 1) % points.length]
      return createExtrudedBar(
        mirrorX ? -point[0] : point[0],
        point[1],
        mirrorX ? -next[0] : next[0],
        next[1],
        weight,
        zA,
        zB,
      )
    }),
  )
}

function createArtworkPlane(width, height, centerX, centerY, z, flipX = false) {
  const left = centerX - width / 2
  const right = centerX + width / 2
  const bottom = centerY - height / 2
  const top = centerY + height / 2
  return {
    positions: [
      left, bottom, z,
      right, bottom, z,
      right, top, z,
      left, top, z,
    ],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    uvs: flipX
      ? [1, 1, 0, 1, 0, 0, 1, 0]
      : [0, 1, 1, 1, 1, 0, 0, 0],
    indices: [0, 1, 2, 0, 2, 3],
  }
}

function makePrimitive(geometry, material) {
  const geometryBounds = bounds(geometry.positions)
  return {
    attributes: {
      POSITION: addFloatAccessor(
        geometry.positions,
        'VEC3',
        3,
        geometryBounds.min,
        geometryBounds.max,
      ),
      NORMAL: addFloatAccessor(geometry.normals, 'VEC3', 3),
      TEXCOORD_0: addFloatAccessor(geometry.uvs, 'VEC2', 2),
    },
    indices: addIndexAccessor(geometry.indices),
    material,
  }
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const name = Buffer.from(type)
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  name.copy(result, 4)
  data.copy(result, 8)
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8)
  return result
}

function createCarbonTexture(size = 256) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  const period = 18

  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x += 1) {
      const diagonalA = (x + y) % period
      const diagonalB = (x - y + size * 4) % period
      const block = (Math.floor((x + y) / period) + Math.floor((x - y + size * 4) / period)) & 1
      const threadA = diagonalA < 6
      const threadB = diagonalB < 6
      let luminance = 18
      if (threadA && block === 0) luminance = 47 + Math.max(0, 8 - Math.abs(diagonalA - 3) * 2)
      if (threadB && block === 1) luminance = 36 + Math.max(0, 6 - Math.abs(diagonalB - 3) * 2)
      if ((x + y) % 5 === 0) luminance += 2

      const offset = y * stride + 1 + x * 4
      raw[offset] = Math.round(luminance * 0.80)
      raw[offset + 1] = Math.round(luminance * 0.90)
      raw[offset + 2] = luminance
      raw[offset + 3] = 255
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function createCarbonNormalTexture(size = 256) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  const period = 18

  const heightAt = (x, y) => {
    const wrappedX = (x + size) % size
    const wrappedY = (y + size) % size
    const diagonalA = (wrappedX + wrappedY) % period
    const diagonalB = (wrappedX - wrappedY + size * 4) % period
    const block =
      (Math.floor((wrappedX + wrappedY) / period) +
        Math.floor((wrappedX - wrappedY + size * 4) / period)) &
      1
    if (diagonalA < 6 && block === 0) {
      return Math.sin((diagonalA / 6) * Math.PI)
    }
    if (diagonalB < 6 && block === 1) {
      return Math.sin((diagonalB / 6) * Math.PI) * 0.78
    }
    return 0.08
  }

  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x += 1) {
      const dx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * 1.15
      const dy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 1.15
      const length = Math.hypot(dx, dy, 1)
      const offset = y * stride + 1 + x * 4
      raw[offset] = Math.round((-dx / length * 0.5 + 0.5) * 255)
      raw[offset + 1] = Math.round((-dy / length * 0.5 + 0.5) * 255)
      raw[offset + 2] = Math.round((1 / length * 0.5 + 0.5) * 255)
      raw[offset + 3] = 255
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function createTransparentTexture(size = 4) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function createPolishedLetterTexture(width = 256, height = 64) {
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  const stops = [
    [0, [184, 193, 214]],
    [0.12, [250, 252, 255]],
    [0.27, [202, 209, 225]],
    [0.47, [255, 255, 255]],
    [0.61, [176, 187, 211]],
    [0.82, [239, 244, 252]],
    [1, [195, 204, 222]],
  ]

  const sample = amount => {
    const nextIndex = stops.findIndex(([offset]) => offset >= amount)
    if (nextIndex <= 0) return stops[0][1]
    const [startOffset, startColor] = stops[nextIndex - 1]
    const [endOffset, endColor] = stops[nextIndex]
    const local = (amount - startOffset) / (endOffset - startOffset)
    return startColor.map((value, index) =>
      Math.round(value + (endColor[index] - value) * local),
    )
  }

  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0
    for (let x = 0; x < width; x += 1) {
      const diagonal = ((x / (width - 1)) + (y / (height - 1)) * 0.11) % 1
      const color = sample(diagonal)
      const offset = y * stride + 1 + x * 4
      raw[offset] = color[0]
      raw[offset + 1] = color[1]
      raw[offset + 2] = color[2]
      raw[offset + 3] = 255
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const width = 3.37
const height = 2.125
const frontFace = roundedRing(width - 0.04, height - 0.04, 0.15, 0.06)
const outerFront = roundedRing(width, height, 0.17, 0.035)
const outerBack = roundedRing(width, height, 0.17, -0.035)
const backFace = roundedRing(width - 0.04, height - 0.04, 0.15, -0.06)

const bodyPrimitives = [
  makePrimitive(createFace(frontFace, 1), 0),
  makePrimitive(createFace(backFace, -1), 0),
  makePrimitive(createRingBridge(frontFace, outerFront, true), 1),
  makePrimitive(createSide(outerFront, outerBack), 1),
  makePrimitive(createRingBridge(backFace, outerBack, false), 1),
  makePrimitive(createRaisedRail(), 2),
]

const FRONT_INLAY_FACE_Z = 0.0614
const FRONT_INLAY_DEPTH_Z = 0.047
const BACK_INLAY_FACE_Z = -0.0614
const BACK_INLAY_DEPTH_Z = -0.047

const frontTitle = mergeGeometry([
  createDelauneyText('N-WORD', {
    x: -1.19,
    y: 0.14,
    scale: 0.000405,
    tracking: 22,
    zA: FRONT_INLAY_DEPTH_Z,
    zB: FRONT_INLAY_FACE_Z,
  }),
  createDelauneyText('PASS', {
    x: -1.19,
    y: -0.34,
    scale: 0.00039,
    tracking: 38,
    zA: FRONT_INLAY_DEPTH_Z,
    zB: FRONT_INLAY_FACE_Z,
  }),
  createExtrudedBar(
    -1.19,
    -0.49,
    0.49,
    -0.49,
    0.017,
    FRONT_INLAY_DEPTH_Z,
    FRONT_INLAY_FACE_Z,
  ),
  createExtrudedBar(
    -1.19,
    -0.525,
    -0.55,
    -0.525,
    0.009,
    FRONT_INLAY_DEPTH_Z,
    FRONT_INLAY_FACE_Z,
  ),
])

const portraitChoices = [
  {
    id: 'obama',
    entitySuffix: 'Obama',
    label: 'OBAMA',
    displayX: -1.18,
    material: 6,
  },
  {
    id: 'mlk',
    entitySuffix: 'Mlk',
    label: 'KING',
    displayX: -0.39,
    material: 7,
  },
  {
    id: 'black-panther',
    entitySuffix: 'BlackPanther',
    label: 'PANTHER',
    displayX: 0.39,
    material: 8,
  },
  {
    id: 'ryan-gosling',
    entitySuffix: 'RyanGosling',
    label: 'GOSLING',
    displayX: 1.18,
    material: 9,
  },
]

const backPortraitFrameMeshes = portraitChoices.map(
  ({ displayX, entitySuffix }, index) => ({
    name: `SelectorFrame${entitySuffix}`,
    primitives: [
      makePrimitive(
        createChamferedFrame(
          -displayX,
          0.27,
          0.68,
          0.91,
          0.07,
          0.014,
          BACK_INLAY_DEPTH_Z,
          BACK_INLAY_FACE_Z,
          true,
        ),
        10 + index,
      ),
    ],
  }),
)

const backPortraitLabelPrimitives = portraitChoices.map(
  ({ label, displayX }) =>
    makePrimitive(
      createCenteredAtDelauneyText(label, displayX, -0.33, {
        scale: label.length > 5 ? 0.000086 : 0.000105,
        tracking: 13,
        zA: BACK_INLAY_DEPTH_Z,
        zB: BACK_INLAY_FACE_Z,
        mirrorX: true,
      }),
      3,
    ),
)

const backPortraitPrimitives = portraitChoices.map(
  ({ displayX, material }) =>
    makePrimitive(
      createArtworkPlane(
        0.76,
        0.76,
        -displayX,
        0.31,
        -0.0607,
        true,
      ),
      material,
    ),
)

const frontPortraitMeshes = portraitChoices.map(
  ({ entitySuffix, material }) => ({
    name: `LaserPortrait${entitySuffix}`,
    primitives: [
      makePrimitive(
        createArtworkPlane(
          1.12,
          1.12,
          1.1,
          -0.3,
          0.0607,
        ),
        material,
      ),
    ],
  }),
)

const backSelectionRule = createExtrudedBar(
  1.51,
  -0.48,
  -1.51,
  -0.48,
  0.009,
  BACK_INLAY_DEPTH_Z,
  BACK_INLAY_FACE_Z,
)

const backButtonFrame = createChamferedFrame(
  0,
  -0.72,
  1.94,
  0.39,
  0.09,
  0.021,
  BACK_INLAY_DEPTH_Z,
  BACK_INLAY_FACE_Z,
  true,
)

const backButtonText = createCenteredDelauneyText(
  'GIFT A ONE-TIME PASS',
  -0.79,
  {
    scale: 0.000145,
    tracking: 14,
    zA: BACK_INLAY_DEPTH_Z,
    zB: BACK_INLAY_FACE_Z,
    mirrorX: true,
  },
)

const frontLetteringPrimitives = [
  makePrimitive(frontTitle, 3),
]
const holderNamePrimitives = [
  makePrimitive(
    createArtworkPlane(1.68, 0.26, -0.35, -0.68, FRONT_INLAY_FACE_Z),
    4,
  ),
]
const oneTimeUseLabel = 'ONE-TIME USE'
const oneTimeUseScale = 0.000084
const oneTimeUseTracking = 13
const oneTimeUseRightEdge = 0.48
const oneTimeUsePrimitives = [
  makePrimitive(
    createDelauneyText(oneTimeUseLabel, {
      x:
        oneTimeUseRightEdge -
        measureDelauneyText(
          oneTimeUseLabel,
          oneTimeUseScale,
          oneTimeUseTracking,
        ),
      y: -0.758,
      scale: oneTimeUseScale,
      tracking: oneTimeUseTracking,
      zA: FRONT_INLAY_DEPTH_Z,
      zB: FRONT_INLAY_FACE_Z,
    }),
    3,
  ),
]
const backLetteringPrimitives = [
  ...backPortraitLabelPrimitives,
  makePrimitive(backSelectionRule, 3),
  makePrimitive(backButtonFrame, 3),
  makePrimitive(backButtonText, 3),
]

const carbonPng = createCarbonTexture()
const imageView = appendBuffer(carbonPng)
const carbonNormalPng = createCarbonNormalTexture()
const normalImageView = appendBuffer(carbonNormalPng)
const transparentPng = createTransparentTexture()
const transparentImageView = appendBuffer(transparentPng)
const polishedLetterPng = createPolishedLetterTexture()
const polishedLetterImageView = appendBuffer(polishedLetterPng)
const obamaInlayPng = fs.readFileSync(OBAMA_INLAY_PATH)
const obamaInlayImageView = appendBuffer(obamaInlayPng)
const mlkInlayPng = fs.readFileSync(MLK_INLAY_PATH)
const mlkInlayImageView = appendBuffer(mlkInlayPng)
const blackPantherInlayPng = fs.readFileSync(BLACK_PANTHER_INLAY_PATH)
const blackPantherInlayImageView = appendBuffer(blackPantherInlayPng)
const ryanGoslingInlayPng = fs.readFileSync(RYAN_GOSLING_INLAY_PATH)
const ryanGoslingInlayImageView = appendBuffer(ryanGoslingInlayPng)
const binary = Buffer.concat(chunks)

const gltf = {
  asset: {
    version: '2.0',
    generator: 'Realtime Karaoke pass asset generator',
  },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [
    {
      name: 'NwordPass',
      children: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    },
    { mesh: 0, name: 'NwordPassBody' },
    { mesh: 1, name: 'FrontLettering' },
    { mesh: 2, name: 'HolderName' },
    { mesh: 3, name: 'BackLettering' },
    { mesh: 4, name: 'BackPortraitOptions' },
    ...portraitChoices.map(({ entitySuffix }, index) => ({
      mesh: 5 + index,
      name: `PortraitFrame${entitySuffix}`,
    })),
    ...portraitChoices.map(({ entitySuffix }, index) => ({
      mesh: 9 + index,
      name: `FrontPortrait${entitySuffix}`,
      scale: entitySuffix === 'Obama' ? [1, 1, 1] : [0.0001, 0.0001, 0.0001],
    })),
    {
      mesh: 13,
      name: 'OneTimeUse',
      scale: [0.0001, 0.0001, 0.0001],
    },
  ],
  meshes: [
    { name: 'CarbonPass', primitives: bodyPrimitives },
    { name: 'InlaidFrontLettering', primitives: frontLetteringPrimitives },
    { name: 'DynamicHolderName', primitives: holderNamePrimitives },
    { name: 'InlaidBackLettering', primitives: backLetteringPrimitives },
    { name: 'PortraitSelector', primitives: backPortraitPrimitives },
    ...backPortraitFrameMeshes,
    ...frontPortraitMeshes,
    { name: 'InlaidOneTimeUse', primitives: oneTimeUsePrimitives },
  ],
  accessors,
  bufferViews,
  buffers: [{ byteLength: binary.length }],
  images: [
    { bufferView: imageView, mimeType: 'image/png' },
    { bufferView: normalImageView, mimeType: 'image/png' },
    { bufferView: transparentImageView, mimeType: 'image/png' },
    { bufferView: polishedLetterImageView, mimeType: 'image/png' },
    { bufferView: obamaInlayImageView, mimeType: 'image/png' },
    { bufferView: mlkInlayImageView, mimeType: 'image/png' },
    { bufferView: blackPantherInlayImageView, mimeType: 'image/png' },
    { bufferView: ryanGoslingInlayImageView, mimeType: 'image/png' },
  ],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  textures: [
    { sampler: 0, source: 0 },
    { sampler: 0, source: 1 },
    { sampler: 0, source: 2 },
    { sampler: 0, source: 3 },
    { sampler: 0, source: 4 },
    { sampler: 0, source: 5 },
    { sampler: 0, source: 6 },
    { sampler: 0, source: 7 },
  ],
  materials: [
    {
      name: 'MatteCarbon',
      pbrMetallicRoughness: {
        baseColorFactor: [0.72, 0.78, 0.9, 1],
        baseColorTexture: { index: 0 },
        metallicFactor: 0.18,
        roughnessFactor: 0.72,
      },
      normalTexture: { index: 1, scale: 0.58 },
    },
    {
      name: 'MachinedEdge',
      pbrMetallicRoughness: {
        baseColorFactor: [0.39, 0.44, 0.54, 1],
        metallicFactor: 0.82,
        roughnessFactor: 0.24,
      },
    },
    {
      name: 'PolishedRail',
      pbrMetallicRoughness: {
        baseColorFactor: [0.84, 0.88, 0.96, 1],
        metallicFactor: 0.7,
        roughnessFactor: 0.18,
      },
      emissiveFactor: [0.025, 0.03, 0.045],
    },
    {
      name: 'ChromeLettering',
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        baseColorTexture: { index: 3 },
        metallicFactor: 0.28,
        roughnessFactor: 0.09,
      },
      emissiveTexture: { index: 3 },
      emissiveFactor: [0.4, 0.43, 0.52],
      doubleSided: true,
    },
    {
      name: 'HolderNameMaterial',
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        baseColorTexture: { index: 2 },
        metallicFactor: 0.18,
        roughnessFactor: 0.2,
      },
      emissiveFactor: [0.18, 0.2, 0.26],
      alphaMode: 'BLEND',
      doubleSided: true,
    },
    {
      name: 'PortraitChrome',
      pbrMetallicRoughness: {
        baseColorFactor: [0.86, 0.9, 0.98, 1],
        baseColorTexture: { index: 4 },
        metallicFactor: 0.32,
        roughnessFactor: 0.12,
      },
      emissiveFactor: [0.015, 0.018, 0.025],
      alphaMode: 'MASK',
      alphaCutoff: 0.22,
      doubleSided: true,
    },
    ...[4, 5, 6, 7].map((textureIndex, index) => ({
      name: [
        'BackPortraitObama',
        'BackPortraitMlk',
        'BackPortraitBlackPanther',
        'BackPortraitRyanGosling',
      ][index],
      pbrMetallicRoughness: {
        baseColorFactor: [0.52, 0.56, 0.63, 1],
        baseColorTexture: { index: textureIndex },
        metallicFactor: 0.78,
        roughnessFactor: 0.42,
      },
      alphaMode: 'MASK',
      alphaCutoff: 0.3,
      doubleSided: true,
    })),
    ...portraitChoices.map(({ entitySuffix }) => ({
      name: `PortraitFrame${entitySuffix}Material`,
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        baseColorTexture: { index: 3 },
        metallicFactor: 0.28,
        roughnessFactor: 0.09,
      },
      emissiveTexture: { index: 3 },
      emissiveFactor: [0.4, 0.43, 0.52],
      doubleSided: true,
    })),
  ],
}

const jsonBuffer = Buffer.from(JSON.stringify(gltf))
const paddedJsonLength = align4(jsonBuffer.length)
const paddedJson = Buffer.alloc(paddedJsonLength, 0x20)
jsonBuffer.copy(paddedJson)

const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(12 + 8 + paddedJson.length + 8 + binary.length, 8)

const jsonHeader = Buffer.alloc(8)
jsonHeader.writeUInt32LE(paddedJson.length, 0)
jsonHeader.writeUInt32LE(0x4e4f534a, 4)

const binaryHeader = Buffer.alloc(8)
binaryHeader.writeUInt32LE(binary.length, 0)
binaryHeader.writeUInt32LE(0x004e4942, 4)

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
fs.writeFileSync(
  OUTPUT_PATH,
  Buffer.concat([header, jsonHeader, paddedJson, binaryHeader, binary]),
)

console.log(`Generated ${OUTPUT_PATH}`)
