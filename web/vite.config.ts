import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import tailwindcss from '@tailwindcss/postcss'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  build: {
    // Vendor code is large and stable; carve it out of the app entry so it
    // caches independently and the 1.22MB index chunk slims down. Charts,
    // motion, the editor, and the PDF renderer are heavy and route-scoped —
    // splitting them keeps them off the eager entry. (probate route is also
    // .lazy-split so recharts is demand-loaded.)
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|@tanstack[\\/]react-router|@tanstack[\\/]react-query|@tanstack[\\/]router-core|@tanstack[\\/]history)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) {
            return 'vendor-firebase'
          }
          if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|internmap)[\\/]/.test(id)) {
            return 'vendor-charts'
          }
          if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils|@motionone)[\\/]/.test(id)) {
            return 'vendor-motion'
          }
          if (/[\\/]node_modules[\\/](@tiptap|prosemirror-[^\\/]+)[\\/]/.test(id)) {
            return 'vendor-editor'
          }
          if (/[\\/]node_modules[\\/](@react-pdf|pdfjs-dist|fontkit|@swc[\\/]helpers|yoga-layout)[\\/]/.test(id)) {
            return 'vendor-pdf'
          }
          return undefined
        },
      },
    },
  },
  server: {
    port: 3000,
  },
})
