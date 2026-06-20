import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Vite serves files from `public/` at the web root by default, so the
// existing art in `public/assets/` is reachable at `/assets/...`.
//
// Two HTML entry points are built: the game (index.html) and the standalone
// world-map / room documentation page (map.html, reachable at /map.html).
const entry = (file: string): string =>
  fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  server: {
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: entry('./index.html'),
        map: entry('./map.html'),
      },
    },
  },
});
