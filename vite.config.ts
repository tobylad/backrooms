import { defineConfig } from 'vite';

// Vite serves files from `public/` at the web root by default, so the
// existing art in `public/assets/` is reachable at `/assets/...`.
export default defineConfig({
  server: {
    open: true,
  },
});
