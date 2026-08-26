import {vi} from 'vitest'
import Theme from '../src/classes/theme.js'
import {boardLayerTypes} from '../src/constants/board.js'

/**
 * Shared stand-ins for the specs
 *
 * The library core is DOM free, but everything that draws needs a canvas
 * context and a board to ask for coordinates, neither of which exists under
 * plain node. These build the smallest stand-ins that let the drawing code
 * run for real and be asserted on, rather than being skipped.
 *
 * This file lives outside src/ on purpose: the published package is src minus
 * the specs, so a helper in there would ship to consumers.
 */

/**
 * A canvas context stand-in that records every call made on it
 *
 * Every method is a spy, so a spec can assert on the shape that was drawn.
 * The style properties are plain values, so the last one assigned is what the
 * spec reads back. Gradients come back as recorders of their own.
 */
export const createStubContext = () => {

  //The gradients handed out, in the order they were asked for
  const gradients = []

  //Create a gradient recorder
  const createGradient = (...args) => {
    const gradient = {args, stops: [], addColorStop: vi.fn()}
    gradient.addColorStop.mockImplementation((offset, color) => {
      gradient.stops.push([offset, color])
    })
    gradients.push(gradient)
    return gradient
  }

  //Build the context
  return {
    gradients,
    canvas: {clientWidth: 400, clientHeight: 400},

    //Path building
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),

    //Painting
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),

    //State
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({width: 10})),

    //Gradients and patterns
    createRadialGradient: vi.fn(createGradient),
    createLinearGradient: vi.fn(createGradient),
    createPattern: vi.fn(() => ({})),
  }
}

/**
 * A board stand-in for the objects that draw on it
 *
 * Coordinates map onto whole cells so that an expectation can be written as a
 * multiple of the cell size. The stones map is keyed as 'x,y' and holds
 * whatever the spec wants the stones layer to report.
 */
export const createStubBoard = ({
  cellSize = 40,
  width = 19,
  height = 19,
  stones = {},
  markup = {},
  theme = new Theme(),
  swapColors = false,
} = {}) => {

  //The grid layer records what it was asked to take out and put back
  const gridLayer = {
    eraseCell: vi.fn(),
    redrawCell: vi.fn(),
  }

  //Build the board
  return {
    gridLayer,
    stones,
    markup,
    theme,
    width,
    height,
    drawWidth: cellSize * width,
    drawHeight: cellSize * height,
    getCellSize: () => cellSize,
    getDisplayColor: color => (
      swapColors ? (color === 'black' ? 'white' : 'black') : color
    ),
    getAbsX: x => x * cellSize,
    getAbsY: y => y * cellSize,
    isOnBoard: (x, y) => (x >= 0 && y >= 0 && x < width && y < height),
    get: (layer, x, y) => {
      if (layer === boardLayerTypes.STONES) {
        return stones[`${x},${y}`]
      }
      if (layer === boardLayerTypes.MARKUP) {
        return markup[`${x},${y}`]
      }
      return undefined
    },
    has: (layer, x, y) => Boolean(
      layer === boardLayerTypes.STONES
        ? stones[`${x},${y}`]
        : layer === boardLayerTypes.MARKUP ? markup[`${x},${y}`] : undefined
    ),
    getLayer: type => (type === boardLayerTypes.GRID ? gridLayer : undefined),
  }
}

/**
 * Stub the window object the drawing helpers read the pixel ratio off
 */
export const stubWindow = (devicePixelRatio = 1) => {
  vi.stubGlobal('window', {devicePixelRatio})
}
