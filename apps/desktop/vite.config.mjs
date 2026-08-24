import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@health/shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
    },
  },
  server: { port: 5173, open: false, host: '127.0.0.1' },
  build: { outDir: 'dist', target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 1500 },
  base: './',
  define: { 'process.env.NODE_ENV': '"production"' },
});
