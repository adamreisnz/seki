import {defineConfig} from 'vite'

export default defineConfig({
  publicPath: './src/public',
  root: './src',
  server: {
    host: 'localhost',
    port: 4040,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
  esbuild: {
    minifyIdentifiers: false,
    keepNames: true,
  },
})
