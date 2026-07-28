// Monorepo-aware Metro config. Mobile lives in `packages/mobile`, the shared
// library lives in `packages/shared`, and dependencies are hoisted by npm
// workspaces to the repo root. Metro needs to watch the workspace root and
// resolve modules from both locations.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]

// Filament loads models directly from the app bundle. Metro does not include
// GLB files by default, so register the extension once for all future 3D assets.
if (!config.resolver.assetExts.includes('glb')) {
  config.resolver.assetExts.push('glb')
}

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// The desktop package pins react@18 (Electron renderer) while mobile is on
// react@19 (RN). npm can't hoist both, so react@18 lives at the workspace root
// and react@19 lives inside packages/mobile/node_modules. With hierarchical
// lookup enabled (required so transitively-nested Expo modules can still find
// their own deps), Metro could otherwise resolve `react` to the wrong copy
// from a hoisted package — producing "Invalid hook call" at runtime.
//
// We pin a handful of singleton packages (anything that holds React module
// state) to the mobile package's resolution so every import sees one copy.
const SINGLETONS = [
  'react',
  'react-native',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  '@react-navigation/native',
  '@react-navigation/native-stack',
  'react-native-safe-area-context',
  'react-native-screens',
  'scheduler',
]

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SINGLETONS.includes(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'index.ts') },
      moduleName,
      platform,
    )
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
