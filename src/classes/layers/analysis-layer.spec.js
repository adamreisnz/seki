import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import AnalysisLayer from './analysis-layer.js'
import Theme from '../theme.js'
import {stoneColors} from '../../constants/stone.js'

//Erasing reads the device pixel ratio off the window, which isn't there
//outside a browser
beforeEach(() => {
  vi.stubGlobal('window', {devicePixelRatio: 1})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

//A small board keeps the ownership maps below readable
const SIZE = 5
const CELL_SIZE = 20

/**
 * A board stand-in that is big enough to draw on
 */
const createBoard = ({swapColors = false, cutOff = 0} = {}) => ({
  theme: new Theme(),
  width: SIZE,
  height: SIZE,
  getCellSize: () => CELL_SIZE,
  getAbsX: x => x * CELL_SIZE,
  getAbsY: y => y * CELL_SIZE,
  getDisplayColor: color => (
    swapColors
      ? (color === stoneColors.BLACK ? stoneColors.WHITE : stoneColors.BLACK)
      : color
  ),
  isOnBoard: (x, y) => (
    x >= cutOff && y >= 0 && x < SIZE && y < SIZE
  ),
  drawWidth: 400,
  drawHeight: 400,
})

/**
 * A context that records the fills it was asked for, along with the style it
 * was carrying at the time
 */
const createContext = () => {
  const context = {
    canvas: {clientWidth: 400, clientHeight: 400},
    clearRect: vi.fn(),
    translate: vi.fn(),
    globalAlpha: 1,
    fillStyle: null,
    fills: [],
  }
  context.fillRect = vi.fn((x, y, width, height) => {
    context.fills.push({
      x, y, width, height,
      color: context.fillStyle,
      alpha: context.globalAlpha,
    })
  })
  return context
}

/**
 * Build an ownership map the way the API stores it: one int8 per point, row
 * major from the top left, from black's perspective
 */
const createOwnership = points => {
  const ownership = new Int8Array(SIZE * SIZE)
  for (const {x, y, value} of points) {
    ownership[(y * SIZE) + x] = Math.round(value * 127)
  }
  return ownership
}

const createLayer = (board = createBoard(), withContext = true) => {
  const layer = new AnalysisLayer(board)
  layer.setGridSize(SIZE, SIZE)
  if (withContext) {
    layer.setContext(createContext())
  }
  return layer
}

describe('AnalysisLayer ownership handling', () => {

  it('holds on to the ownership map it is given', () => {
    const layer = createLayer()
    const ownership = createOwnership([{x: 0, y: 0, value: 1}])

    layer.setAll(ownership)

    expect(layer.ownership).toBe(ownership)
  })

  it('lets go of it again', () => {
    const layer = createLayer()

    layer.setAll(createOwnership([{x: 0, y: 0, value: 1}]))
    layer.removeAll()

    expect(layer.ownership).toBeNull()
    expect(layer.context.clearRect).toHaveBeenCalled()
  })

  it('replaces one map with the next', () => {
    const layer = createLayer()

    layer.setAll(createOwnership([{x: 0, y: 0, value: 1}]))
    layer.context.fills.length = 0
    layer.setAll(createOwnership([{x: 4, y: 4, value: -1}]))

    expect(layer.context.fills).toHaveLength(1)
    expect(layer.context.fills[0].x).toBe(80 - 6)
  })

  it('knows it cannot draw without a map', () => {
    const layer = createLayer()
    expect(layer.canDraw()).toBe(false)
  })

  it('knows it cannot draw without a context', () => {
    const layer = createLayer(createBoard(), false)
    expect(() => layer.setAll(createOwnership([{x: 0, y: 0, value: 1}])))
      .not.toThrow()
  })
})

describe('AnalysisLayer drawing', () => {

  it('reads the map row major from the top left', () => {

    //NOTE: getting this the wrong way round mirrors the whole heat map, which
    //still looks like a plausible one
    const layer = createLayer()
    layer.setAll(createOwnership([{x: 3, y: 1, value: 1}]))

    const [fill] = layer.context.fills
    expect(fill.x).toBe(60 - 6)
    expect(fill.y).toBe(20 - 6)
  })

  it('shades a point black when black holds it', () => {
    const layer = createLayer()
    layer.setAll(createOwnership([{x: 1, y: 1, value: 1}]))

    expect(layer.context.fills[0].color).toBe('#000')
  })

  it('shades a point white when white holds it', () => {
    const layer = createLayer()
    layer.setAll(createOwnership([{x: 1, y: 1, value: -1}]))

    expect(layer.context.fills[0].color).toBe('#fff')
  })

  it('follows swapped colours', () => {
    const layer = createLayer(createBoard({swapColors: true}))
    layer.setAll(createOwnership([{x: 1, y: 1, value: 1}]))

    expect(layer.context.fills[0].color).toBe('#fff')
  })

  it('leaves the contested points alone', () => {
    const layer = createLayer()
    layer.setAll(createOwnership([
      {x: 0, y: 0, value: 0.9},
      {x: 1, y: 1, value: 0.05},
      {x: 2, y: 2, value: -0.02},
      {x: 3, y: 3, value: -0.9},
    ]))

    expect(layer.context.fills).toHaveLength(2)
  })

  it('draws a firmly held point larger and more solidly than a shaky one', () => {
    const layer = createLayer()
    layer.setAll(createOwnership([
      {x: 0, y: 0, value: 1},
      {x: 4, y: 4, value: 0.3},
    ]))

    const [firm, shaky] = layer.context.fills
    expect(firm.width).toBeGreaterThan(shaky.width)
    expect(firm.alpha).toBeGreaterThan(shaky.alpha)
  })

  it('puts the transparency back after each point', () => {
    const layer = createLayer()
    layer.setAll(createOwnership([{x: 1, y: 1, value: 1}]))

    expect(layer.context.globalAlpha).toBe(1)
  })

  it('skips points that are not on the board', () => {

    //A cut off board still gets a full sized ownership map, as the engine
    //analysed the whole board
    const layer = createLayer(createBoard({cutOff: 2}))
    layer.setAll(createOwnership([
      {x: 0, y: 0, value: 1},
      {x: 1, y: 0, value: 1},
      {x: 2, y: 0, value: 1},
    ]))

    expect(layer.context.fills).toHaveLength(1)
  })
})
