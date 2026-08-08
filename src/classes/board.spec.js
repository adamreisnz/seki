import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Board from './board.js'

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
