import {describe, it, expect, vi} from 'vitest'
import MarkupCandidate from './markup-candidate.js'
import Theme from '../theme.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * A board stand-in with a grid layer that records what it was asked to erase,
 * the same one the markup spec uses
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

/**
 * A context that records what it was told to draw with
 */
const createContext = () => ({
  translate: vi.fn(),
  setLineDash: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
})

/**
 * A candidate as it arrives from the API, being one entry of node.analysis
 */
const createCandidate = (board, {
  index = 0,
  winrate = 0,
  isBest = index === 0,
  showText = true,
} = {}) => new MarkupCandidate(board, {
  index,
  isBest,
  showText,
  loss: {winrate, score: winrate * 20},
})

describe('MarkupCandidate construction', () => {

  it('is a candidate', () => {
    expect(createCandidate(createBoard()).type).toBe(markupTypes.CANDIDATE)
  })

  it('keeps the loss it was given, so it can colour itself', () => {
    const markup = createCandidate(createBoard(), {index: 2, winrate: 0.031})
    expect(markup.index).toBe(2)
    expect(markup.winrateLoss).toBe(0.031)
    expect(markup.isBest).toBe(false)
  })

  it('survives being handed no loss at all', () => {
    const markup = new MarkupCandidate(createBoard())
    expect(markup.index).toBe(0)
    expect(markup.winrateLoss).toBe(0)
  })
})

describe('MarkupCandidate colour gradient', () => {

  const colorFor = winrate => {
    const markup = createCandidate(createBoard(), {index: 1, winrate})
    markup.loadProperties(3, 3)
    return markup.color
  }

  it('paints the best candidate blue', () => {
    const markup = createCandidate(createBoard(), {index: 0, winrate: 0})
    markup.loadProperties(3, 3)
    expect(markup.color).toBe('rgba(38,136,228,1)')
  })

  it('runs from blue through to red as the loss grows', () => {
    expect(colorFor(0)).toContain('38,136,228') //excellent
    expect(colorFor(0.007)).toContain('15,137,74') //great
    expect(colorFor(0.015)).toContain('106,168,79') //good
    expect(colorFor(0.03)).toContain('214,158,25') //inaccuracy
    expect(colorFor(0.07)).toContain('226,113,29') //mistake
    expect(colorFor(0.4)).toContain('237,9,15') //blunder
  })

  it('treats a candidate that gives up nothing as the blue spot, wherever it sits', () => {

    //NOTE: the gradient is a function of the loss alone, so a candidate the
    //engine rates as good as its own first choice reads the same as that
    //choice does, rather than being coloured by its place in the list
    expect(colorFor(0)).toContain('38,136,228')
  })

  it('holds back the ones that are not the best', () => {
    const best = createCandidate(createBoard(), {index: 0, winrate: 0})
    const other = createCandidate(createBoard(), {index: 1, winrate: 0})

    best.loadProperties(3, 3)
    other.loadProperties(3, 3)

    expect(best.color).toContain(',1)')
    expect(other.color).toContain(',0.8)')
  })

  it('draws a heavier ring the closer to best a candidate is', () => {
    const best = createCandidate(createBoard(), {index: 0, winrate: 0})
    const blunder = createCandidate(createBoard(), {index: 4, winrate: 0.3})

    best.loadProperties(3, 3)
    blunder.loadProperties(3, 3)

    expect(best.lineWidth).toBeGreaterThan(blunder.lineWidth)
  })
})

describe('MarkupCandidate drawing', () => {

  it('writes the engine ranking in the circle', () => {
    const context = createContext()
    const markup = createCandidate(createBoard(), {index: 2, winrate: 0.03})

    markup.draw(context, 3, 3)

    expect(context.arc).toHaveBeenCalled()
    expect(context.fillText).toHaveBeenCalledWith('3', 120, expect.any(Number), expect.any(Number))
  })

  it('draws the circle alone when there is no text to show', () => {
    const context = createContext()
    const markup = createCandidate(createBoard(), {showText: false})

    markup.draw(context, 3, 3)

    expect(context.arc).toHaveBeenCalled()
    expect(context.fillText).not.toHaveBeenCalled()
  })

  it('clears the grid underneath itself', () => {
    const board = createBoard()
    const markup = createCandidate(board)

    markup.draw(createContext(), 3, 3)

    expect(board.gridLayer.eraseCell)
      .toHaveBeenCalledWith(3, 3, markup.radius * 1.1)
  })
})
