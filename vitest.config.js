import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {

    //The library core is DOM free, so plain node is enough. The few classes
    //that touch the DOM (board/player bootstrapping) are only exercised up to
    //the point where they need a document.
    environment: 'node',

    //Specs sit next to the file they cover, so src/classes/grid.js is
    //accompanied by src/classes/grid.spec.js. They are kept out of the
    //published package via .npmignore.
    include: ['src/**/*.spec.js'],

    //Coverage
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/**/*.spec.js'],
      reporter: ['text', 'html'],
    },
  },
})
