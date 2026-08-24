import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({ plugins: [vue()], server: { host: true, port: 4173 }, build: { outDir: 'dist', target: 'es2020' } });
