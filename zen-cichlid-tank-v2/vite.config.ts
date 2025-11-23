import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        assetsDir: '.',
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            entryFileNames: 'cichlid-tank.js',
            chunkFileNames: 'cichlid-tank-[name].js',
            assetFileNames: (assetInfo) => {
              const ext = path.extname(assetInfo.name ?? '');
              if (ext === '.css') {
                return 'cichlid-tank.css';
              }
              return assetInfo.name ?? 'asset-[hash][extname]';
            }
          }
        }
      }
    };
});
