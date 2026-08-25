import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    basicSsl(),
    tailwindcss(),
    svelte()
  ],
  server: {
    host: true, // Exposes server on local network (e.g. https://192.168.x.x:5173)
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Rolldown requires manualChunks as a function (not an object)
        manualChunks(id: string) {
          if (id.includes('@zxing')) return 'vendor-zxing';
          if (id.includes('qrcode') || id.includes('jsbarcode')) return 'vendor-qr';
          if (id.includes('@lucide') || id.includes('canvas-confetti')) return 'vendor-ui';
        }
      }
    }
  }
});

