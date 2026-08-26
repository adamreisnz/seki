import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {
  randomInt, dateString, isKeyDownEvent, isMouseEvent, throttle,
  addClass, removeClass, hasClass, toggleClass,
  createCanvasContext, mergeCanvases, getPixelRatio,
  setDebug, getDebug
} from './util.js'
import {mouseEvents} from '../constants/util.js'
import {stubDom, createStubElement} from '../../test/helpers.js'

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

describe('class helpers', () => {

  //A class list stand-in, which is all these helpers touch
  const createElement = () => {
    const classes = new Set()
    return {
      classes,
      classList: {
        add: name => classes.add(name),
        remove: name => classes.delete(name),
        contains: name => classes.has(name),
        toggle: (name, value) => {
          const on = (value === undefined) ? !classes.has(name) : value
          classes[on ? 'add' : 'delete'](name)
        },
      },
    }
  }

  beforeEach(() => {
    vi.stubGlobal('HTMLCollection', class HTMLCollection {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds, reads and removes a class', () => {
    const element = createElement()

    addClass(element, 'a-class')
    expect(hasClass(element, 'a-class')).toBe(true)

    removeClass(element, 'a-class')
    expect(hasClass(element, 'a-class')).toBe(false)
  })

  it('toggles a class on and off', () => {
    const element = createElement()

    toggleClass(element, 'a-class')
    expect(hasClass(element, 'a-class')).toBe(true)

    toggleClass(element, 'a-class')
    expect(hasClass(element, 'a-class')).toBe(false)
  })

  it('toggles to the state it is given', () => {
    const element = createElement()

    toggleClass(element, 'a-class', false)
    expect(hasClass(element, 'a-class')).toBe(false)

    toggleClass(element, 'a-class', true)
    expect(hasClass(element, 'a-class')).toBe(true)
  })

  it('applies a class to every element of an array', () => {
    const elements = [createElement(), createElement()]

    addClass(elements, 'a-class')

    expect(elements.every(el => hasClass(el, 'a-class'))).toBe(true)
  })

  it('applies a class to every element of a collection', () => {

    //getElementsByClassName and friends hand back a live collection rather
    //than an array, which has no forEach of its own
    const elements = [createElement(), createElement()]
    const collection = Object.assign(
      Object.create(HTMLCollection.prototype),
      {length: 2, 0: elements[0], 1: elements[1], [Symbol.iterator]: function* () {
        yield elements[0]
        yield elements[1]
      }}
    )

    addClass(collection, 'a-class')

    expect(elements.every(el => hasClass(el, 'a-class'))).toBe(true)
  })

  it('does nothing at all for no element', () => {
    expect(() => addClass(null, 'a-class')).not.toThrow()
    expect(() => addClass(undefined, 'a-class')).not.toThrow()
  })
})

describe('canvas helpers', () => {

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a canvas in the parent and hands back its context', () => {
    const {container} = stubDom()
    const context = createCanvasContext(container, 'a-class')

    expect(container.children).toHaveLength(1)
    expect(container.children[0].tagName).toBe('CANVAS')
    expect(container.children[0].className).toBe('a-class')
    expect(context).toBe(container.children[0].context)
  })

  it('creates one without a class name too', () => {
    const {container} = stubDom()
    createCanvasContext(container)

    expect(container.children[0].tagName).toBe('CANVAS')
  })

  it('merges canvases onto one, at the size of the first', () => {
    stubDom()
    const canvases = [
      Object.assign(createStubElement('canvas'), {width: 400, height: 300}),
      Object.assign(createStubElement('canvas'), {width: 400, height: 300}),
    ]

    const merged = mergeCanvases(canvases)

    expect(merged.width).toBe(400)
    expect(merged.height).toBe(300)
    expect(merged.context.drawImage).toHaveBeenCalledTimes(2)
    expect(merged.context.drawImage).toHaveBeenCalledWith(canvases[0], 0, 0)
  })

  it('reads the pixel ratio off the window, defaulting to one', () => {
    vi.stubGlobal('window', {})
    expect(getPixelRatio()).toBe(1)

    vi.stubGlobal('window', {devicePixelRatio: 3})
    expect(getPixelRatio()).toBe(3)
  })
})

describe('debug flag', () => {

  afterEach(() => setDebug(false))

  it('is off to start with', () => {
    expect(getDebug()).toBe(false)
  })

  it('turns on and off again', () => {
    setDebug(true)
    expect(getDebug()).toBe(true)

    setDebug(false)
    expect(getDebug()).toBe(false)
  })
})
