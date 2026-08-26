import {describe, it, expect} from 'vitest'
import Board from '../board.js'
import Game from '../game.js'
import StoneFactory from '../stone-factory.js'
import MarkupFactory from '../markup-factory.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'

const createBoard = () => {
  const board = new Board({size: 19, showCoordinates: false})
  board.setDrawSize(600, 600)
  board.createLayers()
  return board
}

const stone = board => StoneFactory.create('mono', stoneColors.BLACK, board)
const markup = board => MarkupFactory.create(markupTypes.CIRCLE, board)

describe('HoverLayer', () => {

  it('displaces what is underneath it', () => {
    const board = createBoard()
    board.add(boardLayerTypes.STONES, 3, 3, stone(board))

    board.setHoverCell(3, 3, stone(board))
    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(false)
  })

  it('puts it back when the hover is cleared', () => {
    const board = createBoard()
    const original = stone(board)
    board.add(boardLayerTypes.STONES, 3, 3, original)

    board.setHoverCell(3, 3, stone(board))
    board.clearHoverCell(3, 3)

    expect(board.get(boardLayerTypes.STONES, 3, 3)).toBe(original)
  })

  it('only queues the first object displaced on a cell', () => {

    //Hovering over the same cell repeatedly used to queue the object for
    //restoration once per hover, so it came back more than once
    const board = createBoard()
    const original = stone(board)
    board.add(boardLayerTypes.STONES, 3, 3, original)

    const hover = board.getLayer(boardLayerTypes.HOVER)
    board.setHoverCell(3, 3, stone(board))
    board.setHoverCell(3, 3, stone(board))

    expect(hover.restore.size).toBe(1)
  })

  it('rejects an object it cannot place on a layer', () => {
    const board = createBoard()
    const hover = board.getLayer(boardLayerTypes.HOVER)
    expect(() => hover.add(3, 3, {})).toThrow('Invalid hover object')
  })

  it('ignores coordinates off the grid', () => {
    const board = createBoard()
    const hover = board.getLayer(boardLayerTypes.HOVER)
    expect(() => hover.add(99, 99, stone(board))).not.toThrow()
    expect(hover.has(99, 99)).toBe(false)
  })

  it('handles markup as well as stones', () => {
    const board = createBoard()
    const original = markup(board)
    board.add(boardLayerTypes.MARKUP, 3, 3, original)

    board.setHoverCell(3, 3, markup(board))
    expect(board.has(boardLayerTypes.MARKUP, 3, 3)).toBe(false)

    board.clearHoverLayer()
    expect(board.get(boardLayerTypes.MARKUP, 3, 3)).toBe(original)
  })
})

describe('Hover state across a position update', () => {

  it('does not restore a displaced stone on top of the new position', () => {

    //A stone hidden under the hover belongs to the position being replaced.
    //Restoring it afterwards puts a stone back on a board that no longer has
    //one there.
    const board = createBoard()
    const game = new Game()
    game.playMove(3, 3)

    board.updatePosition(game.getPosition())
    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(true)

    //Hover over the stone, then navigate back so the stone is gone
    board.setHoverCell(3, 3, stone(board))
    game.goToPreviousPosition()
    board.updatePosition(game.getPosition())

    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(false)
  })

  it('clears the hover objects themselves on a position update', () => {
    const board = createBoard()
    const game = new Game()

    board.setHoverCell(3, 3, stone(board))
    board.updatePosition(game.getPosition())

    expect(board.has(boardLayerTypes.HOVER, 3, 3)).toBe(false)
  })

  it('does nothing when asked to remove a cell it never had', () => {
    const board = createBoard()
    board.add(boardLayerTypes.STONES, 3, 3, stone(board))

    board.clearHoverCell(3, 3)

    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(true)
  })

  it('leaves a cell with nothing under it alone when cleared', () => {
    const board = createBoard()

    board.setHoverCell(3, 3, stone(board))
    board.clearHoverCell(3, 3)

    expect(board.has(boardLayerTypes.HOVER, 3, 3)).toBe(false)
    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(false)
  })

  it('restores every displaced object when the whole layer is cleared', () => {

    //Dragging across the board displaces a stone on each cell it passes, and
    //all of them have to come back, not just the last one
    const board = createBoard()
    const first = stone(board)
    const second = stone(board)

    board.add(boardLayerTypes.STONES, 3, 3, first)
    board.add(boardLayerTypes.STONES, 4, 4, second)
    board.setHoverCell(3, 3, stone(board))
    board.setHoverCell(4, 4, stone(board))

    board.clearHoverLayer()

    expect(board.get(boardLayerTypes.STONES, 3, 3)).toBe(first)
    expect(board.get(boardLayerTypes.STONES, 4, 4)).toBe(second)
  })

  it('has nothing left to restore after clearing the layer', () => {

    //A second clear must not put a stale stone back on a point that has
    //since been played on
    const board = createBoard()
    board.add(boardLayerTypes.STONES, 3, 3, stone(board))

    board.setHoverCell(3, 3, stone(board))
    board.clearHoverLayer()
    board.remove(boardLayerTypes.STONES, 3, 3)
    board.clearHoverLayer()

    expect(board.has(boardLayerTypes.STONES, 3, 3)).toBe(false)
  })

  it('takes an array of objects, keyed off the first of them', () => {

    //A hover stone comes as a shadow and the stone itself, and it is the
    //shadow the type is worked out from
    const board = createBoard()
    const hover = [stone(board), stone(board)]

    board.setHoverCell(3, 3, hover)

    expect(board.get(boardLayerTypes.HOVER, 3, 3)).toBe(hover)
  })

  it('reports nothing queued for a cell it has not displaced anything on', () => {
    const board = createBoard()
    const layer = board.getLayer(boardLayerTypes.HOVER)

    expect(layer.hasRestoration(3, 3, boardLayerTypes.STONES)).toBe(false)
  })
})
