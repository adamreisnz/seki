import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import GridLayer from './grid-layer.js'
import Theme from '../theme.js'
import {boardLayerTypes} from '../../constants/board.js'

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
const createBoard = ({
  showStarPoints = false,
  cellSize = 20,
  cutOffLeft = false,
  cutOffRight = false,
  cutOffTop = false,
  cutOffBottom = false,
  theme = new Theme(),
} = {}) => ({
  theme,
  width: 19,
  height: 19,
  xLeft: 0,
  xRight: 18,
  yTop: 0,
  yBottom: 18,
  cutOffLeft,
  cutOffRight,
  cutOffTop,
  cutOffBottom,
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

describe('GridLayer drawing the grid', () => {

  it('is the grid layer, and holds nothing of its own', () => {

    //It draws from the board dimensions rather than from a grid of objects,
    //so the grid methods it inherits are deliberately inert
    const layer = createLayer()

    expect(layer.type).toBe(boardLayerTypes.GRID)
    expect(layer.getAll()).toBeUndefined()
    expect(layer.setAll()).toBeUndefined()
    expect(layer.removeAll()).toBeUndefined()
  })

  it('draws nothing without a context', () => {
    const layer = new GridLayer(createBoard())
    expect(() => layer.draw()).not.toThrow()
  })

  it('draws a line for every row and every column', () => {

    //Nineteen each way, and every line is one moveTo and one lineTo
    const layer = createLayer()
    layer.draw()

    expect(names(layer).filter(name => name === 'moveTo')).toHaveLength(38)
    expect(names(layer).filter(name => name === 'lineTo')).toHaveLength(38)
  })

  it('strokes the whole grid in one path', () => {

    //One path for the lot keeps a nineteen by nineteen board to a single
    //stroke rather than thirty eight of them
    const layer = createLayer()
    layer.draw()

    expect(names(layer).filter(name => name === 'stroke')).toHaveLength(1)
  })

  it('runs the lines corner to corner on a full board', () => {
    const layer = createLayer({cellSize: 20})
    layer.draw()

    const first = layer.context.calls.find(([name]) => name === 'moveTo')
    expect(first.slice(1)).toEqual([20, 20])
  })

  it('draws the star points when they are turned on', () => {
    const layer = createLayer({showStarPoints: true})
    layer.draw()

    //Nine on a nineteen by nineteen board
    expect(names(layer).filter(name => name === 'arc')).toHaveLength(9)
  })

  it('draws none when they are turned off', () => {
    const layer = createLayer({showStarPoints: false})
    layer.draw()

    expect(names(layer)).not.toContain('arc')
  })

  it('skips a star point that falls outside the board', () => {
    const theme = new Theme()
    theme.set('grid.star.points', () => [{x: 3, y: 3}, {x: 25, y: 25}])
    const layer = createLayer({showStarPoints: true, theme})

    layer.draw()

    expect(names(layer).filter(name => name === 'arc')).toHaveLength(1)
  })

  it('runs the lines past the edge where the board is cut off', () => {

    //A board showing a corner of a game has its lines run off the edge, so
    //that it reads as a section of a larger board rather than a small one
    const full = createLayer()
    const cut = createLayer({cutOffTop: true, cutOffLeft: true})

    full.draw()
    cut.draw()

    const firstOf = layer => layer.context.calls
      .find(([name]) => name === 'moveTo')
      .slice(1)

    expect(firstOf(cut)[1]).toBeLessThan(firstOf(full)[1])
  })

  it('puts the canvas back where it found it', () => {

    //The half pixel translation that keeps the lines crisp is context state,
    //so leaving it on would shift every layer drawn after this one
    const layer = createLayer()
    layer.draw()

    const translates = layer.context.calls
      .filter(([name]) => name === 'translate')
      .map(call => call.slice(1))

    expect(translates).toHaveLength(2)
    expect(translates[0]).toEqual(translates[1].map(v => -v))
  })
})

describe('GridLayer erasing a cell', () => {

  it('erases nothing without a context', () => {
    const layer = new GridLayer(createBoard())
    expect(() => layer.eraseCell(5, 5)).not.toThrow()
  })

  it('erases nothing off the board', () => {
    const layer = createLayer()
    layer.eraseCell(25, 25)

    expect(layer.context.calls).toHaveLength(0)
  })

  it('erases the radius it is given', () => {
    const layer = createLayer({cellSize: 20})
    layer.eraseCell(5, 5, 7)

    expect(firstClear(layer).slice(1)).toEqual([113, 113, 14, 14])
  })

  it('falls back to the theme radius when it is given none', () => {

    //Which is the grid radius, being half a cell either way
    const layer = createLayer({cellSize: 20})
    layer.eraseCell(5, 5)

    const radius = layer.theme.get('grid.radius', 20)
    expect(firstClear(layer).slice(1))
      .toEqual([120 - radius, 120 - radius, 2 * radius, 2 * radius])
  })

  it('puts the canvas back where it found it', () => {
    const layer = createLayer()
    layer.eraseCell(5, 5, 7)

    const translates = layer.context.calls
      .filter(([name]) => name === 'translate')
      .map(call => call.slice(1))

    expect(translates).toHaveLength(2)
    expect(translates[0]).toEqual(translates[1].map(v => -v))
  })
})

describe('GridLayer cut off edges', () => {

  //A board showing part of a game runs its lines off whichever edges were
  //cut, so that it reads as a section of a larger board
  const reachOf = layer => {
    layer.draw()
    const painted = layer.context.calls
      .filter(([name]) => name === 'moveTo' || name === 'lineTo')
    return {
      minX: Math.min(...painted.map(([, x]) => x)),
      maxX: Math.max(...painted.map(([, x]) => x)),
      minY: Math.min(...painted.map(([, , y]) => y)),
      maxY: Math.max(...painted.map(([, , y]) => y)),
    }
  }

  it('runs past the right edge when that side is cut off', () => {
    const full = reachOf(createLayer())
    const cut = reachOf(createLayer({cutOffRight: true}))

    expect(cut.maxX).toBeGreaterThan(full.maxX)
  })

  it('runs past the bottom edge when that side is cut off', () => {
    const full = reachOf(createLayer())
    const cut = reachOf(createLayer({cutOffBottom: true}))

    expect(cut.maxY).toBeGreaterThan(full.maxY)
  })

  it('patches a cell on a cut off edge out to that edge', () => {

    //The point sits on the board edge, so the piece of line put back has to
    //run off it rather than stopping at the usual cell radius
    const full = createLayer()
    const cut = createLayer({cutOffLeft: true, cutOffTop: true})

    full.redrawCell(0, 0)
    cut.redrawCell(0, 0)

    const firstMove = layer => layer.context.calls
      .find(([name]) => name === 'moveTo')
      .slice(1)

    expect(firstMove(cut)[0]).toBeLessThan(firstMove(full)[0])
  })

  it('patches a cell on the far edges out to those as well', () => {
    const full = createLayer()
    const cut = createLayer({cutOffRight: true, cutOffBottom: true})

    full.redrawCell(18, 18)
    cut.redrawCell(18, 18)

    const firstLine = layer => layer.context.calls
      .find(([name]) => name === 'lineTo')
      .slice(1)

    expect(firstLine(cut)[0]).toBeGreaterThan(firstLine(full)[0])
  })
})
