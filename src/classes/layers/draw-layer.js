import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'
import {getPixelRatio} from '../../helpers/util.js'

/**
 * The draw layer allows free form drawing on the board
 */
export default class DrawLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.DRAW

  //Last X and Y position
  lastX = null
  lastY = null

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
  drawLine(x, y) {

    //Get data
    const {context, theme, lastX, lastY} = this
    const pixelRatio = getPixelRatio()

    //Apply transformation
    x *= pixelRatio
    y *= pixelRatio

    //Set new last position
    this.lastX = x
    this.lastY = y

    //Must have last coordinates
    if (lastX === null || lastY === null) {
      return
    }

    //Set style
    context.strokeStyle = theme.get('draw.color')
    context.lineWidth = theme.get('draw.lineWidth') * pixelRatio
    context.lineCap = theme.get('draw.lineCap')

    //Draw line
    context.beginPath()
    context.moveTo(lastX, lastY)
    context.lineTo(x, y)
    context.stroke()
    context.closePath()
  }

  /**
   * Stop drawing
   */
  stopDrawing() {
    this.lastX = null
    this.lastY = null
  }
}
