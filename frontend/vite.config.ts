import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }: { mode: string }) => {
  // Load env vars for the current mode (dev / prod)
  const env = loadEnv(mode, '.', '');

  const API_BASE = env.VITE_API_BASE || 'http://127.0.0.1:8000';

  return {
    plugins: [react()],

    optimizeDeps: {
      exclude: ['lucide-react'],
    },

    // DEV ONLY — not used in production builds
    server: {
      proxy: {
        '/accounts': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
        '/auth': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
        '/products': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
        '/cart': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
        '/orders': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
        '/addresses': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
        '/payments': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
        '/attributes': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
        '/admin/users': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
        '/admin/analytics': {
          target: API_BASE,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
