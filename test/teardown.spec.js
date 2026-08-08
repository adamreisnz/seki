import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Player from '../src/classes/player.js'
import Board from '../src/classes/board.js'
import {playerModes} from '../src/constants/player.js'

/**
 * Minimal ResizeObserver stub. The real one isn't available outside a
 * browser, and all the board does with it is observe and disconnect.
 */
class ResizeObserverStub {
  static instances = []
  constructor(callback) {
    this.callback = callback
    this.observed = []
    this.disconnected = false
    ResizeObserverStub.instances.push(this)
  }
  observe(element) {
    this.observed.push(element)
  }
  disconnect() {
    this.disconnected = true
  }
}

const createContainer = () => ({tagName: 'DIV'})

describe('Board teardown', () => {

  beforeEach(() => {
    ResizeObserverStub.instances = []
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createObservedBoard = () => {
    const board = new Board({size: 19})
    board.elements.container = createContainer()
    board.setupResizeObserver()
    return board
  }

  it('observes the container rather than the document body', () => {
    const board = new Board({size: 19})
    const container = createContainer()
    board.elements.container = container
    board.setupResizeObserver()

    expect(ResizeObserverStub.instances).toHaveLength(1)
    expect(ResizeObserverStub.instances[0].observed).toEqual([container])
  })

  it('disconnects the observer when destroyed', () => {
    const board = createObservedBoard()
    board.destroy()
    expect(ResizeObserverStub.instances[0].disconnected).toBe(true)
  })

  it('does not stack observers when set up twice', () => {
    const board = createObservedBoard()
    board.setupResizeObserver()

    expect(ResizeObserverStub.instances).toHaveLength(2)
    expect(ResizeObserverStub.instances[0].disconnected).toBe(true)
    expect(ResizeObserverStub.instances[1].disconnected).toBe(false)
  })

  it('clears its layers and element references', () => {
    const board = createObservedBoard()
    board.createLayers()
    board.destroy()

    expect(board.layers.size).toBe(0)
    expect(board.elements).toEqual({})
  })

  it('can be destroyed without ever having been bootstrapped', () => {
    const board = new Board({size: 19})
    expect(() => board.destroy()).not.toThrow()
  })
})

describe('Player teardown', () => {

  let player

  beforeEach(() => {
    vi.useFakeTimers()
    ResizeObserverStub.instances = []
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    player = new Player()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('cancels pending capture sound timeouts', () => {
    player.playCaptureSounds(5)
    expect(vi.getTimerCount()).toBe(5)

    player.teardown()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('caps the number of capture sounds', () => {
    player.playCaptureSounds(100)
    expect(vi.getTimerCount()).toBe(10)
  })

  it('tears down every mode handler, not just the active one', () => {
    const spies = Object
      .values(player.modeHandlers)
      .map(handler => vi.spyOn(handler, 'teardown'))

    player.teardown()

    expect(spies).not.toHaveLength(0)
    for (const spy of spies) {
      expect(spy).toHaveBeenCalled()
    }
  })

  it('destroys the board', () => {
    const spy = vi.spyOn(player.board, 'destroy')
    player.teardown()
    expect(spy).toHaveBeenCalled()
  })

  it('stops emitting events once torn down', () => {
    const listener = vi.fn()
    player.on('pathChange', listener)
    player.teardown()
    player.triggerEvent('pathChange', {})
    expect(listener).not.toHaveBeenCalled()
  })

  it('leaves no timers behind after teardown', () => {
    player.playCaptureSounds(3)
    player.teardown()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('Replay mode config listener', () => {

  let player
  let replay

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    player = new Player()
    replay = player.getModeHandler(playerModes.REPLAY)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('re-queues auto play when the delay changes mid-play', () => {
    const spy = vi.spyOn(replay, 'queueNextAutoPlay')
    replay.isAutoPlaying = true

    player.setConfig('autoPlayDelay', 500)
    expect(spy).toHaveBeenCalled()
  })

  it('ignores the delay change when not auto playing', () => {
    const spy = vi.spyOn(replay, 'queueNextAutoPlay')
    replay.isAutoPlaying = false

    player.setConfig('autoPlayDelay', 500)
    expect(spy).not.toHaveBeenCalled()
  })

  it('stops responding to config changes once torn down', () => {
    const spy = vi.spyOn(replay, 'queueNextAutoPlay')
    replay.isAutoPlaying = true

    //The delay handling used to sit on a second listener registered outside
    //the event listeners map, which teardown had no way of removing
    player.teardown()
    replay.isAutoPlaying = true
    player.setConfig('autoPlayDelay', 750)

    expect(spy).not.toHaveBeenCalled()
  })

  it('clears the auto play timeout on teardown', () => {
    replay.isAutoPlaying = true
    replay.queueNextAutoPlay()
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    replay.teardown()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('Edit mode teardown', () => {

  let player
  let edit

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    player = new Player()
    edit = player.getModeHandler(playerModes.EDIT)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('flushes buffered free draw lines rather than dropping them', () => {
    const listener = vi.fn()
    player.on('edit', listener)

    edit.triggerAddLineEvent(0, 0, 1, 1, '#fff')
    expect(listener).not.toHaveBeenCalled()

    edit.teardown()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail.action).toBe('addLines')
  })

  it('clears the buffer timeout', () => {
    edit.triggerAddLineEvent(0, 0, 1, 1, '#fff')
    expect(vi.getTimerCount()).toBe(1)

    edit.teardown()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does nothing when there is nothing buffered', () => {
    expect(() => edit.teardown()).not.toThrow()
  })
})
