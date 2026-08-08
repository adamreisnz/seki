import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import EventHandler from './event-handler.js'

describe('EventHandler', () => {

  let target
  let handler

  beforeEach(() => {
    vi.useFakeTimers()
    target = new EventTarget()
    handler = new EventHandler(target)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const fire = (type = 'tick', times = 1) => {
    for (let i = 0; i < times; i++) {
      target.dispatchEvent(new Event(type))
    }
  }

  it('requires a target element', () => {
    expect(() => new EventHandler()).toThrow('Must instantiate with target element')
  })

  describe('without throttling', () => {

    it('calls the listener for every event', () => {
      const fn = vi.fn()
      handler.on('tick', fn)
      fire('tick', 3)
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('stops calling the listener once removed', () => {
      const fn = vi.fn()
      handler.on('tick', fn)
      handler.off('tick')
      fire('tick')
      expect(fn).not.toHaveBeenCalled()
    })

    it('removes all listeners at once', () => {
      const a = vi.fn()
      const b = vi.fn()
      handler.on('tick', a)
      handler.on('tock', b)
      handler.removeAllEventListeners()
      fire('tick')
      fire('tock')
      expect(a).not.toHaveBeenCalled()
      expect(b).not.toHaveBeenCalled()
    })
  })

  describe('with throttling', () => {

    it('calls the listener on the first event', () => {
      const fn = vi.fn()
      handler.on('tick', fn, 100)
      fire('tick')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('suppresses further events within the window', () => {
      const fn = vi.fn()
      handler.on('tick', fn, 100)
      fire('tick', 5)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('lets the window expire even under a continuous stream of events', () => {
      const fn = vi.fn()
      handler.on('tick', fn, 100)

      //Fire an event every 10ms for half a second. A window that gets reset
      //by each event would never expire, and the listener would only ever
      //have been called once.
      for (let i = 0; i < 50; i++) {
        fire('tick')
        vi.advanceTimersByTime(10)
      }

      expect(fn.mock.calls.length).toBeGreaterThan(1)
    })

    it('calls the listener again once the window has passed', () => {
      const fn = vi.fn()
      handler.on('tick', fn, 100)
      fire('tick')
      vi.advanceTimersByTime(150)
      fire('tick')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('passes the event through to the listener', () => {
      const fn = vi.fn()
      handler.on('tick', fn, 100)
      fire('tick')
      expect(fn.mock.calls[0][0]).toBeInstanceOf(Event)
    })

    it('clears a pending window when the listener is removed', () => {
      const fn = vi.fn()
      handler.on('tick', fn, 100)
      fire('tick')
      handler.off('tick')
      expect(vi.getTimerCount()).toBe(0)
    })

    it('clears pending windows when all listeners are removed', () => {
      handler.on('tick', vi.fn(), 100)
      handler.on('tock', vi.fn(), 100)
      fire('tick')
      fire('tock')
      handler.removeAllEventListeners()
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe('re-registering the same key', () => {

    it('does not leave the previous listener attached', () => {
      const first = vi.fn()
      const second = vi.fn()
      handler.on('tick', first)
      handler.on('tick', second)
      fire('tick')
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })
  })

  describe('namespaced events', () => {

    it('binds to the type before the namespace', () => {
      const fn = vi.fn()
      handler.on('tick.mine', fn)
      fire('tick')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('allows several listeners on one type via namespaces', () => {
      const a = vi.fn()
      const b = vi.fn()
      handler.on('tick.a', a)
      handler.on('tick.b', b)
      fire('tick')
      expect(a).toHaveBeenCalledTimes(1)
      expect(b).toHaveBeenCalledTimes(1)
    })

    it('removes only the namespaced listener asked for', () => {
      const a = vi.fn()
      const b = vi.fn()
      handler.on('tick.a', a)
      handler.on('tick.b', b)
      handler.off('tick.a')
      fire('tick')
      expect(a).not.toHaveBeenCalled()
      expect(b).toHaveBeenCalledTimes(1)
    })
  })
})
