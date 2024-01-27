import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'
import {getPixelRatio} from '../../helpers/util.js'

/**
 * The draw layer allows free form drawing on the board
 */
export default class DrawLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.DRAW

  //Check if we've drawn anything
  hasDrawn = false

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
    const {context, theme} = this
    const pixelRatio = getPixelRatio()

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

    //Flag as having drawn
    this.hasDrawn = true
  }

  /**
   * Erase wrapper
   */
  erase() {
    super.erase()
    this.hasDrawn = false
  }
}
