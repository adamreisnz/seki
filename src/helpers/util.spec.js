import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {
  randomInt, dateString, isKeyDownEvent, isMouseEvent, throttle
} from './util.js'
import {mouseEvents} from '../constants/util.js'

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

describe('throttle()', () => {

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs the first call immediately', () => {
    const fn = vi.fn()
    throttle(fn, 100)('a')
    expect(fn).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('collapses calls made during a window into one trailing call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a')
    throttled('b')
    throttled('c')
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not drop the final call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('first')
    throttled('second')
    throttled('final')
    vi.advanceTimersByTime(500)

    //The last set of arguments has to win, otherwise a resize settles on a
    //stale size
    expect(fn).toHaveBeenLastCalledWith('final')
  })

  it('stays idle when nothing came in during the window', () => {
    const fn = vi.fn()
    throttle(fn, 100)('a')
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('runs immediately again after an idle window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a')
    vi.advanceTimersByTime(200)
    throttled('b')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })

  it('keeps separate state per throttled version of the same function', () => {
    const fn = vi.fn()
    const a = throttle(fn, 100)
    const b = throttle(fn, 100)

    a('a')
    b('b')

    //Sharing state via the function object meant the second wrapper saw the
    //first one's window and swallowed the call
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
