import {describe, it, expect} from 'vitest'
import {merge, get, set, copy, flip, isObject} from './object.js'

describe('merge()', () => {

  it('deep merges objects', () => {
    const result = merge({a: {b: 1, c: 2}}, {a: {c: 3}})
    expect(result).toEqual({a: {b: 1, c: 3}})
  })

  it('replaces arrays rather than concatenating them', () => {
    const result = merge({items: ['a', 'b', 'c']}, {items: ['x']})
    expect(result.items).toEqual(['x'])
  })

  it('allows an array to be emptied', () => {
    const result = merge({items: ['a', 'b']}, {items: []})
    expect(result.items).toEqual([])
  })

  it('keeps the target array when the source has none', () => {
    const result = merge({items: ['a', 'b']}, {other: true})
    expect(result.items).toEqual(['a', 'b'])
  })

  it('replaces arrays of objects', () => {
    const result = merge(
      {bindings: [{key: 'a'}, {key: 'b'}]},
      {bindings: [{key: 'z'}]}
    )
    expect(result.bindings).toEqual([{key: 'z'}])
  })

  it('does not mutate either input', () => {
    const target = {items: ['a'], nested: {value: 1}}
    const source = {items: ['b'], nested: {value: 2}}

    merge(target, source)

    expect(target).toEqual({items: ['a'], nested: {value: 1}})
    expect(source).toEqual({items: ['b'], nested: {value: 2}})
  })

  it('clones nested arrays so they are not shared with the source', () => {
    const source = {items: [{value: 1}]}
    const result = merge({}, source)

    result.items[0].value = 99
    expect(source.items[0].value).toBe(1)
  })

  it('preserves functions, which themes rely on', () => {
    const fn = () => 42
    const result = merge({radius: fn}, {})
    expect(result.radius).toBe(fn)
  })

  it('treats an omitted source as an empty object', () => {
    expect(merge({a: 1})).toEqual({a: 1})
  })
})

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

describe('copy() with values JSON cannot represent', () => {

  it('keeps functions, which theme config is full of', () => {
    const radius = cellSize => cellSize / 2
    const copied = copy({grid: {radius}})

    expect(copied.grid.radius).toBe(radius)
    expect(copied.grid.radius(40)).toBe(20)
  })

  it('rebuilds dates rather than turning them into strings', () => {
    const date = new Date('2024-03-09T00:00:00Z')
    const copied = copy({date})

    expect(copied.date).toBeInstanceOf(Date)
    expect(copied.date.getTime()).toBe(date.getTime())
    expect(copied.date).not.toBe(date)
  })

  it('rebuilds regexes', () => {
    const copied = copy({pattern: /abc/gi})
    expect(copied.pattern).toBeInstanceOf(RegExp)
    expect(copied.pattern.source).toBe('abc')
    expect(copied.pattern.flags).toBe('gi')
  })

  it('keeps undefined values instead of dropping the key', () => {
    const copied = copy({a: undefined, b: 1})
    expect('a' in copied).toBe(true)
    expect(copied.a).toBeUndefined()
  })

  it('still deep copies nested structures', () => {
    const original = {a: {b: [{c: 1}]}}
    const copied = copy(original)

    copied.a.b[0].c = 2
    expect(original.a.b[0].c).toBe(1)
  })
})
