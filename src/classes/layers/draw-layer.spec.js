import {describe, it, expect, beforeAll, afterAll} from 'vitest'
import Board from '../board.js'
import {boardLayerTypes} from '../../constants/board.js'

//A canvas context that records nothing. Painting has to actually run here,
//otherwise these specs would pass simply because nothing reached the canvas,
//which is the very thing they are checking.
const noop = () => null
const createContext = () => ({
  canvas: {clientWidth: 600, clientHeight: 600},
  strokeStyle: null,
  lineWidth: 0,
  lineCap: null,
  beginPath: noop,
  moveTo: noop,
  lineTo: noop,
  stroke: noop,
  closePath: noop,
  clearRect: noop,
})

//Only the draw layer gets a context. The others then fail their own canDraw()
//check and quietly do nothing, which keeps these specs about this layer rather
//than about how complete a fake canvas is.
const createBoard = () => {
  const board = new Board({size: 19, showCoordinates: false})
  board.setDrawSize(600, 600)
  board.createLayers()
  board.getLayer(boardLayerTypes.DRAW).setContext(createContext())
  return board
}

const linesOn = board => board.getLayer(boardLayerTypes.DRAW).getAll()

//getPixelRatio() reads window, and the library core is otherwise DOM free, so
//the suite runs in plain node
beforeAll(() => {
  globalThis.window ??= {devicePixelRatio: 1}
})
afterAll(() => {
  delete globalThis.window
})

describe('DrawLayer', () => {

  describe('recording', () => {

    it('records a line that is drawn on it', () => {
      const board = createBoard()
      board.drawLine(2, 2, 5, 5, 'orange')

      expect(linesOn(board)).toEqual([[2, 2, 5, 5, 'orange']])
    })

    it('keeps lines across a redraw, which is what a resize triggers', () => {

      //Lines used to be painted straight onto the canvas without being
      //recorded, so the next redraw erased the layer and had nothing to
      //replay. Any resize wiped whatever had been drawn.
      const board = createBoard()
      board.drawLine(2, 2, 5, 5, 'orange')
      board.drawLine(5, 5, 8, 2, 'blue')

      //A resize recomputes the draw size, which redraws every layer
      board.setDrawSize(800, 800)

      expect(linesOn(board)).toEqual([
        [2, 2, 5, 5, 'orange'],
        [5, 5, 8, 2, 'blue'],
      ])
    })

    it('does not duplicate a line each time it is redrawn', () => {

      //Guards the obvious way of fixing the above: recording inside drawLine
      //itself, which draw() calls once per line it already holds
      const board = createBoard()
      board.drawLine(2, 2, 5, 5, 'orange')

      board.redraw()
      board.redraw()

      expect(linesOn(board)).toHaveLength(1)
    })
  })

  describe('bulk changes', () => {

    it('replaces its lines when a position sets them', () => {
      const board = createBoard()
      board.drawLine(2, 2, 5, 5, 'orange')

      board.setAll(boardLayerTypes.DRAW, [[0, 0, 1, 1, 'blue']])

      expect(linesOn(board)).toEqual([[0, 0, 1, 1, 'blue']])
    })

    it('drops its lines when they are all removed', () => {
      const board = createBoard()
      board.drawLine(2, 2, 5, 5, 'orange')

      board.removeAllLines()

      expect(linesOn(board)).toEqual([])
    })

    it('does not mutate the array a position set its lines from', () => {

      //The board passes the live game position's lines array into setAll.
      //If the layer keeps that same reference, drawing pushes each line into
      //the game position too, which already records it itself — so one drawn
      //stroke would leave two entries in the position.
      const board = createBoard()
      const positionLines = [[0, 0, 1, 1, 'blue']]

      board.setAll(boardLayerTypes.DRAW, positionLines)
      board.drawLine(2, 2, 5, 5, 'orange')

      expect(positionLines).toEqual([[0, 0, 1, 1, 'blue']])
      expect(linesOn(board)).toEqual([
        [0, 0, 1, 1, 'blue'],
        [2, 2, 5, 5, 'orange'],
      ])
    })
  })

  it('falls back to the theme colour for a line drawn without one', () => {
    const board = createBoard()
    const layer = board.getLayer(boardLayerTypes.DRAW)

    layer.addLine(1, 1, 2, 2)

    expect(layer.context.strokeStyle).toBe(board.theme.get('draw.color'))
  })
})
