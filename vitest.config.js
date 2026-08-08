import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {

    //The library core is DOM free, so plain node is enough. The few classes
    //that touch the DOM (board/player bootstrapping) are only exercised up to
    //the point where they need a document.
    environment: 'node',

    //Specs live outside of src so they don't end up in the published package
    include: ['test/**/*.spec.js'],

    //Coverage
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
})
