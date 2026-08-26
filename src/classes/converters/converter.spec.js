import {describe, it, expect} from 'vitest'
import Converter from './converter.js'
import Game from '../game.js'
import {appName, appVersion} from '../../constants/app.js'

describe('Converter', () => {

  const converter = new Converter()
  const map = {black: 'B', white: 'W'}

  it('maps a value', () => {
    expect(converter.getMappedValue('black', map)).toBe('B')
    expect(converter.getMappedValue('green', map)).toBeUndefined()
  })

  it('maps a value through the inverted map', () => {
    expect(converter.getMappedValue('B', map, true)).toBe('black')
    expect(converter.getMappedValue('Z', map, true)).toBeUndefined()
  })

  it('reuses the inverted map rather than rebuilding it per lookup', () => {

    //Parsing an SGF asks for a mapped value for every colour, markup type and
    //setup type it comes across, and each of those used to flip the whole map
    //again. Mutating the source map after the first inverse lookup is a way to
    //observe whether the inverse was cached.
    expect(converter.getMappedValue('B', map, true)).toBe('black')

    map.green = 'G'
    expect(converter.getMappedValue('G', map, true)).toBeUndefined()

    //And the original map is still consulted live for forward lookups
    expect(converter.getMappedValue('green', map)).toBe('G')
  })

  it('keeps separate inverses for separate maps', () => {
    const other = {circle: 'CR'}
    expect(converter.getMappedValue('CR', other, true)).toBe('circle')
    expect(converter.getMappedValue('B', map, true)).toBe('black')
  })

  it('builds the generator signature', () => {
    expect(converter.getGeneratorSignature()).toBe(`${appName} v${appVersion}`)
  })

  it('places no handicap stones below two', () => {
    const game = new Game({board: {size: 19}})

    converter.placeHandicapStones(game, 1, 19)

    expect(game.root.setup).toBeUndefined()
  })

  it('places the standard stones for the board size', () => {
    const game = new Game({board: {size: 19}})

    converter.placeHandicapStones(game, 4, 19)

    expect(game.root.setup[0].coords).toHaveLength(4)
  })

  it('places nothing for a count the board size has no placement for', () => {
    const game = new Game({board: {size: 19}})

    converter.placeHandicapStones(game, 12, 19)

    expect(game.root.setup).toBeUndefined()
  })

  it('places nothing for a board size it knows no placements for', () => {
    const game = new Game({board: {size: 7}})

    converter.placeHandicapStones(game, 2, 7)

    expect(game.root.setup).toBeUndefined()
  })

  it('takes an override placement where one is given for that count', () => {

    //Tygem puts its third stone in the top left where the convention puts it
    //bottom right, which is what the overrides are for
    const game = new Game({board: {size: 19}})
    const overrides = {19: {2: [{x: 0, y: 0}, {x: 1, y: 1}]}}

    converter.placeHandicapStones(game, 2, 19, overrides)

    expect(game.root.setup[0].coords).toEqual([{x: 0, y: 0}, {x: 1, y: 1}])
  })

  it('falls back to the standard placement where the override has none', () => {
    const game = new Game({board: {size: 19}})
    const overrides = {19: {2: [{x: 0, y: 0}]}}

    converter.placeHandicapStones(game, 4, 19, overrides)

    expect(game.root.setup[0].coords).toHaveLength(4)
  })
})
