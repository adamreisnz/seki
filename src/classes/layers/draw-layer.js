import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'
import {getPixelRatio} from '../../helpers/util.js'

/**
 * The draw layer allows free form drawing on the board
 */
export default class DrawLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.DRAW

  //Track all lines that are currently on the board
  lines = []

  /**
   * Unneeded methods
   */
  getAll() {}
  setAll() {}
  removeAll() {}
  draw() {}

  /**
   * Draw a line to given coordinates
   */
  drawLine(fromX, fromY, toX, toY, color) {

    //Get data
    const {context, theme, board} = this
    const pixelRatio = getPixelRatio()

    //Get absolute coordinates
    fromX = board.getAbsX(fromX)
    fromY = board.getAbsY(fromY)
    toX = board.getAbsX(toX)
    toY = board.getAbsY(toY)

    //Apply transformation
    fromX *= pixelRatio
    fromY *= pixelRatio
    toX *= pixelRatio
    toY *= pixelRatio

    //Set style
    context.strokeStyle = color || theme.get('draw.color')
    context.lineWidth = theme.get('draw.lineWidth') * pixelRatio
    context.lineCap = theme.get('draw.lineCap')

    //Draw line
    context.beginPath()
    context.moveTo(fromX, fromY)
    context.lineTo(toX, toY)
    context.stroke()
    context.closePath()

    //Store line
    this.lines.push([fromX, fromY, toX, toY, color])
  }

  /**
   * Erase wrapper
   */
  erase() {
    super.erase()
    this.lines = []
  }

  /**
   * Has lines check
   */
  hasLines() {
    return this.lines.length > 0
  }
}
