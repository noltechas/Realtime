// ── Native modules that may not exist in the running binary ──────────────────
//
// THE RULE: never `import` a native module directly if it was added to the project after
// the oldest binary still in the field. Import it from here instead, and gate any UI that
// needs it. The app must run on every version it has ever shipped, with newer features
// simply absent — not crashing.
//
// ── Why ─────────────────────────────────────────────────────────────────────
// This app ships JS over the air, and `runtimeVersion.policy` is "appVersion", so an OTA
// update reaches every installed binary whose marketing version matches. An OTA can never
// add NATIVE code. So JS pushed to an older binary can reference native modules that
// binary doesn't contain.
//
// A direct `import ... from 'some-native-module'` is evaluated the moment the module graph
// is walked — before React renders, so before any error boundary exists. And
// `theme/registry.ts` statically imports all twelve theme modules, while `RootNavigator`
// reaches `NwordPassCard`, which means these modules sat in the STARTUP path. Pushing that
// JS to a binary without them crashed the app on launch, on every theme, unrecoverably.
//
// Requiring inside a try/catch contains it: a missing module yields `null` rather than
// throwing, and the gates below keep anything that touches it from rendering.
//
// ── The three modules, and which binary introduced them ─────────────────────
//   react-native-filament      | commit 880b37c, 13 commits after version 1.0.1 -> 1.0.2+
//   react-native-worklets-core | same commit (it is Filament's render-callback companion)
//   expo-file-system           | after 1.0.1 -> 1.0.2+
//
// Everything else the app imports predates 1.0.1, so it is safe to import normally.
// `expo-video`, in particular, is identical (~3.0.16) at both versions — which is why the
// Psychedelic theme's liquid-light backdrop works on 1.0.1.
//
// ── Adding a new native dependency ──────────────────────────────────────────
// If you add one and intend to reach existing installs over the air, add it here with a
// gate. To find anything missed, diff package.json against the commit that set the oldest
// shipped `version` and check whether src/ imports it.
//
// ── The contract for the re-exports ─────────────────────────────────────────
// The Filament symbols below are `undefined` when the module is absent but TYPED as
// always-present, so call sites read like a normal import. That is only sound because
// callers gate first:
//
//   {filamentAvailable() ? <TheThreeDeeThing /> : null}
//
// The gate must live in a component that renders the Filament one as a CHILD — never in
// the same component that calls Filament's hooks, since hooks cannot be skipped
// conditionally. All current call sites follow that shape.

type FilamentModule = typeof import('react-native-filament')
type WorkletsModule = typeof import('react-native-worklets-core')
type FileSystemModule = typeof import('expo-file-system')

function optional<T>(load: () => T): T | null {
    try {
        return load()
    } catch {
        // Binary predates this module. Not an error worth surfacing — every call site has
        // a path that works without it.
        return null
    }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const filament = optional(() => require('react-native-filament') as FilamentModule)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const worklets = optional(() => require('react-native-worklets-core') as WorkletsModule)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fileSystem = optional(() => require('expo-file-system') as FileSystemModule)

/** True when the binary contains Filament (and therefore the 3D features). */
export function filamentAvailable(): boolean {
    return filament !== null && worklets !== null
}

/** True when the binary contains expo-file-system. */
export function fileSystemAvailable(): boolean {
    return fileSystem !== null
}

/** expo-file-system, or null on older binaries. Callers must handle null. */
export function getFileSystem(): FileSystemModule | null {
    return fileSystem
}

// Filament — see the contract above.
export const Camera = filament?.Camera as FilamentModule['Camera']
export const EntitySelector = filament?.EntitySelector as FilamentModule['EntitySelector']
export const FilamentScene = filament?.FilamentScene as FilamentModule['FilamentScene']
export const FilamentView = filament?.FilamentView as FilamentModule['FilamentView']
export const Light = filament?.Light as FilamentModule['Light']
export const ModelRenderer = filament?.ModelRenderer as FilamentModule['ModelRenderer']
export const RenderCallbackContext = filament?.RenderCallbackContext as FilamentModule['RenderCallbackContext']
export const getAssetFromModel = filament?.getAssetFromModel as FilamentModule['getAssetFromModel']
export const useBuffer = filament?.useBuffer as FilamentModule['useBuffer']
export const useFilamentContext = filament?.useFilamentContext as FilamentModule['useFilamentContext']
export const useModel = filament?.useModel as FilamentModule['useModel']

// Worklets — only reached from Filament render callbacks, so the same gate covers it.
export const useSharedValue = worklets?.useSharedValue as WorkletsModule['useSharedValue']

export type { Entity, Float3 } from 'react-native-filament'
