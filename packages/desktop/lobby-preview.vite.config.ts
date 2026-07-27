import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// TEMPORARY standalone Vite server for the Lobby Mode visual harness.
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  envDir: resolve(__dirname, '../..'),
  plugins: [react()],
  server: { port: 5199 },
})
