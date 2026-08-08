import {describe, it, expect, vi} from 'vitest'
import Base from '../src/classes/base.js'
import Theme from '../src/classes/theme.js'

const createBase = (config, defaults) => {
  const base = new Base()
  base.initConfig(config, defaults)
  return base
}

describe('Base config', () => {

  it('merges config over the defaults', () => {
    const base = createBase({b: 2}, {a: 1, b: 1})
    expect(base.getConfig('a')).toBe(1)
    expect(base.getConfig('b')).toBe(2)
  })

  it('falls back to a given default for an unknown key', () => {
    const base = createBase({}, {})
    expect(base.getConfig('missing')).toBeUndefined()
    expect(base.getConfig('missing', 'fallback')).toBe('fallback')
  })

  it('does not mistake false for missing', () => {
    const base = createBase({flag: false}, {flag: true})
    expect(base.getConfig('flag', 'fallback')).toBe(false)
  })

  it('sets a value and reports the change', () => {
    const base = createBase({a: 1}, {})
    let detail = null
    base.on('config', event => detail = event.detail)

    base.setConfig('a', 2)
    expect(base.getConfig('a')).toBe(2)
    expect(detail).toEqual({key: 'a', value: 2})
  })

  it('stays quiet when the value has not changed', () => {
    const base = createBase({a: 1}, {})
    const listener = vi.fn()
    base.on('config', listener)

    base.setConfig('a', 1)
    expect(listener).not.toHaveBeenCalled()
  })

  it('toggles a flag', () => {
    const base = createBase({flag: false}, {})

    base.toggleConfig('flag')
    expect(base.getConfig('flag')).toBe(true)

    base.toggleConfig('flag')
    expect(base.getConfig('flag')).toBe(false)
  })

  it('toggles to an explicit value when given one', () => {
    const base = createBase({flag: false}, {})
    base.toggleConfig('flag', false)
    expect(base.getConfig('flag')).toBe(false)
  })

  it('loads several values at once', () => {
    const base = createBase({a: 1, b: 1}, {})
    base.loadConfig({a: 2, b: 3})

    expect(base.getConfig('a')).toBe(2)
    expect(base.getConfig('b')).toBe(3)
  })

  it('ignores an empty load', () => {
    const base = createBase({a: 1}, {})
    expect(() => base.loadConfig(null)).not.toThrow()
    expect(base.getConfig('a')).toBe(1)
  })

  it('hands out a copy rather than the live config', () => {
    const base = createBase({nested: {a: 1}}, {})
    const copy = base.getConfigCopy()

    copy.nested.a = 2
    expect(base.getConfig('nested').a).toBe(1)
  })
})

describe('Base events', () => {

  it('calls a listener with the detail', () => {
    const base = new Base()
    const listener = vi.fn()

    base.on('thing', listener)
    base.triggerEvent('thing', {value: 1})

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail).toEqual({value: 1})
  })

  it('stops calling a removed listener', () => {
    const base = new Base()
    const listener = vi.fn()

    base.on('thing', listener)
    base.off('thing', listener)
    base.triggerEvent('thing')

    expect(listener).not.toHaveBeenCalled()
  })

  it('ignores an event with no type', () => {
    const base = new Base()
    expect(() => base.triggerEvent()).not.toThrow()
  })

  it('calls several listeners on the same event', () => {
    const base = new Base()
    const a = vi.fn()
    const b = vi.fn()

    base.on('thing', a)
    base.on('thing', b)
    base.triggerEvent('thing')

    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })
})

describe('Theme', () => {

  it('falls back to the default theme with no config', () => {
    const theme = new Theme()
    expect(theme.get('board.stoneStyle')).toBe('slateShell')
  })

  it('overlays given config onto the defaults', () => {
    const theme = new Theme({board: {backgroundColor: '#000'}})
    expect(theme.get('board.backgroundColor')).toBe('#000')
    expect(theme.get('board.margin')).toBe(0.25)
  })

  it('calls a function valued property with the given arguments', () => {
    const theme = new Theme()
    expect(theme.get('grid.radius', 40)).toBe(20)
    expect(theme.get('stone.base.radius', 40)).toBe(Math.floor(40 / 2) * 0.97)
  })

  it('reports whether a property exists', () => {
    const theme = new Theme()
    expect(theme.has('board.margin')).toBe(true)
    expect(theme.has('board.nonsense')).toBe(false)
  })

  it('sets a property, including a function', () => {
    const theme = new Theme()

    theme.set('board.backgroundColor', '#fff')
    expect(theme.get('board.backgroundColor')).toBe('#fff')

    theme.set('grid.radius', cellSize => cellSize)
    expect(theme.get('grid.radius', 33)).toBe(33)
  })

  it('merges further config in', () => {
    const theme = new Theme()
    theme.merge({board: {backgroundColor: '#123'}})

    expect(theme.get('board.backgroundColor')).toBe('#123')
    expect(theme.get('board.stoneStyle')).toBe('slateShell')
  })

  it('resets back to the defaults', () => {
    const theme = new Theme({board: {backgroundColor: '#000'}})
    theme.resetToDefaults()
    expect(theme.get('board.backgroundColor')).toBe('#e2b768')
  })

  it('nudges odd line widths by half a pixel to keep lines crisp', () => {
    const theme = new Theme()
    expect(theme.canvasTranslate(1)).toBe(0.5)
    expect(theme.canvasTranslate(2)).toBe(0)
  })

  it('picks star points for the standard board sizes', () => {
    const theme = new Theme()
    expect(theme.get('grid.star.points', 19, 19)).toHaveLength(9)
    expect(theme.get('grid.star.points', 13, 13)).toHaveLength(4)
    expect(theme.get('grid.star.points', 12, 12)).toEqual([])
    expect(theme.get('grid.star.points', 19, 13)).toEqual([])
  })
})
