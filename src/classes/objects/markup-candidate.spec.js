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
const createContext = () => {
  const context = {
    translate: vi.fn(),
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fills: [],
    strokes: [],
  }
  context.fill = vi.fn(() => context.fills.push(context.fillStyle))
  context.stroke = vi.fn(() => context.strokes.push(context.strokeStyle))
  return context
}

/**
 * A candidate as it arrives from the API, being one entry of node.analysis
 */
const createCandidate = (board, {
  index = 0,
  winrate = 0,
  score = winrate * 20,
  isBest = index === 0,
  showText = true,
} = {}) => new MarkupCandidate(board, {
  index,
  isBest,
  showText,
  loss: {winrate, score},
})

/**
 * Pull the hue out of an hsla() string
 */
const hueOf = color => Number(color.match(/^hsla\((-?[\d.]+),/)[1])

describe('MarkupCandidate construction', () => {

  it('is a candidate', () => {
    expect(createCandidate(createBoard()).type).toBe(markupTypes.CANDIDATE)
  })

  it('keeps both halves of the loss it was given', () => {
    const markup = createCandidate(createBoard(), {
      index: 2, winrate: 0.031, score: 1.4,
    })
    expect(markup.index).toBe(2)
    expect(markup.winrateLoss).toBe(0.031)
    expect(markup.scoreLoss).toBe(1.4)
    expect(markup.isBest).toBe(false)
  })

  it('survives being handed no loss at all', () => {
    const markup = new MarkupCandidate(createBoard())
    expect(markup.index).toBe(0)
    expect(markup.winrateLoss).toBe(0)
    expect(markup.scoreLoss).toBe(0)
  })
})

describe('MarkupCandidate colour gradient', () => {

  const hueFor = winrate => {
    const markup = createCandidate(createBoard(), {index: 1, winrate})
    markup.loadProperties(3, 3)
    return hueOf(markup.color)
  }

  it('paints the best candidate blue', () => {
    const markup = createCandidate(createBoard(), {index: 0, winrate: 0})
    markup.loadProperties(3, 3)
    expect(hueOf(markup.color)).toBe(205)
  })

  it('runs green through to gold as the loss grows', () => {
    expect(hueFor(0)).toBe(125)
    expect(hueFor(0.1)).toBe(48)
    expect(hueFor(0.02)).toBeLessThan(hueFor(0.005))
    expect(hueFor(0.05)).toBeLessThan(hueFor(0.02))
  })

  it('never reaches orange or red', () => {

    //NOTE: every candidate is a move the engine itself put forward, so none of
    //them should be coloured as a mistake to be warned away from. Orange and
    //red live below a hue of about 45.
    const losses = [0, 0.01, 0.05, 0.1, 0.4, 1]
    for (const loss of losses) {
      expect(hueFor(loss)).toBeGreaterThanOrEqual(48)
    }
  })

  it('holds the gold once the loss is past a blunder', () => {
    expect(hueFor(0.4)).toBe(hueFor(0.1))
  })

  it('fills itself with a lighter version of its ring, in the same hue', () => {
    const markup = createCandidate(createBoard(), {index: 1, winrate: 0.02})
    markup.loadProperties(3, 3)

    expect(hueOf(markup.fillColor)).toBe(hueOf(markup.color))
    expect(markup.fillColor).toContain(',0.75)')
  })

  it('keeps the ring half transparent, so it settles towards the board', () => {
    const markup = createCandidate(createBoard(), {index: 1, winrate: 0.02})
    markup.loadProperties(3, 3)

    expect(markup.color).toContain(',0.5)')
  })

  it('rings every candidate at the same weight', () => {

    //NOTE: the weight used to thin out as the candidate gave up more, which
    //read as the markers being drawn at different sizes rather than as a
    //scale. The colour already carries everything the weight was saying.
    const widths = [0, 0.005, 0.02, 0.05, 0.3].map(winrate => {
      const markup = createCandidate(createBoard(), {index: 1, winrate})
      markup.loadProperties(3, 3)
      return markup.lineWidth
    })

    expect(new Set(widths).size).toBe(1)
  })

  it('rings the best candidate no differently from the rest', () => {
    const best = createCandidate(createBoard(), {index: 0, winrate: 0})
    const other = createCandidate(createBoard(), {index: 4, winrate: 0.3})

    best.loadProperties(3, 3)
    other.loadProperties(3, 3)

    expect(best.lineWidth).toBe(other.lineWidth)
  })
})

describe('MarkupCandidate point loss', () => {

  const textFor = score => {
    const markup = createCandidate(createBoard(), {index: 1, score})
    markup.loadProperties(3, 3)
    return markup.text
  }

  it('says what the move gives up, to a tenth of a point', () => {
    expect(textFor(0.42)).toBe('-0.4')
    expect(textFor(1.84)).toBe('-1.8')
    expect(textFor(12)).toBe('-12.0')
  })

  it('says nothing was given up when nothing was', () => {
    expect(textFor(0)).toBe('0.0')
    expect(textFor(0.02)).toBe('0.0')
  })

  it('marks a candidate that gains as a gain', () => {

    //The contract has candidate losses at zero or above, but a negative one
    //is a move that came out better than the best, not a bigger loss
    expect(textFor(-0.14)).toBe('+0.1')
  })

  it('shrinks the font to fit a longer number', () => {
    const short = createCandidate(createBoard(), {score: 0.4})
    const long = createCandidate(createBoard(), {score: 12.4})

    short.loadProperties(3, 3)
    long.loadProperties(3, 3)

    expect(long.text.length).toBeGreaterThan(short.text.length)
    expect(long.fontSize).toBeLessThan(short.fontSize)
  })
})

describe('MarkupCandidate drawing', () => {

  it('fills, rings and labels itself', () => {
    const context = createContext()
    const markup = createCandidate(createBoard(), {index: 2, winrate: 0.03, score: 1.4})

    markup.draw(context, 3, 3)

    expect(context.fills).toEqual([markup.fillColor])
    expect(context.strokes).toEqual([markup.color])
    expect(context.fillText)
      .toHaveBeenCalledWith('-1.4', 120, expect.any(Number), expect.any(Number))
  })

  it('lays the fill down before the ring, so the ring stays crisp', () => {
    const context = createContext()
    const markup = createCandidate(createBoard(), {index: 1, winrate: 0.02})

    markup.draw(context, 3, 3)

    expect(context.fill.mock.invocationCallOrder[0])
      .toBeLessThan(context.stroke.mock.invocationCallOrder[0])
  })

  it('draws the marker alone when there is no text to show', () => {
    const context = createContext()
    const markup = createCandidate(createBoard(), {showText: false})

    markup.draw(context, 3, 3)

    expect(context.fills).toHaveLength(1)
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
