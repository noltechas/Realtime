// Generates the space theme's 3D assets as binary glTF (.glb) files.
//
//   assets/models/space-outboard.glb  — what you see out the viewport:
//       StationRing / StationCore / Probe
//   assets/models/space-navpod.glb    — the tab bar's active-tab marker:
//       PodCollar / PodIris / PodVanes / PodFlare
//
// Run with:  npm run generate:space-models
//
// ── Why procedural ──────────────────────────────────────────────────────────
// Same reasoning as scripts/generate-nword-pass-glb.js (copy that file's
// approach for anything more organic): committing a generator instead of a
// binary means the geometry is reviewable, tweakable in one number, and the
// output stays tiny. These two files together are ~60 KB and load instantly,
// which matters because the station sits behind every screen in the theme.
//
// ── Design rules baked into the numbers below ────────────────────────────────
//  • LOW POLY ON PURPOSE. Every model here is a few thousand triangles. The
//    theme's job is to never drop a frame on a low-end phone, and the cheapest
//    triangle is the one that was never submitted.
//  • NO TEXTURES. Materials are pure PBR factors. Filament's directional
//    lighting + these metallic/roughness pairs give the machined-titanium read
//    without a single byte of image data.
//  • METALLIC STAYS MODERATE (≤ 0.75). There is no image-based light in these
//    scenes, and a fully metallic surface with no environment to reflect
//    renders black. 0.6-ish keeps the specular highlight from the directional
//    lights while still reading as metal.
//  • GLOW IS 2D. Emissive factors are set on the lamp materials, but the
//    actual bloom halo is drawn by SVG in the React layer, where a radial
//    gradient is both cheaper and prettier than post-processing. See
//    theme/themes/space/atoms/_ship.tsx.

const path = require('path')
const {
  TAU,
  m4compose,
  m4translate,
  m4rotY,
  m4rotZ,
  transformPart,
  spherePart,
  torusPart,
  cylinderPart,
  tubePart,
  annulusPart,
  boxPart,
  chamferedPlateParts,
  chamferBandPart,
  chamferedPrismPart,
  GlbBuilder,
} = require('./lib/glb')

const MODELS_DIR = path.resolve(__dirname, '../assets/models')

// ── materials ───────────────────────────────────────────────────────────────
// Shared across both models so the nav pod in the tab bar is unmistakably cut
// from the same metal as the station outside the window.

const TITANIUM = {
  name: 'Titanium',
  pbrMetallicRoughness: {
    baseColorFactor: [0.44, 0.49, 0.57, 1],
    metallicFactor: 0.62,
    roughnessFactor: 0.34,
  },
}

const POLISHED = {
  name: 'PolishedChamfer',
  pbrMetallicRoughness: {
    baseColorFactor: [0.74, 0.8, 0.88, 1],
    metallicFactor: 0.74,
    roughnessFactor: 0.16,
  },
  emissiveFactor: [0.02, 0.026, 0.032],
}

const HULL_DARK = {
  name: 'HullDark',
  pbrMetallicRoughness: {
    baseColorFactor: [0.11, 0.14, 0.19, 1],
    metallicFactor: 0.34,
    roughnessFactor: 0.62,
  },
}

const SOLAR_PANEL = {
  name: 'SolarPanel',
  pbrMetallicRoughness: {
    baseColorFactor: [0.07, 0.11, 0.22, 1],
    metallicFactor: 0.28,
    roughnessFactor: 0.42,
  },
  emissiveFactor: [0.02, 0.05, 0.11],
}

// Lamps read as self-lit surfaces. emissiveFactor is capped at 1.0 by the glTF
// spec, so the visible halo is layered in 2D by the React atoms rather than
// relying on emissive strength extensions Filament may not honour.
//
// EMISSIVE IS DELIBERATELY WELL UNDER 1.0. At full brightness the diffuse
// contribution from the scene's key light pushed these surfaces past white and
// the hue disappeared — the nav pod's cyan iris ring rendered as a plain white
// band. Keeping emissive mid-range lets the colour survive being lit.
const LAMP_ICE = {
  name: 'LampIce',
  pbrMetallicRoughness: {
    baseColorFactor: [0.15, 0.62, 0.76, 1],
    metallicFactor: 0,
    roughnessFactor: 0.45,
  },
  emissiveFactor: [0.16, 0.6, 0.72],
}

