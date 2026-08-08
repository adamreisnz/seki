import {describe, it, expect, vi} from 'vitest'
import Markup from './markup.js'
import Theme from '../theme.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'

const {BLACK, WHITE} = stoneColors

/**
 * A board stand-in with a stones layer that can be told what is on it, and a
 * grid layer that records what it was asked to erase and redraw
 */
const createBoard = ({stones = {}, cellSize = 40} = {}) => {

  const gridLayer = {
    eraseCell: vi.fn(),
    redrawCell: vi.fn(),
  }

  return {
    gridLayer,
    theme: new Theme(),
    getCellSize: () => cellSize,
    getDisplayColor: color => color,
    getAbsX: x => x * cellSize,
    getAbsY: y => y * cellSize,
    isOnBoard: () => true,
    drawWidth: 400,
    drawHeight: 400,
    get: (layer, x, y) => (
      layer === boardLayerTypes.STONES ? stones[`${x},${y}`] : undefined
    ),
    has: (layer, x, y) => (
      layer === boardLayerTypes.STONES && Boolean(stones[`${x},${y}`])
    ),
    getLayer: () => gridLayer,
  }
}

const createMarkup = (type, board = createBoard()) => {
  const markup = new Markup(board)
  markup.type = type
  return markup
}

describe('Markup theme paths', () => {

  it('looks at its own type before the base', () => {
    const markup = createMarkup(markupTypes.TRIANGLE)
    expect(markup.getThemePaths('scale')).toEqual([
      'markup.triangle.scale',
      'markup.base.scale',
    ])
  })

  it('takes the scale its type defines', () => {
    const markup = createMarkup(markupTypes.CIRCLE)
    expect(markup.getThemeProp('scale')).toBe(0.55)
  })

  it('falls back to the base for anything its type does not define', () => {
    const markup = createMarkup(markupTypes.CIRCLE)
    expect(markup.getThemeProp('font')).toBe('Arial')
  })
})

describe('Markup properties', () => {

  it('loads colour, scale and radius off the theme', () => {
    const markup = createMarkup(markupTypes.CIRCLE)
    const [cellSize, stoneColor] = markup.loadProperties(3, 3)

    expect(cellSize).toBe(40)
    expect(stoneColor).toBeNull()
    expect(markup.scale).toBe(0.55)
    expect(markup.radius).toBe(Math.round(20 * 0.55))
  })

  it('reads the colour off the stone underneath it', () => {
    const board = createBoard({stones: {'3,3': {stoneColor: BLACK}}})
    const markup = createMarkup(markupTypes.CIRCLE, board)

    markup.loadProperties(3, 3)

    expect(markup.stoneColor).toBe(BLACK)
    expect(markup.color).toBe('rgba(255,255,255,0.95)')
  })

  it('uses a colour of its own over the stone underneath', () => {
    const board = createBoard({stones: {'3,3': {stoneColor: BLACK}}})
    const markup = createMarkup(markupTypes.CIRCLE, board)
    markup.displayColor = WHITE

    markup.loadProperties(3, 3)

    expect(markup.stoneColor).toBe(WHITE)
    expect(markup.color).toBe('rgba(0,0,0,0.95)')
  })

  it('has no stone colour on an empty point', () => {
    const markup = createMarkup(markupTypes.CIRCLE)
    expect(markup.getStoneColor(3, 3)).toBeNull()
  })
})

describe('Markup and the grid underneath it', () => {

  it('clears the grid where there is no stone', () => {
    const board = createBoard()
    const markup = createMarkup(markupTypes.CIRCLE, board)

    markup.draw({}, 3, 3)

    expect(board.gridLayer.eraseCell).toHaveBeenCalledWith(3, 3, markup.radius)
  })

  it('leaves the grid alone where a stone already covers it', () => {
    const board = createBoard({stones: {'3,3': {stoneColor: BLACK}}})
    const markup = createMarkup(markupTypes.CIRCLE, board)

    markup.draw({}, 3, 3)

    expect(board.gridLayer.eraseCell).not.toHaveBeenCalled()
  })

  it('puts the grid back when it is erased', () => {
    const board = createBoard()
    const markup = createMarkup(markupTypes.CIRCLE, board)

    markup.erase({clearRect: vi.fn(), translate: vi.fn()}, 3, 3)

    expect(board.gridLayer.redrawCell).toHaveBeenCalledWith(3, 3)
  })

  it('leaves the grid alone when a stone covers it', () => {
    const board = createBoard({stones: {'3,3': {stoneColor: BLACK}}})
    const markup = createMarkup(markupTypes.CIRCLE, board)

    markup.erase({clearRect: vi.fn(), translate: vi.fn()}, 3, 3)

    expect(board.gridLayer.redrawCell).not.toHaveBeenCalled()
  })
})
