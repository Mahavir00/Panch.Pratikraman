import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site is served from https://<user>.github.io/Panch.Pratikraman/
// so the base path MUST match the repository name. All asset/data fetches in the app
// go through import.meta.env.BASE_URL (never absolute "/...").
export default defineConfig({
  base: '/Panch.Pratikraman/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
})
