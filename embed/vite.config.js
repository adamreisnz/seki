import {resolve} from 'path'
import {defineConfig} from 'vite'
import cleanup from 'rollup-plugin-cleanup'

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
    lib: {
      entry: resolve(__dirname, 'src/seki-embed.js'),
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
