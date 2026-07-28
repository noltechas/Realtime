// The stage's outboard viewport — a real three.js scene behind the space theme.
//
// This is the desktop counterpart to the mobile theme's Filament SceneLayer
// (packages/mobile/src/theme/themes/space/atoms/SceneLayer.tsx), and it is
// composed the same way: 3D handles machined hardware and volumetric light,
// where it is unbeatable; flat gradients and type stay in the DOM above it.
//
// ── Performance contract ─────────────────────────────────────────────────────
// The stage runs full-screen, often on a 4K TV, while audio plays and lyrics
// animate. Dropping a frame here is worse than any visual gain, so:
//
//   • DPR IS CAPPED AND ADAPTIVE. Rendering a 4K display at devicePixelRatio 2
//     is 4× the fragment work for no perceptible benefit at TV viewing distance.
//     `PerformanceMonitor` walks the cap down on its own if frames slip.
//   • NO POST-PROCESSING. Bloom would be lovely and is the single most expensive
//     thing we could add. The atmospheric limb is a fresnel shader instead —
//     one extra draw of a sphere's back faces — and lamp halos are additive
//     sprites, which is how this was done before bloom existed.
//   • LOW POLY, FEW DRAWS. Roughly a dozen meshes and one points cloud. All
//     geometry is procedural primitives; nothing is loaded from disk.
//   • THE SCENE YIELDS TO THE LYRICS. While a song plays, `performing` dims and
//     slows everything — the lyrics are the reason the screen exists, and a
//     busy background competing with them is a design failure, not a feature.

import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'

// Palette — mirrors the shared SPACE_TOKENS.
const ICE = '#5BE9FF'
const AMBER = '#FFB43D'
const VIOLET = '#8B5CFF'
const TITANIUM = '#6E7A8A'
const HULL_DARK = '#141C26'

// ── Atmospheric limb ────────────────────────────────────────────────────────
// A fresnel rim on the back faces of a slightly larger sphere. This is the one
// effect that justifies WebGL on this screen at all: the planet's atmosphere has
// to brighten toward its silhouette edge and fall off with view angle, which no
// CSS gradient can do because it depends on the surface normal.
const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vView)), uPower);
    gl_FragColor = vec4(uColor, rim * uIntensity);
  }
