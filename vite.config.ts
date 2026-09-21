import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Vite 8 warns about `__dirname` because it plans to load the config natively
// (no transpile step), where only `import.meta.dirname` exists.
const rootDir = import.meta.dirname;

// GitHub Pages project sites are served from https://<user>.github.io/<repo>/,
// so the bundle needs a matching base path. Override with VITE_BASE_PATH (e.g. "/")
// when serving from a user/org page or a custom domain.
const base = process.env.VITE_BASE_PATH ?? "/presen-timer/";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base,
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'notification.wav', 'og-image.png'],
      manifest: {
        name: 'PresenTimer - Presentation Timer App',
        short_name: 'PresenTimer',
        description: 'A minimalist presentation timer with section management',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wav}']
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
}));
