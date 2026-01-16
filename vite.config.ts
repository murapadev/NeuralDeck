import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'

// Custom plugin to copy preload.cjs without bundling
function copyPreload() {
  return {
    name: 'copy-preload',
    buildStart() {
      // Ensure dist-electron exists
      if (!fs.existsSync('dist-electron')) {
        fs.mkdirSync('dist-electron', { recursive: true })
      }
      // Copy preload.cjs directly
      fs.copyFileSync('electron/preload.cjs', 'dist-electron/preload.cjs')
    },
    watchChange(id: string) {
      if (id.endsWith('preload.cjs')) {
        fs.copyFileSync('electron/preload.cjs', 'dist-electron/preload.cjs')
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    copyPreload(),
    electron([
      {
        // Main process entry file
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'electron-store'],
              output: {
                format: 'es',
                entryFileNames: '[name].js',
              },
            },
          },
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-tabs',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-checkbox',
          ],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-trpc': ['@trpc/client', '@trpc/react-query', '@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
})
