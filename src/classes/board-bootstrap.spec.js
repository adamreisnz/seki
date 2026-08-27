import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import Board from './board.js'
import BoardStatic from './board-static.js'
import Player from './player.js'
import {boardLayerTypes} from '../constants/board.js'
import {stubDom} from '../../test/helpers.js'

//A container that reports a size, which is what the board sizes itself to
const sizedContainer = (dom, width = 600, height = 400) => {
  Object.assign(dom.container, {clientWidth: width, clientHeight: height})
  return dom.container
}

const bootstrap = (config = {}, BoardClass = Board) => {
  const dom = stubDom()
  const board = new BoardClass({size: 19, showCoordinates: false, ...config})
  board.bootstrap(sizedContainer(dom))
  return {board, ...dom}
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Board bootstrapping', () => {

  it('builds a wrapper, a board and a canvas container', () => {
    const {board, container} = bootstrap()
    const {wrapper, board: element} = board.elements

    expect(container.children).toContain(wrapper)
    expect(wrapper.children).toContain(element)
  })

  it('gives every layer in the order a canvas of its own', () => {
    const {board} = bootstrap()

    const contexts = board.layerOrder.map(
      type => board.getLayer(type).context
    )
    expect(new Set(contexts).size).toBe(board.layerOrder.length)
  })

  it('lists the canvases it made', () => {
    const {board} = bootstrap()

    expect(board.elements.canvasses).toHaveLength(board.layerOrder.length)
  })

  it('sizes itself to the container it was put in', () => {

    //A 19x19 grid with a quarter cell margin in a 600 by 400 box is bounded
    //by the height, so the board comes out square at that
    const {board} = bootstrap()

    expect(board.drawWidth).toBeGreaterThan(0)
    expect(board.drawHeight).toBe(board.drawWidth)
    expect(board.lastDrawHeight).toBeLessThanOrEqual(400)
  })

  it('does not stack size observers when bootstrapped twice', () => {
    const {board, container, observers} = bootstrap()
    board.bootstrap(container)

    expect(observers).toHaveLength(2)
    expect(observers[0].disconnected).toBe(true)
  })

  it('takes the board it built last time out of the container', () => {

    //A second bootstrap used to stack a dead board under the live one, at
    //full size, with nothing pointing at it any more. The audio elements and
    //the resize observer both handled this already.
    const {board, container} = bootstrap()
    const first = board.elements.wrapper
    board.bootstrap(container)

    const wrappers = container.children
      .filter(child => child.className === 'seki-board-wrapper')
    expect(wrappers).toEqual([board.elements.wrapper])
    expect(board.elements.wrapper).not.toBe(first)
  })

  it('has nothing to take out on a first bootstrap', () => {
    const dom = stubDom()
    const board = new Board({size: 19})

    expect(() => board.bootstrap(sizedContainer(dom))).not.toThrow()
    expect(dom.container.children).toHaveLength(1)
  })

  it('recalculates when the container changes size', () => {
    const {board, container, observers} = bootstrap()
    const before = board.lastDrawWidth

    Object.assign(container, {clientWidth: 300, clientHeight: 300})
    observers[0].callback()
    vi.advanceTimersByTime(200)

    expect(board.lastDrawWidth).toBeLessThan(before)
  })

  it('leaves the size alone when nothing changed', () => {
    const {board} = bootstrap()
    const spy = vi.spyOn(board, 'propagateDrawSize')

    board.recalculateDrawSize()

    expect(spy).not.toHaveBeenCalled()
  })

  it('recalculates nothing before it has a container', () => {
    const board = new Board({size: 19})
    const spy = vi.spyOn(board, 'propagateDrawSize')

    board.recalculateDrawSize()

    expect(spy).not.toHaveBeenCalled()
  })

  it('falls back to the smaller side before it knows its grid', () => {

    //A board with no size yet has no grid to fit, so all it can do is take
    //the largest square the container allows
    const dom = stubDom()
    const board = new Board()
    board.width = 0
    board.height = 0
    board.elements.container = sizedContainer(dom, 500, 300)

    expect(board.getDrawSize()).toEqual({drawWidth: 300, drawHeight: 300})
  })

  it('applies the pixel ratio to the canvases, not to the element', () => {

    //The element is laid out in CSS pixels and the canvas is drawn in device
    //ones, which is what keeps a board sharp on a retina display
    const dom = stubDom({devicePixelRatio: 2})
    const board = new Board({size: 19, showCoordinates: false})
    board.bootstrap(sizedContainer(dom))

    const {board: element, canvasses} = board.elements
    const width = board.lastDrawWidth

    expect(element.style.width).toBe(`${width}px`)
    expect(canvasses[0].width).toBe(width * 2)
    expect(board.drawWidth).toBe(width * 2)
  })

  it('holds the size but paints nothing before it is bootstrapped', () => {
    const board = new Board({size: 19})
    board.propagateDrawSize(400, 400)

    expect(board.lastDrawWidth).toBe(400)
    expect(board.drawWidth).toBe(0)
  })

  it('shows itself once it has settled', () => {
    const {board} = bootstrap()

    expect(board.elements.board.style.visibility).toBeUndefined()
    vi.advanceTimersByTime(200)
    expect(board.elements.board.style.visibility).toBe('visible')
  })
})

