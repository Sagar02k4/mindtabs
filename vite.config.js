import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from 'path';

// Polyfill File for Node 18 environments
if (typeof File === 'undefined') {
  globalThis.File = class File extends Blob {
    constructor(fileBits, fileName, options) {
      super(fileBits, options);
      this.name = fileName;
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup/index.html'),
        dashboard: path.resolve(__dirname, 'src/dashboard/index.html'),
      },
    },
  },
});
