import {describe, it, expect} from 'vitest'
import {
  kanji, hangul, numbers, letters, index, lowercase,
  coordinateGenerators, normalizeCoordinatesObject
} from './coordinates.js'

describe('coordinate generators', () => {

  it('numbers from one', () => {
    expect(numbers(0)).toBe(1)
    expect(numbers(18)).toBe(19)
  })

  it('indexes from zero', () => {
    expect(index(0)).toBe(0)
  })

  it('letters skip I, as Go boards do', () => {
    expect(letters(0)).toBe('A')
    expect(letters(7)).toBe('H')
    expect(letters(8)).toBe('J')
    expect(letters(18)).toBe('T')
  })

  it('letters continue past the alphabet', () => {
    expect(letters(25)).toBe('AA')
  })

  it('lowercase runs a-z then A-Z', () => {
    expect(lowercase(0)).toBe('a')
    expect(lowercase(25)).toBe('z')
    expect(lowercase(26)).toBe('A')
    expect(lowercase(51)).toBe('Z')
  })

  it('renders kanji numerals', () => {
    expect(kanji(0)).toBe('一')
    expect(kanji(9)).toBe('十')
    expect(kanji(999)).toBe(999)
  })

  it('renders hangul numerals', () => {
    expect(hangul(0)).toBe('일')
    expect(hangul(999)).toBe(999)
  })

  it('exposes the generators by name', () => {
    expect(Object.keys(coordinateGenerators).sort())
      .toEqual(['index', 'kanji', 'letters', 'lowercase', 'numbers'])
  })

  it('normalises coordinate pairs into objects', () => {
    expect(normalizeCoordinatesObject([1, 2])).toEqual({x: 1, y: 2})
    expect(normalizeCoordinatesObject({x: 1, y: 2})).toEqual({x: 1, y: 2})
  })
})