describe('Board destruction', () => {

  it('takes its board back out of the container', () => {

    //Left standing it is an orphan at full size, which a board bootstrapped
    //again onto the same container would sit underneath
    const {board, container} = bootstrap()
    board.destroy()

    expect(container.children.filter(
      child => child.className === 'seki-board-wrapper'
    )).toHaveLength(0)
  })

  it('sizes the canvases again when bootstrapped onto the same container', () => {

    //The draw size is only propagated when it differs from the last one
    //propagated. Destroying throws the canvases that size described away, so
    //holding on to it left the new ones at nothing to draw on
    const {board, container} = bootstrap()
    board.destroy()
    board.bootstrap(container)

    const {canvasses, board: element} = board.elements
    expect(canvasses[0].width).toBeGreaterThan(0)
    expect(element.style.width).toBe(`${board.lastDrawWidth}px`)
  })
})

describe('Board classes', () => {

  it('adds and removes a class on the board element', () => {
    const {board} = bootstrap()

    board.addClass('a-class')
    expect(board.elements.board.classList.contains('a-class')).toBe(true)

    board.removeClass('a-class')
    expect(board.elements.board.classList.contains('a-class')).toBe(false)
  })
})

describe('Board config propagation', () => {

  it('redraws when a config key that changes the drawing changes', () => {
    const {board} = bootstrap()
    const spy = vi.spyOn(board, 'computeAndRedraw')

    board.setConfig('showStarPoints', false)
    vi.advanceTimersByTime(200)

    expect(spy).toHaveBeenCalled()
  })

  it('resizes when a config key that changes the board extent changes', () => {

    //Cutting an edge off changes how many cells have to fit, so the draw
    //size has to be worked out again rather than only repainted
    const {board} = bootstrap()
    const spy = vi.spyOn(board, 'recalculateDrawSize')

    board.setConfig('cutOffTop', 2)
    vi.advanceTimersByTime(200)

    expect(spy).toHaveBeenCalled()
  })

  it('ignores a config key that changes neither', () => {
    const {board} = bootstrap()
    const spy = vi.spyOn(board, 'computeAndRedraw')

    board.setConfig('somethingElse', true)
    vi.advanceTimersByTime(200)

    expect(spy).not.toHaveBeenCalled()
  })

  it('takes the board settings off the player it is linked to', () => {
    const {board} = bootstrap()
    const player = new Player({swapColors: true})

    board.linkPlayer(player)

    expect(board.player).toBe(player)
    expect(board.getConfig('swapColors')).toBe(true)
  })

  it('follows the player when one of those settings changes', () => {
    const {board} = bootstrap()
    const player = new Player()
    board.linkPlayer(player)

    player.setConfig('showStarPoints', false)

    expect(board.getConfig('showStarPoints')).toBe(false)
  })

  it('ignores the player settings that are none of its business', () => {
    const {board} = bootstrap()
    const player = new Player()
    board.linkPlayer(player)

    player.setConfig('showLastMove', false)

    expect(board.getConfig('showLastMove')).toBeUndefined()
  })
})

describe('Board canvas export', () => {

  it('merges every layer onto one canvas', () => {
    const {board} = bootstrap()
    const merged = board.getCanvas()

    expect(merged.tagName).toBe('CANVAS')
    expect(merged.context.drawImage)
      .toHaveBeenCalledTimes(board.layerOrder.length)
  })

  it('takes its size from the layers it merged', () => {
    const {board} = bootstrap()
    board.elements.canvasses[0].width = 800
    board.elements.canvasses[0].height = 800

    const merged = board.getCanvas()

    expect(merged.width).toBe(800)
    expect(merged.height).toBe(800)
  })
})

describe('BoardStatic', () => {

  it('leaves out the layers a static board has no use for', () => {
    const {board} = bootstrap({}, BoardStatic)

    expect(board.layerOrder).not.toContain(boardLayerTypes.HOVER)
    expect(board.layerOrder).not.toContain(boardLayerTypes.DRAW)
    expect(board.layerOrder).toContain(boardLayerTypes.STONES)
  })

  it('marks its elements as static', () => {
    const {board} = bootstrap({}, BoardStatic)
    const {wrapper, board: element} = board.elements

    expect(wrapper.classList.contains('seki-board-wrapper-static')).toBe(true)
    expect(element.classList.contains('seki-board-static')).toBe(true)
  })

  it('still redraws a single layer', () => {

    //NOTE: eraseLayer and redrawLayer were once stubbed out here, which left
    //the shadow layer uncleared when the position was replaced and the grid
    //unredrawn under new markup
    const {board} = bootstrap({}, BoardStatic)
    const layer = board.getLayer(boardLayerTypes.SHADOW)
    const spy = vi.spyOn(layer, 'redraw')

    board.redrawLayer(boardLayerTypes.SHADOW)

    expect(spy).toHaveBeenCalled()
  })

  it('still erases a single layer', () => {
    const {board} = bootstrap({}, BoardStatic)
    const layer = board.getLayer(boardLayerTypes.SHADOW)
    const spy = vi.spyOn(layer, 'erase')

    board.eraseLayer(boardLayerTypes.SHADOW)

    expect(spy).toHaveBeenCalled()
  })
})
