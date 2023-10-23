import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * This class represents the grid layer of the board, and it is
 * responsible for drawing gridlines, starpoints and coordinates
 */
export default class GridLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.GRID

  /**
   * Unneeded methods
   */
  getAll() {}
  setAll() {}
  removeAll() {}

  /**
   * Draw method
   */
  draw() {

    //Check if can draw
    if (!this.canDraw()) {
      return
    }

    //Get data
    const {board, theme, context} = this
    const {
      width, height, drawMarginHor, drawMarginVer,
      cutOffLeft, cutOffRight, cutOffTop, cutOffBottom,
    } = board

    //Determine top x and y margin
    const tx = drawMarginHor
    const ty = drawMarginVer

    //Get theme properties
    const cellSize = board.getCellSize()
    const lineWidth = theme.get('grid.lineWidth', cellSize)
    const lineCap = theme.get('grid.lineCap')
    const strokeStyle = theme.get('grid.lineColor')
    const starRadius = theme.get('grid.star.radius', cellSize)
    const starColor = theme.get('grid.star.color')
    const starPoints = theme.get('grid.star.points', width, height)
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Adjustments for cut off edges
    const dty = cutOffTop ? (cellSize * 0.25) : 0
    const dby = cutOffBottom ? (cellSize * 0.25) : 0
    const dlx = cutOffLeft ? (cellSize * 0.25) : 0
    const drx = cutOffRight ? (cellSize * 0.25) : 0

    //Translate canvas
    this.prepareContext(canvasTranslate)

    //Configure context
    context.beginPath()
    context.lineWidth = lineWidth
    context.lineCap = lineCap
    context.strokeStyle = strokeStyle

    //Draw vertical lines
    for (let i = board.xLeft; i <= board.xRight; i++) {
      const x = board.getAbsX(i)
      context.moveTo(x, ty - dty)
      context.lineTo(x, ty + dby + board.gridDrawHeight)
    }

    //Draw horizontal lines
    for (let i = board.yTop; i <= board.yBottom; i++) {
      const y = board.getAbsY(i)
      context.moveTo(tx - dlx, y)
      context.lineTo(tx + drx + board.gridDrawWidth, y)
    }

    //Draw grid lines
    context.stroke()

    //Star points enabled and defined?
    if (board.getConfig('showStarPoints')) {
      for (let i = 0; i < starPoints.length; i++) {
        this.drawStarPoint(
          starPoints[i].x, starPoints[i].y, starRadius, starColor,
        )
      }
    }

    //Restore context
    this.restoreContext(canvasTranslate)
  }

  /**
   * Helper for drawing starpoints
   */
  drawStarPoint(x, y, starRadius, starColor) {

    //Get board and context
    const {board, context} = this

    //Don't draw if it falls outsize of the board grid
    if (!board.isOnBoard(x, y)) {
      return
    }

    //Get absolute coordinates and star point radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)

    //Draw star point
    context.beginPath()
    context.fillStyle = starColor
    context.arc(absX, absY, starRadius, 0, 2 * Math.PI, true)
    context.fill()
  }

  /**
   * Erase a square cell area on the grid
   */
  eraseCell(x, y, radius) {

    //Get board and context
    const {board, theme, context} = this

    //Not on board
    if (!board.isOnBoard(x, y)) {
      return
    }

    //Get absolute coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const cellSize = board.getCellSize()

    //Determine radius if not given
    if (!radius) {
      radius = theme.get('grid.radius', cellSize)
    }

    //Get theme properties
    const lineWidth = theme.get('grid.lineWidth', cellSize)
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Prepare context
    this.prepareContext(canvasTranslate)

    //Clear rectangle
    context.clearRect(absX - radius, absY - radius, 2 * radius, 2 * radius)

    //Restore context
    this.restoreContext(canvasTranslate)
  }

  /**
   * Redraw a square cell area on the grid
   */
  redrawCell(x, y) {

    //Get board and context
    const {board, theme, context} = this

    //Not on board
    if (!board.isOnBoard(x, y)) {
      return
    }

    //Get absolute coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const cellSize = board.getCellSize()
    const radius = theme.get('grid.radius', cellSize)

    //Get theme properties
    const lineWidth = theme.get('grid.lineWidth', cellSize)
    const strokeStyle = theme.get('grid.lineColor')
    const starRadius = theme.get('grid.star.radius', cellSize)
    const starColor = theme.get('grid.star.color')
    const canvasTranslate = theme.canvasTranslate(lineWidth)
    const starPoints = theme.get('grid.star.points', board.width, board.height)

    //Adjustments for cut off edges
    const {cutOffLeft, cutOffRight, cutOffTop, cutOffBottom} = board
    const dlx = cutOffLeft ? (cellSize * 0.25) : 0
    const drx = cutOffRight ? (cellSize * 0.25) : 0
    const dty = cutOffTop ? (cellSize * 0.25) : 0
    const dby = cutOffBottom ? (cellSize * 0.25) : 0

    //Determine draw coordinates
    const x1 = (x === board.xLeft) ? absX - dlx : absX - radius
    const x2 = (x === board.xRight) ? absX + drx : absX + radius
    const y1 = (y === board.yTop) ? absY - dty : absY - radius
    const y2 = (y === board.yBottom) ? absY + dby : absY + radius

    //Prepare context
    this.prepareContext(canvasTranslate)

    //Configure context
    context.beginPath()
    context.lineWidth = lineWidth
    context.strokeStyle = strokeStyle

    //Patch up grid lines
    context.moveTo(x1, absY)
    context.lineTo(x2, absY)
    context.moveTo(absX, y1)
    context.lineTo(absX, y2)
    context.stroke()

    //Check if we need to draw a star point here
    if (board.getConfig('showStarPoints')) {
      for (const i in starPoints) {
        if (starPoints[i].x === x && starPoints[i].y === y) {
          this.drawStarPoint(x, y, starRadius, starColor)
        }
      }
    }

    //Restore context
    this.restoreContext(canvasTranslate)
  }
}
