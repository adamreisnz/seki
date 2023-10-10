import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Mark markup (cross)
 */
export default class MarkupMark extends Markup {

  //Type
  type = markupTypes.MARK

  //Additional properties
  lineCap

  /**
   * Load additional properties for this stone type
   */
  loadProperties(x, y) {

    //Load parent properties
    const args = super.loadProperties(x, y)

    //Load additional properties
    this.loadThemeProp('lineCap', ...args)

    //Pass on args
    return args
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Parent draw
    super.draw(context, x, y)

    //Get data
    const {radius, color, lineWidth, lineCap} = this
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Determine delta
    const d = Math.round(radius * Math.cos(Math.PI / 4))

    //Prepare context
    this.prepareContext(context)

    //Configure context
    context.strokeStyle = color
    context.lineWidth = lineWidth
    context.lineCap = lineCap

    //Draw element
    context.beginPath()
    context.moveTo(absX - d, absY - d)
    context.lineTo(absX + d, absY + d)
    context.moveTo(absX + d, absY - d)
    context.lineTo(absX - d, absY + d)
    context.stroke()

    //Restore context
    this.restoreContext(context)
  }
}