`

function Atmosphere({
  radius,
  color,
  intensity,
  power = 3.2,
}: {
  radius: number
  color: string
  intensity: number
  power?: number
}) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    }),
    [color, intensity, power],
  )
  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 32]} />
      <shaderMaterial
        vertexShader={ATMOSPHERE_VERTEX}
        fragmentShader={ATMOSPHERE_FRAGMENT}
        uniforms={uniforms}
        transparent
        // Back faces + additive + no depth write is what turns a sphere into a
        // halo instead of a ball: we only ever see the far side's rim.
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Star field ──────────────────────────────────────────────────────────────
// One draw call for the whole sky. Positions are generated once from a seeded
// PRNG so the sky is identical every launch — a field that reshuffles on each
// mount reads as noise rather than as a place.
function StarField({ count = 1500 }: { count?: number }) {
  const { positions, colors, sizes } = useMemo(() => {
    let seed = 20260728
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const tint = new THREE.Color()
    for (let index = 0; index < count; index += 1) {
      // Distribute on a shell well behind the action so stars never intersect
      // the station or planet.
      const theta = random() * Math.PI * 2
      const phi = Math.acos(random() * 2 - 1)
      const radius = 34 + random() * 16
      positions[index * 3] = Math.sin(phi) * Math.cos(theta) * radius
      positions[index * 3 + 1] = Math.cos(phi) * radius
      positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius - 8

      const roll = random()
      // Mostly white, a scattering of ice and amber. No violet — the drive is
      // the only violet light in the theme.
      if (roll > 0.94) tint.set(AMBER)
      else if (roll > 0.82) tint.set(ICE)
      else if (roll > 0.7) tint.set('#BFD4EA')
      else tint.set('#FFFFFF')
      const magnitude = 0.25 + random() * 0.75
      colors[index * 3] = tint.r * magnitude
      colors[index * 3 + 1] = tint.g * magnitude
      colors[index * 3 + 2] = tint.b * magnitude
      sizes[index] = 0.06 + random() * random() * 0.22
    }
    return { positions, colors, sizes }
  }, [count])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.16}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ── Additive lamp sprite ────────────────────────────────────────────────────
// A billboarded radial gradient, drawn from a tiny canvas texture generated
// once. This is the pre-bloom way to make a light look bright, and it costs one
// transparent quad instead of a full-screen post pass.
function useGlowTexture(): THREE.Texture {
  return useMemo(() => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')!
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)')
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.12)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }, [])
}

function Glow({
  position,
  color,
  scale,
  opacity = 1,
}: {
  position: [number, number, number]
  color: string
  scale: number
  opacity?: number
}) {
  const texture = useGlowTexture()
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  )
}

// ── Ring-habitat station ────────────────────────────────────────────────────
// The habitat ring turns; the core does not. That contrast is the whole read —
// it says "centrifugal habitation" rather than "decorative hoop", and it is why
// these are two groups instead of one.
function Station({ performing }: { performing: boolean }) {
  const ring = useRef<THREE.Group>(null)
  const windows = useMemo(() => {
    const out: Array<[number, number, number]> = []
    const count = 40
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2
      // 1.09, not 1.02: the torus tube has a 0.085 minor radius, so anything
      // inside 1.085 is buried in the hull and the lit band never renders.
      out.push([Math.cos(angle) * 1.09, Math.sin(angle) * 1.09, 0])
    }
    return out
  }, [])

  useFrame((_, delta) => {
    if (!ring.current) return
    // ~72s per revolution; halved again while a song plays.
    ring.current.rotation.z += delta * (performing ? 0.043 : 0.087)
  })

  return (
    <group rotation={[-1.02, 0, 0.2]}>
      {/* Habitat ring + spokes + lit windows */}
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[1, 0.085, 10, 56]} />
          <meshStandardMaterial color={TITANIUM} metalness={0.62} roughness={0.34} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <mesh
            key={index}
            rotation={[0, 0, (index / 6) * Math.PI * 2 + Math.PI / 2]}
            position={[
              Math.cos((index / 6) * Math.PI * 2) * 0.55,
              Math.sin((index / 6) * Math.PI * 2) * 0.55,
              0,
            ]}
          >
            <cylinderGeometry args={[0.026, 0.026, 0.8, 6]} />
            <meshStandardMaterial color={TITANIUM} metalness={0.6} roughness={0.38} />
          </mesh>
        ))}
        {/* Window band. One instanced-feeling strip of small emissive boxes —
            cheaper and crisper than an emissive texture at this size. */}
        {windows.map((position, index) => (
          <mesh key={index} position={position} rotation={[0, 0, (index / windows.length) * Math.PI * 2]}>
            <boxGeometry args={[0.03, 0.05, 0.016]} />
            <meshBasicMaterial color={ICE} />
          </mesh>
        ))}
      </group>

      {/* Static core: hub, spine, docking collars, solar arrays, drive */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.34, 20]} />
        <meshStandardMaterial color={HULL_DARK} metalness={0.34} roughness={0.62} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2.05, 12]} />
        <meshStandardMaterial color={HULL_DARK} metalness={0.4} roughness={0.55} />
      </mesh>
      {[0.74, -0.74].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.125, 0.125, 0.05, 20]} />
          <meshStandardMaterial color="#BCC7D4" metalness={0.74} roughness={0.16} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.68, 0, 0.36]}>
            <boxGeometry args={[0.62, 0.008, 0.3]} />
            <meshStandardMaterial color="#12203A" metalness={0.28} roughness={0.42} />
          </mesh>
          <mesh position={[side * 0.68, 0, -0.02]}>
            <boxGeometry args={[0.62, 0.008, 0.3]} />
            <meshStandardMaterial color="#12203A" metalness={0.28} roughness={0.42} />
          </mesh>
          <mesh position={[side * 0.4, 0, 0.17]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.014, 0.014, 0.42, 6]} />
            <meshStandardMaterial color="#BCC7D4" metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Drive ring at the aft end, plus its glow — the only violet light. */}
      <mesh position={[0, 0, -1.03]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, 0.022, 8, 16]} />
        <meshBasicMaterial color={VIOLET} />
      </mesh>
      <Glow position={[0, 0, -1.06]} color={VIOLET} scale={0.5} opacity={0.75} />
      <Glow position={[0, 0, 0]} color={ICE} scale={2.6} opacity={0.16} />
    </group>
  )
}

// ── Probe ───────────────────────────────────────────────────────────────────
// A small satellite crossing the frame on a two-minute pass, so the sky has an
// event in it without anything ever looking busy.
function Probe({ performing }: { performing: boolean }) {
  const group = useRef<THREE.Group>(null)
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    if (!group.current) return
    elapsed.current += delta * (performing ? 0.5 : 1)
    const period = 132
    const progress = (elapsed.current % period) / period
    group.current.position.set(7.5 - progress * 15.5, -1.2 + progress * 2.4, -2)
    group.current.rotation.y = elapsed.current * 0.16
  })

  return (
    <group ref={group} scale={0.42} rotation={[-0.55, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 0.34, 6]} />
        <meshStandardMaterial color={TITANIUM} metalness={0.62} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.13, 0.02, 0.06, 12]} />
        <meshStandardMaterial color="#BCC7D4" metalness={0.74} roughness={0.18} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.28, 0, 0]}>
          <boxGeometry args={[0.34, 0.006, 0.16]} />
          <meshStandardMaterial color="#12203A" metalness={0.28} roughness={0.42} />
        </mesh>
      ))}
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.024, 8, 6]} />
        <meshBasicMaterial color={ICE} />
      </mesh>
    </group>
  )
}

// ── Planet ──────────────────────────────────────────────────────────────────
// A procedurally shaded world, not a tinted ball. Everything is generated in the
// fragment shader — no texture assets, nothing to download or keep in VRAM:
//
//   continents   5-octave fBm over the sphere's LOCAL position, thresholded at a
//                sea level, then ramped beach → vegetation → rock by elevation
//   oceans       depth-graded blue with a specular highlight that only appears on
//                water, which is what makes a planet read as wet
//   ice caps      latitude-driven, roughened by noise so they aren't clean bands
//   clouds        a second fBm layer drifting on its own clock, independent of the
//                surface, so weather and geography don't turn together
//   night side    warm city lights, masked to land, past the terminator
//   limb          darkening toward the silhouette edge
//
// THE SPLIT BETWEEN LOCAL AND WORLD SPACE IS THE WHOLE TRICK. Surface features
// are sampled from the local position so they rotate with the mesh, while lighting
// uses the world normal so the sun stays put. Rotate the mesh and the terrain
// turns beneath a fixed terminator — exactly like a real planet. Sampling
// lighting in local space instead would drag the day/night line around with the
// crust, which reads as a spinning lamp.
const PLANET_VERTEX = /* glsl */ `
  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vLocalPos = position;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const PLANET_FRAGMENT = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uAtmosphere;
  uniform float uTime;
  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p, int octaves) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      sum += amp * noise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return sum;
  }

  void main() {
    vec3 sp = normalize(vLocalPos);
    vec3 normal = normalize(vWorldNormal);

    // ── Terrain ──────────────────────────────────────────────────────────
    float elevation = fbm(sp * 2.3, 5);
    elevation += 0.22 * fbm(sp * 7.4, 3);
    float seaLevel = 0.545;
    float land = smoothstep(seaLevel, seaLevel + 0.03, elevation);

    vec3 deepWater = vec3(0.012, 0.045, 0.115);
    vec3 shelfWater = vec3(0.055, 0.215, 0.335);
    vec3 ocean = mix(deepWater, shelfWater,
                     smoothstep(seaLevel - 0.13, seaLevel, elevation));

    float height = smoothstep(seaLevel, 0.80, elevation);
    vec3 shore = vec3(0.30, 0.275, 0.20);
    vec3 vegetation = vec3(0.085, 0.185, 0.105);
    vec3 highland = vec3(0.235, 0.205, 0.165);
    vec3 landColor = mix(shore, vegetation, smoothstep(0.015, 0.26, height));
    landColor = mix(landColor, highland, smoothstep(0.42, 0.86, height));
    // A little dry variation so continents aren't uniformly green.
    landColor = mix(landColor, vec3(0.30, 0.25, 0.16),
                    smoothstep(0.55, 0.85, fbm(sp * 3.7, 3)) * land * 0.55);

    vec3 surface = mix(ocean, landColor, land);

    // ── Ice caps — noise-roughened, not clean latitude bands ─────────────
    float polar = abs(sp.y) + fbm(sp * 4.2, 3) * 0.075 - 0.035;
    float ice = smoothstep(0.70, 0.88, polar);
    surface = mix(surface, vec3(0.87, 0.925, 0.98), ice);

    // ── Weather, on its own clock ────────────────────────────────────────
    float cloudField = fbm(sp * 2.9 + vec3(uTime * 0.0055, uTime * 0.0016, 0.0), 5);
    float clouds = smoothstep(0.53, 0.79, cloudField);

    // ── Lighting: sun fixed in world space ───────────────────────────────
    float ndl = dot(normal, uSunDir);
    float day = smoothstep(-0.14, 0.30, ndl);

    // Specular on water only — a planet reads as wet from its sun glint.
    vec3 halfway = normalize(uSunDir + vViewDir);
    float glint = pow(max(dot(normal, halfway), 0.0), 72.0) * (1.0 - land) * day;

    vec3 color = surface * (0.045 + 0.955 * day);
    color = mix(color, vec3(0.93, 0.955, 1.0) * (0.10 + 0.90 * day), clouds * 0.70);
    color += uAtmosphere * glint * 1.1;

    // ── Night side ───────────────────────────────────────────────────────
    float night = smoothstep(0.10, -0.20, ndl);
    float cities = smoothstep(0.63, 0.80, fbm(sp * 9.5, 3)) * land * night;
    color += vec3(1.0, 0.71, 0.33) * cities * 0.55;

    // ── Limb darkening ───────────────────────────────────────────────────
    float rim = pow(1.0 - max(dot(normal, vViewDir), 0.0), 2.2);
    color *= 1.0 - rim * 0.32;
    // and a whisper of atmospheric scatter picked up at the edge
    color += uAtmosphere * rim * day * 0.16;

    gl_FragColor = vec4(color, 1.0);
  }
