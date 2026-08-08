import {describe, it, expect} from 'vitest'
import {deepmerge} from './deepmerge.js'

describe('deepmerge', () => {

  it('merges plain objects a level at a time', () => {
    const result = deepmerge(
      {a: 1, nested: {x: 1, y: 2}},
      {b: 2, nested: {y: 3, z: 4}}
    )
    expect(result).toEqual({a: 1, b: 2, nested: {x: 1, y: 3, z: 4}})
  })

  it('leaves both inputs untouched', () => {
    const target = {nested: {x: 1}}
    const source = {nested: {y: 2}}

    const result = deepmerge(target, source)

    expect(target).toEqual({nested: {x: 1}})
    expect(source).toEqual({nested: {y: 2}})
    expect(result.nested).not.toBe(target.nested)
    expect(result.nested).not.toBe(source.nested)
  })

  it('defaults the source to nothing', () => {
    expect(deepmerge({a: 1})).toEqual({a: 1})
  })

  it('replaces the target value with a source value of a different shape', () => {
    expect(deepmerge({a: {x: 1}}, {a: 'plain'})).toEqual({a: 'plain'})
    expect(deepmerge({a: 'plain'}, {a: {x: 1}})).toEqual({a: {x: 1}})
  })

  it('keeps a source value of undefined', () => {
    expect(deepmerge({a: 1}, {a: undefined})).toEqual({a: undefined})
  })
})

describe('deepmerge arrays', () => {

  it('replaces an array rather than concatenating it', () => {

    //NOTE: the upstream default concatenates. Everything merged here is
    //configuration, and for configuration that means a caller can only ever
    //add to a default array and never replace or trim one
    expect(deepmerge({modes: ['replay', 'edit', 'play']}, {modes: ['replay']}))
      .toEqual({modes: ['replay']})
  })

  it('replaces an array with an empty one', () => {
    expect(deepmerge({bindings: [{key: 'a'}]}, {bindings: []}))
      .toEqual({bindings: []})
  })

  it('copies the entries rather than sharing them', () => {
    const source = {items: [{x: 1}]}
    const result = deepmerge({items: []}, source)

    result.items[0].x = 2

    expect(source.items[0].x).toBe(1)
  })

  it('merges two bare arrays', () => {
    expect(deepmerge(['a', 'b'], ['c'])).toEqual(['c'])
  })

  it('takes the source when only one side is an array', () => {
    expect(deepmerge({a: 1}, ['c'])).toEqual(['c'])
    expect(deepmerge(['c'], {a: 1})).toEqual({a: 1})
  })
})

describe('deepmerge special values', () => {

  it('carries functions across by reference', () => {

    //NOTE: theme config is full of handler functions, and they are behaviour
    //rather than data, so they are shared rather than copied
    const handler = () => 'value'
    const result = deepmerge({}, {radius: handler})
    expect(result.radius).toBe(handler)
  })

  it('does not merge into a function', () => {
    const handler = () => 'value'
    expect(deepmerge({radius: {a: 1}}, {radius: handler}).radius).toBe(handler)
  })

  it('treats dates and regexes as values', () => {
    const date = new Date(0)
    const regex = /abc/g
    const result = deepmerge({}, {date, regex})
    expect(result.date).toBe(date)
    expect(result.regex).toBe(regex)
  })

  it('refuses to merge a prototype polluting key', () => {
    const result = deepmerge({}, JSON.parse('{"__proto__": {"polluted": true}}'))
    expect(result.polluted).toBeUndefined()
    expect({}.polluted).toBeUndefined()
  })
})
