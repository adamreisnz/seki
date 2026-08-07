import {resolve} from 'path'
import {defineConfig} from 'vite'
import cleanup from 'rollup-plugin-cleanup'

export default defineConfig({
  publicPath: './src/public',
  root: './src',
  server: {
    host: 'localhost',
    port: 4041,
    open: true,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    lib: {
      entry: resolve(import.meta.dirname, 'src/seki-embed.js'),
      name: 'Seki',
      fileName: 'seki-embed',
    },
    rollupOptions: {
      plugins: [
        cleanup({
          comments: 'none',
          extensions: ['js'],
          maxEmptyLines: 0,
          sourcemap: false,
        }),
      ],
    },
  },
  // esbuild: {
  //   minifyIdentifiers: false,
  //   keepNames: true,
  // },
})
