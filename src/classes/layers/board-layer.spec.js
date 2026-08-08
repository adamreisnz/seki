import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import BoardLayer from './board-layer.js'
import Theme from '../theme.js'

//Erasing reads the device pixel ratio off the window, which isn't there
//outside a browser
beforeEach(() => {
  vi.stubGlobal('window', {devicePixelRatio: 1})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * A board stand-in that is big enough to draw on
 */
const createBoard = () => ({
  theme: new Theme(),
  getCellSize: () => 20,
  getAbsX: x => x * 20,
  getAbsY: y => y * 20,
  isOnBoard: (x, y) => (x >= 0 && y >= 0 && x < 19 && y < 19),
  drawWidth: 400,
  drawHeight: 400,
})

/**
 * A context with a canvas, which is all erase() looks at
 */
const createContext = () => ({
  canvas: {clientWidth: 400, clientHeight: 400},
  clearRect: vi.fn(),
  translate: vi.fn(),
})

/**
 * An object that records the calls it gets, standing in for a stone or markup
 */
const createObject = () => ({
  draw: vi.fn(),
  erase: vi.fn(),
})

const createLayer = (withContext = true) => {
  const layer = new BoardLayer(createBoard())
  layer.setGridSize(19, 19)
  if (withContext) {
    layer.setContext(createContext())
  }
  return layer
}

describe('BoardLayer grid bookkeeping', () => {

  it('adds, reads and removes an object', () => {
    const layer = createLayer()
    const object = createObject()

    layer.add(3, 3, object)
    expect(layer.get(3, 3)).toBe(object)
    expect(layer.has(3, 3)).toBe(true)

    layer.remove(3, 3)
    expect(layer.has(3, 3)).toBe(false)
  })

  it('hands back the whole grid', () => {
    const layer = createLayer()
    layer.add(3, 3, createObject())
    expect(layer.getAll().getAll()).toHaveLength(1)
  })

  it('swaps in a whole grid at once', () => {
    const layer = createLayer()
    const replacement = createLayer().getAll()
    replacement.set(5, 5, createObject())

    layer.setAll(replacement)

    expect(layer.get(5, 5)).toBeDefined()
  })

  it('clears everything', () => {
    const layer = createLayer()
    layer.add(3, 3, createObject())
    layer.removeAll()
    expect(layer.getAll().isEmpty()).toBe(true)
  })

  it('drops its objects when the grid is re-sized', () => {
    const layer = createLayer()
    layer.add(3, 3, createObject())
    layer.setGridSize(9, 9)
    expect(layer.getAll().isEmpty()).toBe(true)
  })

  it('keeps them when the grid size does not change', () => {

    //NOTE: this leans on Grid#setSize recognising a no-op, which it used to
    //get wrong for a square grid given a single dimension
    const layer = createLayer()
    layer.add(3, 3, createObject())
    layer.setGridSize(19, 19)
    expect(layer.get(3, 3)).toBeDefined()
  })
})

describe('BoardLayer drawing', () => {

  it('draws every object on the grid', () => {
    const layer = createLayer()
    const first = createObject()
    const second = createObject()

    layer.grid.set(3, 3, first)
    layer.grid.set(4, 4, second)
    layer.draw()

    expect(first.draw).toHaveBeenCalledWith(layer.context, 3, 3)
    expect(second.draw).toHaveBeenCalledWith(layer.context, 4, 4)
  })

  it('draws each object in a stack of them', () => {
    const layer = createLayer()
    const shadow = createObject()
    const stone = createObject()

    layer.grid.set(3, 3, [shadow, stone])
    layer.draw()

    expect(shadow.draw).toHaveBeenCalled()
    expect(stone.draw).toHaveBeenCalled()
  })

  it('erases the whole canvas', () => {
    const layer = createLayer()
    layer.erase()
    expect(layer.context.clearRect).toHaveBeenCalledWith(0, 0, 400, 400)
  })

  it('erases and draws a single cell', () => {
    const layer = createLayer()
    const object = createObject()

    layer.grid.set(3, 3, object)
    layer.redrawCell(3, 3)

    expect(object.erase).toHaveBeenCalledWith(layer.context, 3, 3)
    expect(object.draw).toHaveBeenCalledWith(layer.context, 3, 3)
  })

  it('leaves an empty cell alone', () => {
    const layer = createLayer()
    expect(() => layer.drawCell(3, 3)).not.toThrow()
    expect(() => layer.eraseCell(3, 3)).not.toThrow()
  })

  it('leaves a cell off the board alone', () => {
    const layer = createLayer()
    const object = createObject()

    layer.grid.set(3, 3, object)
    layer.board.isOnBoard = () => false
    layer.drawCell(3, 3)

    expect(object.draw).not.toHaveBeenCalled()
  })
})

describe('BoardLayer before it can draw', () => {

  it('knows it cannot draw without a context', () => {
    expect(createLayer(false).canDraw()).toBe(false)
  })

  it('knows it cannot draw without dimensions', () => {
    const layer = createLayer()
    layer.board.drawWidth = 0
    expect(layer.canDraw()).toBe(false)
  })

  it('still keeps its bookkeeping straight', () => {

    //NOTE: drawCell and eraseCell used to reach for the context without
    //checking, so adding an object before the board was bootstrapped threw,
    //even though the grid side of it is perfectly valid at that point
    const layer = createLayer(false)
    const object = createObject()

    expect(() => layer.add(3, 3, object)).not.toThrow()
    expect(layer.get(3, 3)).toBe(object)

    expect(() => layer.remove(3, 3)).not.toThrow()
    expect(layer.has(3, 3)).toBe(false)
  })

  it('draws nothing until it can', () => {
    const layer = createLayer(false)
    const object = createObject()

    layer.grid.set(3, 3, object)
    layer.draw()
    layer.redraw()

    expect(object.draw).not.toHaveBeenCalled()
  })
})

describe('BoardLayer theme', () => {

  it('reads the theme off the board', () => {
    const layer = createLayer()
    expect(layer.theme).toBe(layer.board.theme)
  })

  it('has no theme without a board', () => {
    const layer = createLayer()
    layer.board = null
    expect(layer.theme).toBeNull()
  })
})
