import BoardLayer from '../board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * This class represents the grid layer of the board, and it is
 * responsible for drawing gridlines, starpoints and coordinates
 */
export default class GridLayer extends BoardLayer {

  /**
   * Constructor
   */
  constructor(board, theme) {

    //Parent constructor
    super(board, theme)

    //Set type
    this.type = boardLayerTypes.GRID
  }

  /**************************************************************************
   * Object handling
   ***/

  /**
   * Get all has nothing to return
   */
  getAll() {
    return null
  }

  /**
   * Set all has nothing to set
   */
  setAll() {
    return
  }

  /**
   * Remove all has nothing to remove
   */
  removeAll() {
    return
  }

  /*****************************************************************************
   * Drawing
   ***/

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
    const {width, height, drawMarginHor, drawMarginVer} = board

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

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)

    //Configure context
    context.beginPath()
    context.lineWidth = lineWidth
    context.lineCap = lineCap
    context.strokeStyle = strokeStyle

    //Helper vars
    let i, x, y

    //Draw vertical lines
    for (i = board.grid.xLeft; i <= board.grid.xRight; i++) {
      x = board.getAbsX(i)
      context.moveTo(x, ty)
      context.lineTo(x, ty + board.gridDrawHeight)
    }

    //Draw horizontal lines
    for (i = board.grid.yTop; i <= board.grid.yBot; i++) {
      y = board.getAbsY(i)
      context.moveTo(tx, y)
      context.lineTo(tx + board.gridDrawWidth, y)
    }

    //Draw grid lines
    context.stroke()

    //Star points defined?
    for (i = 0; i < starPoints.length; i++) {
      this.drawStarPoint(
        starPoints[i].x, starPoints[i].y, starRadius, starColor,
      )
    }

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }

  /**
   * Helper for drawing starpoints
   */
  drawStarPoint(gridX, gridY, starRadius, starColor) {

    //Get board and context
    const {board, context} = this
    const {grid} = board

    //Don't draw if it falls outsize of the board grid
    if (gridX < grid.xLeft || gridX > grid.xRight) {
      return
    }
    if (gridY < grid.yTop || gridY > grid.yBot) {
      return
    }

    //Get absolute coordinates and star point radius
    const x = board.getAbsX(gridX)
    const y = board.getAbsY(gridY)

    //Draw star point
    context.beginPath()
    context.fillStyle = starColor
    context.arc(x, y, starRadius, 0, 2 * Math.PI, true)
    context.fill()
  }

  /**
   * Clear a square cell area on the grid
   */
  clearCell(gridX, gridY) {

    //Get board and context
    const {board, theme, context} = this

    //Get absolute coordinates and stone radius
    const absX = board.getAbsX(gridX)
    const absY = board.getAbsY(gridY)
    const cellSize = board.getCellSize()
    const radius = theme.get('stone.radius', cellSize)

    //Get theme properties
    const lineWidth = theme.get('grid.lineWidth', cellSize)
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)

    //Clear rectangle
    context.clearRect(absX - radius, absY - radius, 2 * radius, 2 * radius)

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }

  /**
   * Redraw a square cell area on the grid
   */
  redrawCell(gridX, gridY) {

    //Get board and context
    const {board, theme, context} = this

    //Get absolute coordinates and stone radius
    const absX = board.getAbsX(gridX)
    const absY = board.getAbsY(gridY)
    const cellSize = board.getCellSize()
    const radius = theme.get('stone.radius', cellSize)

    //Get theme properties
    const lineWidth = theme.get('grid.lineWidth', cellSize)
    const strokeStyle = theme.get('grid.lineColor')
    const starRadius = theme.get('grid.star.radius', cellSize)
    const starColor = theme.get('grid.star.color')
    const canvasTranslate = theme.canvasTranslate(lineWidth)
    const starPoints = theme.get('grid.star.points', board.width, board.height)

    //Determine draw coordinates
    const x1 = (gridX === 0) ? absX : absX - radius
    const x2 = (gridX === board.width - 1) ? absX : absX + radius
    const y1 = (gridY === 0) ? absY : absY - radius
    const y2 = (gridY === board.height - 1) ? absY : absY + radius

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)

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
    for (const i in starPoints) {
      if (starPoints[i].x === gridX && starPoints[i].y === gridY) {
        this.drawStarPoint(gridX, gridY, starRadius, starColor)
      }
    }

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }
}
