import {describe, it, expect} from 'vitest'
import Player from '../../src/classes/player.js'
import Theme from '../../src/classes/theme.js'
import {merge} from '../../src/helpers/object.js'
import {defaultPlayerConfig} from '../../src/constants/defaults.js'
import {playerModes} from '../../src/constants/player.js'

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

describe('player config', () => {

  it('lets availableModes be narrowed', () => {
    const player = new Player({
      availableModes: [playerModes.REPLAY, playerModes.EDIT],
    })

    expect(player.getConfig('availableModes')).toEqual([
      playerModes.REPLAY, playerModes.EDIT,
    ])
  })

  it('actually restricts which modes can be activated', () => {
    const player = new Player({
      availableModes: [playerModes.REPLAY],
    })

    expect(player.isModeAvailable(playerModes.REPLAY)).toBe(true)
    expect(player.isModeAvailable(playerModes.EDIT)).toBe(false)

    player.setMode(playerModes.EDIT)
    expect(player.getActiveMode()).toBe(playerModes.REPLAY)
  })

  it('always allows static mode regardless of config', () => {
    const player = new Player({availableModes: [playerModes.REPLAY]})
    expect(player.isModeAvailable(playerModes.STATIC)).toBe(true)
  })

  it('lets mouse bindings be replaced rather than appended to', () => {
    const mouseBindings = [{mouseEvent: 'wheelup', action: 'goToNextPosition'}]
    const player = new Player({mouseBindings})

    expect(player.getConfig('mouseBindings')).toEqual(mouseBindings)
  })

  it('keeps the defaults when nothing is overridden', () => {
    const player = new Player()
    expect(player.getConfig('availableModes'))
      .toEqual(defaultPlayerConfig.availableModes)
    expect(player.getConfig('mouseBindings'))
      .toEqual(defaultPlayerConfig.mouseBindings)
  })

  it('does not mutate the shared default config object', () => {
    const before = [...defaultPlayerConfig.availableModes]
    new Player({availableModes: [playerModes.REPLAY]})
    expect(defaultPlayerConfig.availableModes).toEqual(before)
  })
})

describe('theme config', () => {

  it('lets an array valued theme property be replaced', () => {
    const shellTypes = [{lines: [0.1], factor: 0.5, thickness: 1}]
    const theme = new Theme({stone: {slateShell: {shellTypes}}})
    expect(theme.get('stone.slateShell.shellTypes')).toEqual(shellTypes)
  })

  it('keeps theme functions from the defaults callable', () => {
    const theme = new Theme({board: {backgroundColor: '#fff'}})
    expect(theme.get('grid.radius', 40)).toBe(20)
    expect(theme.get('board.backgroundColor')).toBe('#fff')
  })

  it('lets a theme function be overridden', () => {
    const theme = new Theme({grid: {radius: () => 7}})
    expect(theme.get('grid.radius', 40)).toBe(7)
  })
})
