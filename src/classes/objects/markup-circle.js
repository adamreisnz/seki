import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Circle markup
 */
export default class MarkupCircle extends Markup {

  //Type
  type = markupTypes.CIRCLE

  //Additional theme properties
  lineDash

  /**
   * Load additional properties for this markup type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)

    //Load additional properties
    this.loadThemeProp('lineDash', ...args)

    //Pass on args
    return args
  }

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.radius * 1.4
  }

  /**
   * Get parsed line dash
   */
  getLineDash() {
    const {lineDash} = this
    if (Array.isArray(lineDash)) {
      return lineDash
    }
    return lineDash ? lineDash.split(',') : null
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Parent draw
    super.draw(context, x, y)

    //Get data
    const {radius, color, lineWidth} = this
    const lineDash = this.getLineDash()
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Prepare context
    this.prepareContext(context)

    //Configure context
    context.setLineDash(lineDash || [])
    context.strokeStyle = color
    context.lineWidth = lineWidth

    //Draw element
    context.beginPath()
    context.arc(absX, absY, radius, 0, 2 * Math.PI, true)
    context.stroke()

    //Reset line dash
    context.setLineDash([])

    //Restore context
    this.restoreContext(context)
  }
}
