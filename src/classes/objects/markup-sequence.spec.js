import {describe, it, expect, vi} from 'vitest'
import MarkupSequence from './markup-sequence.js'
import MarkupMoveNumber from './markup-move-number.js'
import StoneSlateShell from './stone-slate-shell.js'
import StoneMono from './stone-mono.js'
import Theme from '../theme.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {
  stoneColors, stoneStyles, stoneModifierStyles
} from '../../constants/stone.js'

const {BLACK, WHITE} = stoneColors

/**
 * A board stand-in with a grid layer that records what it was asked to erase,
 * the same one the markup spec uses
 */
const createBoard = ({stones = {}, cellSize = 44, theme = new Theme()} = {}) => {

  const gridLayer = {
    eraseCell: vi.fn(),
    redrawCell: vi.fn(),
  }

  return {
    gridLayer,
    theme,
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
 * A context that records what it was told to draw with, in order
 */
const createContext = () => {
  const context = {
    globalAlpha: 1,
    calls: [],
    translate: vi.fn(),
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({addColorStop: vi.fn()})),
    createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  }
  context.fillText = vi.fn(text => context.calls.push({
    type: 'text',
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
  color: BLACK,
  number: 2,
  ...data,
})

describe('MarkupSequence construction', () => {

  it('is a sequence mark', () => {
    expect(createSequence(createBoard()).type).toBe(markupTypes.SEQUENCE)
  })

  it('is a move number at heart', () => {

    //The number on a ghost stone is a move number and is drawn as one, so it
    //is one rather than a second implementation that looks like one
    expect(createSequence(createBoard())).toBeInstanceOf(MarkupMoveNumber)
  })

  it('keeps the number and colour it was given', () => {
    const markup = createSequence(createBoard(), {color: WHITE, number: 7})
    expect(markup.number).toBe(7)
    expect(markup.displayColor).toBe(WHITE)
  })

  it('survives being handed nothing', () => {
    const markup = new MarkupSequence(createBoard())
    expect(markup.number).toBe(0)
    expect(markup.displayColor).toBeUndefined()
  })
})

describe('MarkupSequence theme paths', () => {

  it('reads a move number\'s theme where it has none of its own', () => {

    //NOTE: this is what makes the number identical to the one drawn on a
    //stone that was really played, without restating its theme here
    expect(createSequence(createBoard()).getThemePaths('fontSize')).toEqual([
      'markup.sequence.fontSize',
      'markup.moveNumber.fontSize',
      'markup.base.fontSize',
    ])
  })

  it('draws the number exactly as a move number does', () => {
    const board = createBoard()

    const sequence = createSequence(board, {number: 12})
    const moveNumber = new MarkupMoveNumber(board, {number: 12})
    sequence.loadProperties(3, 3)
    moveNumber.loadProperties(3, 3)

    expect(String(sequence.text)).toBe('12')
    expect(sequence.fontSize).toBe(moveNumber.fontSize)
    expect(sequence.font).toBe(moveNumber.font)
  })

  it('flips the number against the colour of the stone under it', () => {
    const onBlack = createSequence(createBoard(), {color: BLACK})
    const onWhite = createSequence(createBoard(), {color: WHITE})

    onBlack.loadProperties(3, 3)
    onWhite.loadProperties(3, 3)

    expect(onBlack.color).toBe('rgba(255,255,255,0.95)')
    expect(onWhite.color).toBe('rgba(0,0,0,0.95)')
  })

  it('leaves the number at full strength', () => {

    //The stone under it is faded; the number is what has to stay readable, so
    //it is not faded with it
    const markup = createSequence(createBoard())
    markup.loadProperties(3, 3)

    expect(markup.alpha).toBe(1)
  })
})

describe('MarkupSequence ghost stone', () => {

  it('is a real stone of the board\'s own style', () => {
    const stone = createSequence(createBoard()).createGhostStone()
    expect(stone).toBeInstanceOf(StoneSlateShell)
  })

  it('follows the board to another stone style', () => {
    const theme = new Theme({board: {stoneStyle: stoneStyles.MONO}})
    const stone = createSequence(createBoard({theme})).createGhostStone()

    expect(stone).toBeInstanceOf(StoneMono)
  })

  it('is the colour of the move that is expected', () => {
    const black = createSequence(createBoard(), {color: BLACK})
    const white = createSequence(createBoard(), {color: WHITE})

    expect(black.createGhostStone().stoneColor).toBe(BLACK)
    expect(white.createGhostStone().stoneColor).toBe(WHITE)
  })

  it('is ghosted through the modifier style, not by hand', () => {
    const stone = createSequence(createBoard()).createGhostStone()
    expect(stone.modifierStyle).toBe(stoneModifierStyles.SEQUENCE)
  })

  it('is see-through, and casts no shadow', () => {
    const stone = createSequence(createBoard()).createGhostStone()
    stone.loadProperties()

    expect(stone.alpha).toBeGreaterThan(0)
    expect(stone.alpha).toBeLessThan(1)
    expect(stone.shadow).toBe(false)
  })

  it('fades black further than white', () => {

    //A dark stone stays dark against the wood long after a pale one has gone
    //to nothing, so the two need different alphas to read as equally absent
    const black = createSequence(createBoard(), {color: BLACK}).createGhostStone()
    const white = createSequence(createBoard(), {color: WHITE}).createGhostStone()

    black.loadProperties()
    white.loadProperties()

    expect(black.alpha).toBeLessThan(white.alpha)
  })

  it('is the size of a stone, not of a marker', () => {
    const markup = createSequence(createBoard())
    const stone = markup.createGhostStone()
    const played = new StoneSlateShell(createBoard(), BLACK)

    stone.loadProperties()
    played.loadProperties()

    expect(stone.radius).toBe(played.radius)
  })
})

describe('MarkupSequence drawing', () => {

  it('lays the ghost stone down before the number', () => {
    const markup = createSequence(createBoard(), {number: 4})
    const context = createContext()

    const drawn = []
    const stone = {draw: vi.fn(() => drawn.push('stone'))}
    vi.spyOn(markup, 'createGhostStone').mockReturnValue(stone)

    markup.draw(context, 3, 3)
    drawn.push(...context.calls.map(() => 'number'))

    expect(drawn).toEqual(['stone', 'number'])
    expect(stone.draw).toHaveBeenCalledWith(context, 3, 3)
  })

  it('says the move\'s number, in full', () => {
    const markup = createSequence(createBoard(), {number: 11})
    const context = createContext()
    vi.spyOn(markup, 'createGhostStone').mockReturnValue({draw: vi.fn()})

    markup.draw(context, 3, 3)

    expect(context.calls).toEqual([expect.objectContaining({
      text: '11',
      globalAlpha: 1,
    })])
  })

  it('clears the grid underneath itself', () => {
    const board = createBoard()
    const markup = createSequence(board)
    vi.spyOn(markup, 'createGhostStone').mockReturnValue({draw: vi.fn()})

    markup.draw(createContext(), 3, 3)

    expect(board.gridLayer.eraseCell).toHaveBeenCalled()
  })
})
