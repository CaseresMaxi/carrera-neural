import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: funciona en GitHub Pages / Netlify / cualquier hosting estático.
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
