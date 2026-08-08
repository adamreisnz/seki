import {describe, it, expect} from 'vitest'
import {get, set, copy, flip, isObject} from '../../src/helpers/object.js'
import {swapColor, isValidColor, colorToNumeric} from '../../src/helpers/color.js'
import {setSubtract} from '../../src/helpers/grid.js'
import {
  kanji, hangul, numbers, letters, index, lowercase,
  coordinateGenerators, normalizeCoordinatesObject
} from '../../src/helpers/coordinates.js'
import {
  parseEvent, parseResult, parseKomi, parseHandicap, parseTime
} from '../../src/helpers/parsing.js'
import {
  randomInt, dateString, isKeyDownEvent, isMouseEvent
} from '../../src/helpers/util.js'
import {stoneColors} from '../../src/constants/stone.js'
import {mouseEvents} from '../../src/constants/util.js'

describe('object helpers', () => {

  describe('get()', () => {

    it('reads a nested path', () => {
      expect(get({a: {b: {c: 1}}}, 'a.b.c')).toBe(1)
    })

    it('returns undefined for a missing path', () => {
      expect(get({a: {}}, 'a.b.c')).toBeUndefined()
    })

    it('returns a default for a missing path', () => {
      expect(get({}, 'a.b', 'fallback')).toBe('fallback')
    })

    it('stops at a null rather than throwing', () => {
      expect(get({a: null}, 'a.b.c')).toBeUndefined()
    })

    it('rejects a non string path', () => {
      expect(() => get({}, ['a'])).toThrow('Invalid path given for lookup')
    })
  })

  describe('set()', () => {

    it('writes a nested path, creating objects on the way', () => {
      const obj = {}
      set(obj, 'a.b.c', 1)
      expect(obj).toEqual({a: {b: {c: 1}}})
    })

    it('overwrites an existing value', () => {
      const obj = {a: {b: 1}}
      set(obj, 'a.b', 2)
      expect(obj.a.b).toBe(2)
    })

    it('leaves sibling keys alone', () => {
      const obj = {a: {b: 1}}
      set(obj, 'a.c', 2)
      expect(obj.a).toEqual({b: 1, c: 2})
    })

    it('rejects a non string path', () => {
      expect(() => set({}, 123, 1)).toThrow('Invalid path given for set')
    })
  })

  describe('copy()', () => {

    it('deep copies an object', () => {
      const original = {a: {b: 1}}
      const copied = copy(original)

      copied.a.b = 2
      expect(original.a.b).toBe(1)
    })

    it('passes primitives straight through', () => {
      expect(copy(5)).toBe(5)
      expect(copy('x')).toBe('x')
      expect(copy(null)).toBe(null)
    })

    it('copies arrays', () => {
      const original = [{a: 1}]
      const copied = copy(original)
      copied[0].a = 2
      expect(original[0].a).toBe(1)
    })
  })

  describe('flip()', () => {

    it('swaps keys and values', () => {
      expect(flip({a: 1, b: 2})).toEqual({1: 'a', 2: 'b'})
    })
  })

  describe('isObject()', () => {

    it('accepts objects and arrays, rejects primitives and null', () => {
      expect(isObject({})).toBe(true)
      expect(isObject([])).toBe(true)
      expect(isObject(null)).toBe(false)
      expect(isObject('x')).toBe(false)
      expect(isObject(undefined)).toBe(false)
    })
  })
})

describe('color helpers', () => {

  it('swaps black and white', () => {
    expect(swapColor(stoneColors.BLACK)).toBe(stoneColors.WHITE)
    expect(swapColor(stoneColors.WHITE)).toBe(stoneColors.BLACK)
  })

  it('has nothing to swap for an unknown color', () => {
    expect(swapColor('green')).toBeUndefined()
  })

  it('validates colors', () => {
    expect(isValidColor(stoneColors.BLACK)).toBe(true)
    expect(isValidColor('green')).toBe(false)
    expect(isValidColor(undefined)).toBe(false)
  })

  it('converts to the numeric form used by external scoring libraries', () => {
    expect(colorToNumeric(stoneColors.BLACK)).toBe(1)
    expect(colorToNumeric(stoneColors.WHITE)).toBe(-1)
    expect(colorToNumeric(undefined)).toBe(0)
  })
})

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

