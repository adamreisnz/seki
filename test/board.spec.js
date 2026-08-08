import {describe, it, expect, vi} from 'vitest'
import Board from '../src/classes/board.js'
import Game from '../src/classes/game.js'
import {boardLayerTypes} from '../src/constants/board.js'
import {stoneColors} from '../src/constants/stone.js'

/**
 * A board with a known draw size, so the geometry is deterministic. Nothing
 * here needs a DOM, since only bootstrapping does.
 */
const createBoard = (config = {}, drawSize = 600) => {
  const board = new Board({size: 19, showCoordinates: false, ...config})
  board.setDrawSize(drawSize, drawSize)
  return board
}

describe('Board sizing', () => {

  it('defaults to 19x19', () => {
    const board = new Board()
    expect(board.width).toBe(19)
    expect(board.height).toBe(19)
  })

  it('takes a square size from config', () => {
    const board = new Board({size: 9})
    expect(board.width).toBe(9)
    expect(board.height).toBe(9)
  })

  it('takes separate width and height', () => {
    const board = new Board({width: 19, height: 13})
    expect(board.width).toBe(19)
    expect(board.height).toBe(13)
  })

  it('squares off when given only a width', () => {
    const board = new Board()
    board.setSize(13)
    expect(board.height).toBe(13)
  })

  it('ignores a size it cannot parse', () => {
    const board = new Board({size: 9})
    board.setSize('nonsense')
    expect(board.width).toBe(9)
  })

  it('takes its size from a game', () => {
    const board = new Board()
    board.loadConfigFromGame(new Game({board: {width: 19, height: 13}}))
    expect(board.width).toBe(19)
    expect(board.height).toBe(13)
  })
})

describe('Board geometry', () => {

  it('cannot draw without a draw size', () => {
    expect(new Board({size: 19}).canDraw()).toBe(false)
  })

  it('can draw once it has one', () => {
    expect(createBoard().canDraw()).toBe(true)
  })

  it('works out a cell size that fits the board', () => {
    const board = createBoard({}, 600)
    const cellSize = board.getCellSize()

    expect(cellSize).toBeGreaterThan(0)
    expect(cellSize * 18).toBeLessThanOrEqual(600)
  })

  it('maps grid coordinates to pixels and back', () => {
    const board = createBoard()

    for (const i of [0, 1, 9, 18]) {
      expect(board.getGridX(board.getAbsX(i))).toBe(i)
      expect(board.getGridY(board.getAbsY(i))).toBe(i)
    }
  })

  it('spaces the lines evenly', () => {
    const board = createBoard()
    const step = board.getAbsX(1) - board.getAbsX(0)

    for (let i = 1; i < 19; i++) {
      expect(board.getAbsX(i) - board.getAbsX(i - 1)).toBe(step)
    }
  })

  it('rounds a pixel between two lines to the nearest', () => {
    const board = createBoard()
    const justPast = board.getAbsX(5) + 2
    expect(board.getGridX(justPast)).toBe(5)
  })

  it('gives an unrounded coordinate when asked', () => {
    const board = createBoard()
    const between = (board.getAbsX(5) + board.getAbsX(6)) / 2
    expect(board.getGridX(between, false)).toBeCloseTo(5.5, 1)
  })

  it('never reports negative zero', () => {
    const board = createBoard()
    expect(Object.is(board.getGridX(board.getAbsX(0) - 1), -0)).toBe(false)
    expect(Object.is(board.getGridY(board.getAbsY(0) - 1), -0)).toBe(false)
  })

  it('leaves a bigger margin when showing coordinates', () => {
    const without = createBoard({showCoordinates: false})
    const with_ = createBoard({showCoordinates: true})
    expect(with_.getCellSize()).toBeLessThan(without.getCellSize())
  })
})

describe('Board bounds', () => {

  it('knows what is on the board', () => {
    const board = createBoard()
    expect(board.isOnBoard(0, 0)).toBe(true)
    expect(board.isOnBoard(18, 18)).toBe(true)
    expect(board.isOnBoard(-1, 0)).toBe(false)
    expect(board.isOnBoard(19, 0)).toBe(false)
  })

  it('narrows the playable area when edges are cut off', () => {
    const board = createBoard({cutOffLeft: 2, cutOffTop: 3})

    expect(board.xLeft).toBe(2)
    expect(board.yTop).toBe(3)
    expect(board.gridWidth).toBe(17)
    expect(board.gridHeight).toBe(16)
    expect(board.isOnBoard(1, 5)).toBe(false)
    expect(board.isOnBoard(2, 3)).toBe(true)
  })

  it('shifts the coordinate mapping by the cut off', () => {
    const plain = createBoard()
    const cut = createBoard({cutOffLeft: 2})

    //The first visible line sits at the left margin in both cases
    expect(cut.getAbsX(2) - cut.drawMarginHor)
      .toBe(plain.getAbsX(0) - plain.drawMarginHor)
  })
})

describe('Board layers', () => {

  it('has no layers before they are created', () => {
    expect(new Board().hasLayer(boardLayerTypes.STONES)).toBe(false)
  })

  it('creates the full set of layers', () => {
    const board = createBoard()
    board.createLayers()

    for (const type of board.layerOrder) {
      expect(board.hasLayer(type)).toBe(true)
    }
  })

  it('adds, reads and removes objects on a layer', () => {
    const board = createBoard()
    board.createLayers()

    //A stand in for a Stone or Markup instance, which only needs to satisfy
    //the draw and erase calls the layer makes
    const object = {draw: vi.fn(), erase: vi.fn()}
    board.add(boardLayerTypes.MARKUP, 3, 3, object)

    expect(board.has(boardLayerTypes.MARKUP, 3, 3)).toBe(true)
    expect(board.get(boardLayerTypes.MARKUP, 3, 3)).toBe(object)

    board.remove(boardLayerTypes.MARKUP, 3, 3)
    expect(board.has(boardLayerTypes.MARKUP, 3, 3)).toBe(false)
  })

  it('shrugs off operations on a layer that does not exist', () => {
    const board = createBoard()
    expect(() => board.add(boardLayerTypes.MARKUP, 3, 3, {})).not.toThrow()
    expect(board.get(boardLayerTypes.MARKUP, 3, 3)).toBe(null)
    expect(board.has(boardLayerTypes.MARKUP, 3, 3)).toBe(false)
  })
})

describe('Board colors', () => {

  it('leaves colors alone by default', () => {
    const board = createBoard()
    expect(board.getDisplayColor(stoneColors.BLACK)).toBe(stoneColors.BLACK)
  })

  it('swaps them when configured to', () => {
    const board = createBoard({swapColors: true})
    expect(board.getDisplayColor(stoneColors.BLACK)).toBe(stoneColors.WHITE)
    expect(board.getDisplayColor(stoneColors.WHITE)).toBe(stoneColors.BLACK)
  })
})
