import {describe, it, expect, vi} from 'vitest'
import BoardStatic from './board-static.js'
import {boardLayerTypes} from '../constants/board.js'

const createBoard = () => {
  const board = new BoardStatic({size: 19, showCoordinates: false})
  board.setDrawSize(600, 600)
  board.createLayers()
  return board
}

describe('BoardStatic', () => {

  it('has a reduced set of layers', () => {
    const board = createBoard()
    expect(board.hasLayer(boardLayerTypes.STONES)).toBe(true)
    expect(board.hasLayer(boardLayerTypes.SHADOW)).toBe(true)
    expect(board.hasLayer(boardLayerTypes.HOVER)).toBe(false)
    expect(board.hasLayer(boardLayerTypes.SCORE)).toBe(false)
  })

  it('erases a single layer', () => {

    //NOTE: eraseLayer and redrawLayer used to be stubbed out, which meant the
    //shadow layer was never cleared when the position was replaced, since
    //StonesLayer#setAll erases it through eraseLayer
    const board = createBoard()
    const shadow = board.getLayer(boardLayerTypes.SHADOW)
    const spy = vi.spyOn(shadow, 'erase')

    board.eraseLayer(boardLayerTypes.SHADOW)
    expect(spy).toHaveBeenCalled()
  })

  it('redraws a single layer', () => {
    const board = createBoard()
    const grid = board.getLayer(boardLayerTypes.GRID)
    const spy = vi.spyOn(grid, 'redraw')

    board.redrawLayer(boardLayerTypes.GRID)
    expect(spy).toHaveBeenCalled()
  })

  it('shrugs off a layer it does not have', () => {
    const board = createBoard()
    expect(() => board.eraseLayer(boardLayerTypes.HOVER)).not.toThrow()
    expect(() => board.redrawLayer(boardLayerTypes.HOVER)).not.toThrow()
  })
})
