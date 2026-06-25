import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Single-file output: everything (JS + CSS + assets) inlined into one index.html.
// This sidesteps JUCE's per-file resource provider complexity (the same trap that
// burned us in SimpleGain) — JUCE only needs to serve "/" → one HTML blob.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000_000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
