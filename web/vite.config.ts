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
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Firebase core (~350KB) — cached independently
          if (id.includes('firebase/app') || id.includes('firebase/auth') || id.includes('@firebase/auth')) {
            return 'firebase-core';
          }
          // Firebase data (~200KB)
          if (id.includes('firebase/firestore') || id.includes('@firebase/firestore') ||
              id.includes('firebase/storage') || id.includes('@firebase/storage')) {
            return 'firebase-data';
          }
          // React + Router framework (~250KB)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') ||
              id.includes('@tanstack/react-router') || id.includes('@tanstack/react-store')) {
            return 'framework';
          }
          // TipTap rich text editor (~150KB) — only loaded on directives page
          if (id.includes('@tiptap/') || id.includes('prosemirror')) {
            return 'tiptap';
          }
          // Charts (~100KB) — only loaded on dashboard
          if (id.includes('recharts')) {
            return 'viz';
          }
          // PDF renderer (~1.5MB) — lazy-loaded on directives page only
          if (id.includes('@react-pdf/')) {
            return 'react-pdf';
          }
          // Framer Motion (~80KB) — only loaded on landing page
          if (id.includes('framer-motion')) {
            return 'motion';
          }
        },
      },
    },
  },
})

