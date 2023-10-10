import {defineConfig} from 'vite'

export default defineConfig({
  publicPath: './src/public',
  root: './src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
})
