import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        mobile: 'mobile.html',
        training: 'training.html',
        settings: 'settings.html',
      },
    },
  },
});
