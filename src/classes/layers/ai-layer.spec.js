import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import AiLayer from './ai-layer.js'
import Grid from '../grid.js'
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
 * A marker that records the calls it gets. Putting the grid line back is the
 * marker's own job on erase, which is why the layer has to erase each of them
 * rather than only clearing the canvas.
 */
const createMarker = () => ({
  draw: vi.fn(),
  erase: vi.fn(),
})

const createLayer = () => {
  const layer = new AiLayer(createBoard())
  layer.setGridSize(19, 19)
  layer.setContext(createContext())
  return layer
}

const createGrid = (points) => {
  const grid = new Grid(19, 19)
  for (const [x, y, marker] of points) {
    grid.set(x, y, marker)
  }
  return grid
}

describe('AiLayer', () => {

  it('draws the markers it is given', () => {
    const layer = createLayer()
    const marker = createMarker()

    layer.setAll(createGrid([[3, 3, marker]]))

    expect(layer.get(3, 3)).toBe(marker)
    expect(marker.draw).toHaveBeenCalledWith(layer.context, 3, 3)
  })

  it('erases the whole canvas rather than the cells it held', () => {

    //NOTE: a candidate marker draws a drop shadow that reaches outside its own
    //cell, which a cell sized erase leaves a crescent of behind
    const layer = createLayer()
    layer.setAll(createGrid([[3, 3, createMarker()]]))
    layer.context.clearRect.mockClear()

    layer.removeAll()

    expect(layer.context.clearRect).toHaveBeenCalledWith(0, 0, 400, 400)
    expect(layer.getAll().isEmpty()).toBe(true)
  })

  it('erases each marker in turn as well, to put the grid back', () => {

    //Clearing the canvas as a whole knows nothing about the grid line each
    //marker erased underneath itself, which the marker restores on erase
    const layer = createLayer()
    const first = createMarker()
    const second = createMarker()

    layer.setAll(createGrid([[3, 3, first], [5, 5, second]]))
    layer.removeAll()

    expect(first.erase).toHaveBeenCalledWith(layer.context, 3, 3)
    expect(second.erase).toHaveBeenCalledWith(layer.context, 5, 5)
  })

  it('takes down the previous set before drawing the next', () => {
    const layer = createLayer()
    const old = createMarker()

    layer.setAll(createGrid([[3, 3, old]]))
    layer.setAll(createGrid([[5, 5, createMarker()]]))

    expect(old.erase).toHaveBeenCalledWith(layer.context, 3, 3)
    expect(layer.has(3, 3)).toBe(false)
    expect(layer.has(5, 5)).toBe(true)
  })

  it('redraws what is left when a single marker is removed', () => {
    const layer = createLayer()
    const kept = createMarker()
    const gone = createMarker()

    layer.setAll(createGrid([[3, 3, kept], [5, 5, gone]]))
    kept.draw.mockClear()
    layer.context.clearRect.mockClear()

    layer.remove(5, 5)

    expect(gone.erase).toHaveBeenCalledWith(layer.context, 5, 5)
    expect(layer.context.clearRect).toHaveBeenCalledWith(0, 0, 400, 400)
    expect(kept.draw).toHaveBeenCalledWith(layer.context, 3, 3)
    expect(layer.has(5, 5)).toBe(false)
  })
})