`

function Planet() {
  const body = useRef<THREE.Mesh>(null)
  // Direction from the planet's centre toward the scene's key light, so the
  // terminator agrees with how the station is lit.
  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new THREE.Vector3(9.4, 11.6, 7).normalize() },
      uAtmosphere: { value: new THREE.Color(ICE) },
      uTime: { value: 0 },
    }),
    [],
  )

  useFrame((_, delta) => {
    uniforms.uTime.value += delta
    // ~14 minutes per revolution: present at a glance, never distracting. The
    // terrain turns under a fixed sun because lighting is evaluated from the
    // world normal (see the shader note above).
    if (body.current) body.current.rotation.y += delta * 0.0075
  })

  return (
    <group position={[-3.4, -6.6, -3]} rotation={[0, 0, 0.32]}>
      <mesh ref={body}>
        {/* Dense enough that the silhouette is a clean curve at this scale — the
            limb is most of what's on screen, and facets there would be obvious. */}
        <sphereGeometry args={[5.6, 128, 96]} />
        <shaderMaterial
          vertexShader={PLANET_VERTEX}
          fragmentShader={PLANET_FRAGMENT}
          uniforms={uniforms}
        />
      </mesh>
      <Atmosphere radius={5.95} color={ICE} intensity={0.85} power={3.4} />
    </group>
  )
}

// ── Camera drift ────────────────────────────────────────────────────────────
// A slow lissajous so the shot breathes. Amplitude is tiny — enough that the
// scene never feels like a still, small enough that nothing ever appears to
// swing past the lyrics.
function CameraDrift({ performing }: { performing: boolean }) {
  const elapsed = useRef(0)
  useFrame((state, delta) => {
    elapsed.current += delta * (performing ? 0.35 : 1)
    const t = elapsed.current
    state.camera.position.x = Math.sin(t * 0.055) * 0.42
    state.camera.position.y = Math.sin(t * 0.041) * 0.28
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

export interface SpaceOutboardProps {
  /** While a song plays the scene dims and slows so the lyrics own the screen. */
  performing?: boolean
}

export function SpaceOutboard({ performing = false }: SpaceOutboardProps) {
  // Adaptive resolution. Starts at 1.5 (plenty for a TV) and PerformanceMonitor
  // walks it down to 1 if frames start slipping, which is the cheapest possible
  // recovery — half the fragment work, no visible change at viewing distance.
  const [dpr, setDpr] = useState(1.5)

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        // One composited property carries the whole "yield to the lyrics"
        // behaviour — cheaper and smoother than re-authoring every material.
        opacity: performing ? 0.4 : 1,
        transition: 'opacity 1.2s ease',
      }}
    >
      <Canvas
        dpr={dpr}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
        camera={{ fov: 38, position: [0, 0, 9], near: 0.4, far: 90 }}
        style={{ background: 'transparent' }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(1.5)}
        />

        {/* Key light — the system's star, high and right, matching where the
            planet's terminator falls. */}
        <directionalLight position={[6, 5, 4]} intensity={2.6} color="#FFF3E0" />
        {/* Cold bounce off the planet below. Without it the unlit sides of the
            hull go fully black — there is no environment map in this scene. */}
        <directionalLight position={[-5, -4, 2]} intensity={0.5} color="#8FC8FF" />
        <ambientLight intensity={0.1} color="#4A6480" />

        <CameraDrift performing={performing} />
        <StarField />
        <Planet />
        <group position={[4.3, 2.25, -1.2]} scale={0.62}>
          <Station performing={performing} />
        </group>
        <Probe performing={performing} />
      </Canvas>
    </div>
  )
}
