import {describe, it, expect} from 'vitest'
import Game from '../classes/game.js'
import {get, set} from '../helpers/object.js'
import {sgfGameInfoAccessors, sgfPlayerInfoMap} from './sgf.js'

const accessors = Object.entries(sgfGameInfoAccessors)

/**
 * Whether a game info object carries a field, whether or not it has a value
 */
const carries = (info, path) => {
  const keys = path.split('.')
  const field = keys.pop()
  const group = keys.reduce((obj, key) => obj?.[key], info)
  return Boolean(group) && (field in group)
}

describe('SGF game info accessors', () => {

  it('names each field only once', () => {
    const paths = accessors.map(([, {path}]) => path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it.each(accessors)('%s writes %o where it says it does', (key, {path, set: write}) => {
    const info = {}
    write(info, 'sentinel')
    expect(get(info, path)).toBe('sentinel')
  })

  it.each(accessors)('%s reads %o where it says it does', (key, {path, get: read}) => {
    const info = {}
    set(info, path, 'sentinel')
    expect(read(info)).toBe('sentinel')
  })

  it.each(accessors)('%s reads off an empty object without throwing', (key, {get: read}) => {
    expect(read({})).toBeUndefined()
  })

  it('names only fields a game info object actually carries', () => {

    //NOTE: this is the check a map of path strings could not make. A path
    //naming a field nothing else knew about resolved to undefined without a
    //word, dropping the property from every record written
    const info = new Game().getInfo()
    for (const [key, {path}] of accessors) {
      expect(carries(info, path), `${key} names ${path}`).toBe(true)
    }
  })
})

describe('SGF player info map', () => {

  it('names plain keys on a player rather than paths through one', () => {
    for (const field of Object.values(sgfPlayerInfoMap)) {
      expect(field).not.toContain('.')
    }
  })

  it('names only fields a player actually carries', () => {
    const {black} = new Game().getInfo().players
    for (const [key, field] of Object.entries(sgfPlayerInfoMap)) {
      expect(field in black, `${key} names ${field}`).toBe(true)
    }
  })
})
