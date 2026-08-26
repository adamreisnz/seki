import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import GridLayer from './grid-layer.js'
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
const createBoard = ({showStarPoints = false, cellSize = 20} = {}) => ({
  theme: new Theme(),
  width: 19,
  height: 19,
  xLeft: 0,
  xRight: 18,
  yTop: 0,
  yBottom: 18,
  cutOffLeft: false,
  cutOffRight: false,
  cutOffTop: false,
  cutOffBottom: false,
  gridDrawWidth: 18 * cellSize,
  gridDrawHeight: 18 * cellSize,
  drawMarginHor: cellSize,
  drawMarginVer: cellSize,
  drawWidth: 400,
  drawHeight: 400,
  getCellSize: () => cellSize,
  getAbsX: x => cellSize + (x * cellSize),
  getAbsY: y => cellSize + (y * cellSize),
  isOnBoard: (x, y) => (x >= 0 && y >= 0 && x < 19 && y < 19),
  getConfig: key => (key === 'showStarPoints' ? showStarPoints : undefined),
})

/**
 * A context that records what it was asked to do, in order
 */
const createContext = () => {
  const calls = []
  const record = name => (...args) => calls.push([name, ...args])
  return {
    calls,
    canvas: {clientWidth: 400, clientHeight: 400},
    clearRect: record('clearRect'),
    translate: record('translate'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: record('stroke'),
    arc: record('arc'),
    fill: record('fill'),
  }
}

const createLayer = (config) => {
  const layer = new GridLayer(createBoard(config))
  layer.setContext(createContext())
  return layer
}

//What the layer did, as names alone
const names = layer => layer.context.calls.map(([name]) => name)

//The first clear the layer made
const firstClear = layer => layer.context.calls.find(([name]) => name === 'clearRect')

describe('GridLayer redrawing a cell', () => {

  it('clears the cell before painting the lines back', () => {

    //NOTE: whatever took the grid out from under itself erased its own radius,
    //which is smaller than the cell painted here. Without the clear, the ends
    //of these lines went on top of line that was never erased, and as the line
    //is not fully opaque that showed as a darker stub either side of the point
    const layer = createLayer()

    layer.redrawCell(5, 5)

    expect(names(layer).indexOf('clearRect'))
      .toBeLessThan(names(layer).indexOf('stroke'))
  })

  it('clears everything the lines cover, cap included', () => {

    //The line cap reaches half a line width past the end of the line, so the
    //cleared area has to reach that far as well, or the caps land on line that
    //is still standing
    const layer = createLayer()
    layer.redrawCell(5, 5)

    //A cell of 20 puts the point at 120, with a grid radius of 10 and a line
    //width of 1 around it
    const [, clearX, clearY, clearWidth, clearHeight] = firstClear(layer)
    expect([clearX, clearY, clearWidth, clearHeight]).toEqual([
      109.5, 109.5, 21, 21,
    ])
  })

  it('clears no more than the lines cover', () => {

    //Clearing past the caps takes a piece out of the line either side of the
    //cell, which nothing puts back
    const layer = createLayer()
    layer.redrawCell(5, 5)

    const [, , , clearWidth] = firstClear(layer)
    const painted = layer.context.calls
      .filter(([name]) => name === 'moveTo' || name === 'lineTo')
      .map(([, x]) => x)

    const lineWidth = layer.theme.get('grid.lineWidth', 20)
    const reach = Math.max(...painted.map(x => Math.abs(x - 120))) + (lineWidth / 2)

    expect(reach).toBe(clearWidth / 2)
  })

  it('paints the star point back where there is one', () => {
    const layer = createLayer({showStarPoints: true})
    layer.redrawCell(3, 3)
    expect(names(layer)).toContain('arc')
  })

  it('leaves the star points alone where there is none', () => {
    const layer = createLayer({showStarPoints: true})
    layer.redrawCell(5, 5)
    expect(names(layer)).not.toContain('arc')
  })

  it('does nothing off the board', () => {
    const layer = createLayer()
    layer.redrawCell(25, 25)
    expect(layer.context.calls).toHaveLength(0)
  })
})
