import Stone from './stone.js'
import {stoneStyles} from '../../constants/stone.js'

/**
 * Mono stone class
 */
export default class StoneMono extends Stone {

  //Style
  style = stoneStyles.MONO

  //Other theme props
  lineWidth = 1
  lineColor

  /**
   * Load additional properties for this stone type
   */
  loadProperties() {

    //Load parent properties
    const args = super.loadProperties()

    //Load additional properties
    this.loadThemeProp('lineWidth', ...args)
    this.loadThemeProp('lineColor', ...args)

    //Pass on args
    return args
  }

  /**
   * Draw mono stones
   */
  draw(context, x, y) {

    //Load properties
    this.loadProperties()

    //Get data
    const {radius, color, lineWidth, lineColor} = this
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Prepare context
    this.prepareContext(context)

    //Configure context
    context.fillStyle = color

    //Draw stone
    context.beginPath()
    context.arc(
      absX,
      absY,
      Math.max(0, radius - lineWidth),
      0,
      2 * Math.PI,
      true,
    )
    context.fill()

    //Configure context
    context.lineWidth = lineWidth
    context.strokeStyle = lineColor

    //Draw outline
    context.stroke()

    //Restore context
    this.restoreContext(context)
  }
}