describe('parsing helpers', () => {

  describe('parseEvent()', () => {

    it('leaves a plain string alone', () => {
      expect(parseEvent('Some Tournament')).toEqual(['Some Tournament'])
    })

    it('splits a trailing URL off', () => {
      const [name, url] = parseEvent('Some Tournament at https://example.com')
      expect(name).toBe('Some Tournament')
      expect(url).toBe('https://example.com')
    })
  })

  describe('parseResult()', () => {

    it('abbreviates the common outcomes', () => {
      expect(parseResult('W+Resign')).toBe('W+R')
      expect(parseResult('B+Time')).toBe('B+T')
      expect(parseResult('W+Forfeit')).toBe('W+F')
      expect(parseResult('Draw')).toBe('D')
    })

    it('keeps a points margin', () => {
      expect(parseResult('W+6.5')).toBe('W+6.5')
    })

    it('expands fraction glyphs', () => {
      expect(parseResult('W+6½')).toBe('W+6.5')
    })

    it('falls back to a question mark', () => {
      expect(parseResult('')).toBe('?')
      expect(parseResult(null)).toBe('?')
      expect(parseResult(123)).toBe('?')
    })
  })

  describe('parseKomi()', () => {

    it('parses numbers and numeric strings', () => {
      expect(parseKomi(6.5)).toBe(6.5)
      expect(parseKomi('6.5')).toBe(6.5)
    })

    it('expands fraction glyphs', () => {
      expect(parseKomi('6½')).toBe(6.5)
      expect(parseKomi('6¼')).toBe(6.25)
    })

    it('falls back to zero for nonsense', () => {
      expect(parseKomi('abc')).toBe(0)
    })

    it('passes undefined through', () => {
      expect(parseKomi(undefined)).toBeUndefined()
    })
  })

  describe('parseHandicap() and parseTime()', () => {

    it('parses handicap as an integer', () => {
      expect(parseHandicap('4')).toBe(4)
      expect(parseHandicap('abc')).toBe(0)
      expect(parseHandicap(undefined)).toBeUndefined()
    })

    it('parses time as a float', () => {
      expect(parseTime('1800')).toBe(1800)
      expect(parseTime('abc')).toBe(0)
      expect(parseTime(undefined)).toBeUndefined()
    })
  })
})

describe('grid helpers', () => {

  it('subtracts one set of coordinates from another', () => {
    const a = [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}]
    const b = [{x: 1, y: 1}]
    expect(setSubtract(a, b)).toEqual([{x: 0, y: 0}, {x: 2, y: 2}])
  })

  it('returns everything when nothing is subtracted', () => {
    const a = [{x: 0, y: 0}]
    expect(setSubtract(a, [])).toEqual(a)
  })
})

describe('util helpers', () => {

  it('produces a random integer within the given range', () => {
    for (let i = 0; i < 50; i++) {
      const value = randomInt(3, 5)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(5)
      expect(Number.isInteger(value)).toBe(true)
    }
  })

  it('formats a date as YYYY-MM-DD', () => {
    expect(dateString(new Date(2024, 2, 9))).toBe('2024-03-09')
  })

  describe('isKeyDownEvent()', () => {

    const event = (key, modifiers = {}) => ({
      key,
      ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
      ...modifiers,
    })

    it('matches on key regardless of case', () => {
      expect(isKeyDownEvent(event('a'), {key: 'A'})).toBe(true)
    })

    it('requires the modifiers to match exactly', () => {
      expect(isKeyDownEvent(event('a'), {key: 'a', shiftKey: true})).toBe(false)
      expect(isKeyDownEvent(event('a', {shiftKey: true}), {key: 'a'})).toBe(false)
      expect(isKeyDownEvent(event('a', {shiftKey: true}), {key: 'a', shiftKey: true}))
        .toBe(true)
    })

    it('does not match a different key', () => {
      expect(isKeyDownEvent(event('a'), {key: 'b'})).toBe(false)
    })
  })

  describe('isMouseEvent()', () => {

    it('matches wheel direction', () => {
      expect(isMouseEvent({deltaY: -1}, {mouseEvent: mouseEvents.WHEEL_UP})).toBe(true)
      expect(isMouseEvent({deltaY: 1}, {mouseEvent: mouseEvents.WHEEL_UP})).toBe(false)
      expect(isMouseEvent({deltaY: 1}, {mouseEvent: mouseEvents.WHEEL_DOWN})).toBe(true)
    })
  })
})
