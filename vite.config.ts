import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
