import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'
import {getPixelRatio} from '../../helpers/util.js'

/**
 * The draw layer allows free form drawing on the board
 */
export default class DrawLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.DRAW

  //Track all lines to draw
  lines = []

  /**
   * Get all lines
   */
  getAll() {
    return this.lines
  }

  /**
   * Set all lines at once
   *
   * Copies the given array, because the board passes in the live game
   * position's lines, which the position keeps mutating. If the layer held
   * that same array, addLine() would push every drawn line into the game
   * position as well, which already records it itself.
   */
  setAll(lines) {
    this.lines = lines.slice()
    this.redraw()
  }

  /**
   * Remove all (erase layer and clear lines)
   */
  removeAll() {
    this.erase()
    this.lines = []
  }

  /**
   * Draw handler
   */
  draw() {

    //Check if can draw, like the base layer draw does
    if (!this.canDraw()) {
      return
    }

    //Draw lines
    for (const line of this.lines) {
      this.drawLine(...line)
    }
  }

  /**
   * Add a line: record it, then draw it
   *
   * Recording is what makes a line survive a redraw. The layer replays this.lines
   * whenever it redraws, which happens on any resize, so a line that was only
   * painted onto the canvas is erased the next time the board changes size.
   */
  addLine(fromX, fromY, toX, toY, color) {

    //Record first, so a line added before the layer has a context or
    //dimensions is still there to be painted by the next redraw
    this.lines.push([fromX, fromY, toX, toY, color])

    //Paint it now if we can
    if (this.canDraw()) {
      this.drawLine(fromX, fromY, toX, toY, color)
    }
  }

  /**
   * Draw a line to given coordinates
   *
   * NOTE: this paints without recording, since draw() calls it for every line
   * already held. Use addLine() to add a new one.
   */
  drawLine(fromX, fromY, toX, toY, color) {

    //Get data
    const {context, theme, board} = this
    const pixelRatio = getPixelRatio()

    //Get absolute coordinates
    const absFromX = board.getAbsX(fromX)
    const absFromY = board.getAbsY(fromY)
    const absToX = board.getAbsX(toX)
    const absToY = board.getAbsY(toY)

    //Set style
    context.strokeStyle = color || theme.get('draw.color')
    context.lineWidth = theme.get('draw.lineWidth') * pixelRatio
    context.lineCap = theme.get('draw.lineCap')

    //Draw line
    context.beginPath()
    context.moveTo(absFromX, absFromY)
    context.lineTo(absToX, absToY)
    context.stroke()
    context.closePath()
  }
}
