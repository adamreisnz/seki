import {describe, it, expect, vi} from 'vitest'
import MarkupSequence from './markup-sequence.js'
import Theme from '../theme.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'

/**
 * A board stand-in with a grid layer that records what it was asked to erase,
 * the same one the markup spec uses
 */
const createBoard = ({stones = {}, cellSize = 44} = {}) => {

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
 * A context that records what it was told to draw with. Fills and strokes
 * note the alpha they were drawn under, as the ghosting is the whole point.
 */
const createContext = () => {
  const context = {
    globalAlpha: 1,
    translate: vi.fn(),
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fills: [],
    texts: [],
  }
  context.fill = vi.fn(() => context.fills.push({
    fillStyle: context.fillStyle,
    globalAlpha: context.globalAlpha,
  }))
  context.stroke = vi.fn(() => context.strokeState = {
    strokeStyle: context.strokeStyle,
    globalAlpha: context.globalAlpha,
  })
  context.fillText = vi.fn(text => context.texts.push({
    text,
    fillStyle: context.fillStyle,
    globalAlpha: context.globalAlpha,
  }))
  return context
}

/**
 * A sequence mark as the replay mode creates it from one entry of a derived
 * analysis' sequence
 */
const createSequence = (board, data = {}) => new MarkupSequence(board, {
  color: stoneColors.BLACK,
  number: 2,
  ...data,
})

describe('MarkupSequence construction', () => {

  it('is a sequence mark', () => {
    expect(createSequence(createBoard()).type).toBe(markupTypes.SEQUENCE)
  })

  it('keeps the number and colour it was given', () => {
    const markup = createSequence(createBoard(), {
      color: stoneColors.WHITE, number: 7,
    })
    expect(markup.number).toBe(7)
    expect(markup.displayColor).toBe(stoneColors.WHITE)
  })

  it('survives being handed nothing', () => {
    const markup = new MarkupSequence(createBoard())
    expect(markup.number).toBe(0)
    expect(markup.displayColor).toBeUndefined()
  })
})

describe('MarkupSequence theming', () => {

  const loaded = data => {
    const markup = createSequence(createBoard(), data)
    markup.loadProperties(3, 3)
    return markup
  }

  it('fills with the colour of the move it stands for', () => {
    const black = loaded({color: stoneColors.BLACK})
    const white = loaded({color: stoneColors.WHITE})

    expect(black.fillColor).not.toBe(white.fillColor)
    expect(black.fillColor).toBe('#181818')
    expect(white.fillColor).toBe('#f4efe4')
  })

  it('flips its number against the disc it sits on', () => {
    const black = loaded({color: stoneColors.BLACK})
    const white = loaded({color: stoneColors.WHITE})

    expect(black.textColor).toBe(white.fillColor)
    expect(white.textColor).toBe(black.fillColor)
  })

  it('says its number in the line', () => {
    expect(String(loaded({number: 12}).text)).toBe('12')
  })

  it('is a ghost rather than a stone', () => {

    //Smaller than a stone and see-through, so an expectation never reads as
    //a position on the board
    const markup = loaded()
    expect(markup.alpha).toBeLessThan(1)
    expect(markup.scale).toBeLessThan(1)
  })

  it('carries an outline to stay visible on the board', () => {
    const markup = loaded({color: stoneColors.WHITE})
    expect(markup.color).toBeTruthy()
    expect(markup.lineWidth).toBeGreaterThanOrEqual(1)
  })
})

describe('MarkupSequence drawing', () => {

  it('draws a disc with an outline and its number on top', () => {
    const context = createContext()
    const markup = createSequence(createBoard(), {number: 3})

    markup.draw(context, 3, 3)

    expect(context.arc).toHaveBeenCalled()
    expect(context.fills.map(f => f.fillStyle)).toContain(markup.fillColor)
    expect(context.strokeState.strokeStyle).toBe(markup.color)
    expect(context.texts).toEqual([expect.objectContaining({
      text: '3',
      fillStyle: markup.textColor,
    })])
  })

  it('ghosts the whole drawing, number included', () => {
    const context = createContext()
    const markup = createSequence(createBoard())

    markup.draw(context, 3, 3)

    expect(context.fills[0].globalAlpha).toBe(markup.alpha)
    expect(context.strokeState.globalAlpha).toBe(markup.alpha)
    expect(context.texts[0].globalAlpha).toBe(markup.alpha)

    //And the ghosting comes off the context again afterwards
    expect(context.globalAlpha).toBe(1)
  })

  it('clears the grid underneath itself', () => {
    const board = createBoard()
    const markup = createSequence(board)

    markup.draw(createContext(), 3, 3)

    expect(board.gridLayer.eraseCell)
      .toHaveBeenCalledWith(3, 3, markup.radius * 1.1)
  })
})
