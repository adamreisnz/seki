import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import Base from './base.js'
import {setDebug} from '../helpers/util.js'

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

describe('Base logging', () => {

  //The logging helpers only speak when the debug flag is on, so both sides
  //of that are what there is to check
  class Loud extends Base {}

  let logged

  beforeEach(() => {
    logged = {log: [], warn: [], trace: []}
    vi.spyOn(console, 'log').mockImplementation((...args) => logged.log.push(args))
    vi.spyOn(console, 'warn').mockImplementation((...args) => logged.warn.push(args))
    vi.spyOn(console, 'trace').mockImplementation((...args) => logged.trace.push(args))
  })

  afterEach(() => {
    setDebug(false)
    vi.restoreAllMocks()
  })

  it('says nothing while debugging is off', () => {
    const base = new Loud()

    base.debug('a message')
    base.warn('a warning')
    base.trace('a trace')

    expect(logged.log).toHaveLength(0)
    expect(logged.warn).toHaveLength(0)
    expect(logged.trace).toHaveLength(0)
  })

  it('names the class it is speaking for once debugging is on', () => {
    setDebug(true)
    const base = new Loud()

    base.debug('a message')
    base.warn('a warning')
    base.trace('a trace')

    expect(logged.log[0]).toEqual(['Loud:', 'a message'])
    expect(logged.warn[0]).toEqual(['Loud:', 'a warning'])
    expect(logged.trace[0]).toEqual(['Loud:', 'a trace'])
  })

  it('passes everything it was given through', () => {
    setDebug(true)
    const base = new Loud()

    base.debug('a message', {some: 'detail'}, 42)

    expect(logged.log[0]).toEqual(['Loud:', 'a message', {some: 'detail'}, 42])
  })
})
