import {describe, it, expect} from 'vitest'
import Converter from './converter.js'
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
})
