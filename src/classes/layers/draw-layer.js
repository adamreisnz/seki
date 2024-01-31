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
   */
  setAll(lines) {
    this.lines = lines
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
    for (const line of this.lines) {
      this.drawLine(...line)
    }
  }

  /**
   * Draw a line to given coordinates
   */
  drawLine(fromX, fromY, toX, toY, color) {

    //Get data
    const {context, theme, board} = this
    const pixelRatio = getPixelRatio()

    //Get absolute coordinates
    const absFromX = board.getAbsX(fromX) * pixelRatio
    const absFromY = board.getAbsY(fromY) * pixelRatio
    const absToX = board.getAbsX(toX) * pixelRatio
    const absToY = board.getAbsY(toY) * pixelRatio

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
