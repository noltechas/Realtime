import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// The .env (VITE_SPOTIFY_CLIENT_ID/SECRET, etc.) lives at the monorepo ROOT,
// not in packages/desktop. Vite/electron-vite default `envDir` to the config
// dir (packages/desktop) — and the renderer additionally roots at src/renderer
// — so without this the Spotify creds never get inlined and end up null at
// runtime (which silently disabled companion song-request search). Point env
// loading at the repo root in every build so `import.meta.env.VITE_*` resolves.
const ENV_DIR = resolve(__dirname, '../..')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    envDir: ENV_DIR,
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    envDir: ENV_DIR,
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    envDir: ENV_DIR,
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    plugins: [react()]
  }
})
