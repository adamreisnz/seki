import {describe, it, expect} from 'vitest'
import Game from '../classes/game.js'
import {get, set} from '../helpers/object.js'
import {jgfInfoAccessors, jgfNodeFields} from './jgf.js'

//The groups of a game info object that have a fixed shape. Everything else at
//the top level is free form and is carried whole, so it is a leaf here
const infoGroups = ['record', 'source', 'event', 'game', 'board', 'rules']

/**
 * Every field a game info object carries, as the path a JGF record calls it by
 */
const infoPaths = (info) => Object
  .entries(info)
  .flatMap(([key, value]) => infoGroups.includes(key)
    ? Object.keys(value).map(field => `${key}.${field}`)
    : [key]
  )

describe('JGF info accessors', () => {

  it('names each field only once', () => {
    const paths = jgfInfoAccessors.map(({path}) => path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it.each(jgfInfoAccessors)('writes $path where it says it does', ({path, set: write}) => {
    const jgf = {}
    write(jgf, 'sentinel')
    expect(get(jgf, path)).toBe('sentinel')
  })

  it.each(jgfInfoAccessors)('reads $path where it says it does', ({path, get: read}) => {
    const info = {}
    set(info, path, 'sentinel')
    expect(read(info)).toBe('sentinel')
  })

  it.each(jgfInfoAccessors)('reads $path off an empty object without throwing', ({get: read}) => {
    expect(read({})).toBeUndefined()
  })

  it('covers every field a game info object carries, and no others', () => {

    //NOTE: this is the check a list of path strings could not make. 'game.dates'
    //used to be listed as a path with nothing assigning it, so the field came
    //out of every record undefined and nothing said a word about it
    const paths = infoPaths(new Game().getInfo())
    expect(jgfInfoAccessors.map(({path}) => path).sort()).toEqual(paths.sort())
  })
})

describe('JGF node fields', () => {

  it('names each field only once', () => {
    expect(new Set(jgfNodeFields).size).toBe(jgfNodeFields.length)
  })

  it('names plain keys rather than paths, so they need no accessor', () => {
    for (const field of jgfNodeFields) {
      expect(field).not.toContain('.')
    }
  })
})
