import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Indian-Sign-Language/', // Must match GitHub repo name exactly
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
