import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lokale Entwicklung gegen die Azure Functions (func host / SWA CLI auf :7071).
    // Im Betrieb übernimmt Static Web Apps das Routing von /api automatisch.
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
      // Emuliert die SWA-Auth-Endpunkte beim lokalen Entwickeln über die SWA CLI.
      '/.auth': {
        target: 'http://localhost:4280',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