// The selected-tab plate's face. Bright enough to be unmistakably "the lit one"
// against the near-black rail, with a dark glyph on top — which is exactly what
// the theme's `tabBarPill` / `tabBarPillFg` token pair already specifies. Enough
// emissive to read as backlit, not so much that the bevel's specular is lost.
const ICE_FACE = {
  name: 'IceFace',
  pbrMetallicRoughness: {
    // Deliberately dim for a "lit" surface. Base colour and emissive SUM with
    // the key light, and at [0.34, 0.83, 0.94] + emissive 0.6 the face clipped
    // straight to white on device and lost its hue entirely — the selector read
    // as a blank slab. Keeping both low lets the cyan survive being lit.
    baseColorFactor: [0.09, 0.36, 0.45, 1],
    metallicFactor: 0.08,
    roughnessFactor: 0.38,
  },
  emissiveFactor: [0.1, 0.42, 0.54],
}

const LAMP_AMBER = {
  name: 'LampAmber',
  pbrMetallicRoughness: {
    baseColorFactor: [1, 0.71, 0.24, 1],
    metallicFactor: 0,
    roughnessFactor: 0.4,
  },
  emissiveFactor: [1, 0.66, 0.18],
}

const LAMP_VIOLET = {
  name: 'LampViolet',
  pbrMetallicRoughness: {
    baseColorFactor: [0.55, 0.36, 1, 1],
    metallicFactor: 0,
    roughnessFactor: 0.45,
  },
  emissiveFactor: [0.5, 0.31, 1],
}

// ── model 1: outboard ───────────────────────────────────────────────────────
// A ring-habitat station, split into a ring that spins and a core that does
// not — the "2001" read, and the reason this is two nodes instead of one.
// Plus a small probe that drifts across the viewport on a very long loop.
//
// Modelled around a habitat ring of radius 1.0, lying in the XY plane so its
// spin axis is +Z. The React layer tilts it and spins it about that axis.

function buildOutboard() {
  const builder = new GlbBuilder('Realtime Karaoke space outboard generator')

  // — StationRing: torus, spokes, lit window band, nav beacons ——————————————
  const RING_RADIUS = 1
  const RING_TUBE = 0.085
  const ringHull = [
    torusPart(RING_RADIUS, RING_TUBE, 44, 8),
    // Six spokes from hub to ring. Built along Z, tipped to lie along X, then
    // fanned around the ring axis.
    ...Array.from({ length: 6 }, (_, index) => {
      const angle = (index / 6) * TAU
      return transformPart(
        cylinderPart(0.026, 0.78, 6),
        m4compose(m4rotZ(angle), m4translate(0.55, 0, 0), m4rotY(Math.PI / 2)),
      )
    }),
  ]

  // 28 lit windows sitting on the ring's outer equator, each tipped to lie
  // flat against the tube surface.
  const ringWindows = Array.from({ length: 28 }, (_, index) => {
    const angle = (index / 28) * TAU
    return transformPart(
      boxPart(0.052, 0.03, 0.014),
      m4compose(
        m4rotZ(angle),
        m4translate(RING_RADIUS + RING_TUBE * 0.94, 0, 0),
        m4rotY(Math.PI / 2),
      ),
    )
  })

  // Four amber beacons at the cardinal points, standing off the rim.
  const ringBeacons = Array.from({ length: 4 }, (_, index) => {
    const angle = (index / 4) * TAU + Math.PI / 8
    return transformPart(
      spherePart(0.032, 8, 6),
      m4compose(m4rotZ(angle), m4translate(RING_RADIUS + RING_TUBE + 0.028, 0, 0)),
    )
  })

  builder.addNode('StationRing', [
    { material: TITANIUM, parts: ringHull },
    { material: LAMP_ICE, parts: ringWindows },
    { material: LAMP_AMBER, parts: ringBeacons },
  ])

  // — StationCore: spine, hub, docking collars, solar wings, drive ————————————
  const coreHull = [
    cylinderPart(0.19, 0.34, 20), // central hub the ring turns around
    cylinderPart(0.05, 2.05, 12), // spine running the length of the station
  ]
  const corePolished = [
    transformPart(tubePart(0.125, 0.088, 0.05, 20), m4translate(0, 0, 0.74)),
    transformPart(tubePart(0.125, 0.088, 0.05, 20), m4translate(0, 0, -0.74)),
    transformPart(tubePart(0.1, 0.07, 0.04, 16), m4translate(0, 0, 0.98)),
  ]
  // Two solar arrays on a short boom, out along ±X near the forward spine.
  const coreWings = [-1, 1].flatMap((side) => [
    transformPart(boxPart(0.62, 0.008, 0.3), m4translate(side * 0.68, 0, 0.36)),
    transformPart(boxPart(0.62, 0.008, 0.3), m4translate(side * 0.68, 0, -0.02)),
  ])
  const coreBooms = [-1, 1].map((side) =>
    transformPart(
      cylinderPart(0.014, 0.42, 6),
      m4compose(m4translate(side * 0.4, 0, 0.17), m4rotY(Math.PI / 2)),
    ),
  )
  // Drive ring at the aft end.
  const coreDrive = [transformPart(tubePart(0.072, 0.03, 0.045, 16), m4translate(0, 0, -1.03))]

  builder.addNode('StationCore', [
    { material: HULL_DARK, parts: coreHull },
    { material: POLISHED, parts: [...corePolished, ...coreBooms] },
    { material: SOLAR_PANEL, parts: coreWings },
    { material: LAMP_VIOLET, parts: coreDrive },
  ])

  // — Probe: a small satellite that drifts across the viewport ————————————————
  const probeBody = [
    chamferedPrismPart(6, 0.16, 0.34, 0.04),
    transformPart(cylinderPart(0.02, 0.2, 6), m4translate(0, 0, 0.26)),
  ]
  const probeDish = [
    // A shallow dish, faked as a short wide chamfered prism — at the size this
    // renders on screen, a real paraboloid's extra triangles buy nothing.
    transformPart(chamferedPrismPart(12, 0.13, 0.05, 0.035), m4translate(0, 0, 0.38)),
  ]
  const probePanels = [-1, 1].map((side) =>
    transformPart(boxPart(0.34, 0.006, 0.16), m4translate(side * 0.28, 0, 0)),
  )
  const probeLamp = [transformPart(spherePart(0.024, 8, 6), m4translate(0, 0, -0.2))]

  builder.addNode('Probe', [
    { material: TITANIUM, parts: probeBody },
    { material: POLISHED, parts: probeDish },
    { material: SOLAR_PANEL, parts: probePanels },
    { material: LAMP_ICE, parts: probeLamp },
  ])

  builder.write(path.join(MODELS_DIR, 'space-outboard.glb'))
}

// ── model 2: nav pod ────────────────────────────────────────────────────────
// The tab bar's active-tab marker — a lit annunciator button on a machined
// panel: a hex docking collar, a thin lit iris ring just inside it, and a flare
// ring scaled from nothing when the selection changes.
//
// GEOMETRY IS CONSTRAINED BY THE TAB ICON. The Ionicons glyph for the active tab
// is a React view sitting on top of this model, centred on it, so the plate's
// face is matte dark for a light glyph to read against and the lit bar is pushed
// to the bottom edge where the icon can't reach.
//
// The plate is 1.0 units wide so the React layer can convert a tab centre
// straight into world X (see _ship.tsx `pxPerWorldUnit`).

const PLATE_WIDTH = 1
const PLATE_HEIGHT = 0.78
// Chamfer and bevel are proportionally matched to the 2D panels — those cut 14px
// off a ~180px card (~8%). An early 24% cut turned the plate into an octagon
// that no longer echoed the cards at all, which was the whole point of it.
const PLATE_CUT = 0.13
const PLATE_DEPTH = 0.17
const PLATE_BEVEL = 0.065

function buildNavPod() {
  const builder = new GlbBuilder('Realtime Karaoke space nav pod generator')

  // — PodPlate: the lit carrier the selected tab's glyph rides on ——————————————
  // Reads as a backlit key seated in the rail. The face is ice, the bevel is
  // polished steel, and the side wall is dark titanium — three materials on one
  // small object is what gives it form at 46px instead of reading as a shape.
  const plate = chamferedPlateParts(
    PLATE_WIDTH,
    PLATE_HEIGHT,
    PLATE_DEPTH,
    PLATE_CUT,
    PLATE_BEVEL,
  )

  builder.addNode('PodPlate', [
    { material: ICE_FACE, parts: [plate.face] },
    { material: POLISHED, parts: [plate.bevel] },
    { material: TITANIUM, parts: [plate.wall, plate.back] },
    {
      // Two dark bolts on the corners the chamfer left square, echoing the 2D
      // panels' fasteners. On the lit face they read as dark, which is the same
      // relationship the glyph has.
      material: HULL_DARK,
      parts: [
        transformPart(
          cylinderPart(0.035, 0.05, 6),
          m4translate(PLATE_WIDTH / 2 - 0.13, PLATE_HEIGHT / 2 - 0.12, PLATE_DEPTH / 2),
        ),
        transformPart(
          cylinderPart(0.035, 0.05, 6),
          m4translate(-PLATE_WIDTH / 2 + 0.13, -PLATE_HEIGHT / 2 + 0.12, PLATE_DEPTH / 2),
        ),
      ],
    },
  ])

  // — PodFlare: hidden until the selection moves ————————————————————————————
  builder.addNode('PodFlare', [
    {
      material: LAMP_ICE,
      parts: [
        transformPart(
          chamferBandPart(PLATE_WIDTH + 0.16, PLATE_HEIGHT + 0.16, PLATE_CUT + 0.08, 0.05),
          m4translate(0, 0, 0.06),
        ),
      ],
    },
  ])

  builder.write(path.join(MODELS_DIR, 'space-navpod.glb'))
}

buildOutboard()
buildNavPod()
