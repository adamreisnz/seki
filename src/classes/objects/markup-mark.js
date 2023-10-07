import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Mark markup (cross)
 */
export default class MarkupMark extends Markup {

  //Type
  type = markupTypes.MARK

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.getRadius()
  }

  /**
   * Draw
   */
  draw(context, x, y) {

    //Parent draw
    super.draw(context, x, y)

    //Get data
    const {board, theme} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const radius = this.getRadius()
    const color = this.getColor(x, y)

    //Get theme variables
    const lineWidth = this.getLineWidth()
    const lineCap = this.getLineCap()
    const canvasTranslate = theme.canvasTranslate(lineWidth)

    //Determine delta
    const d = Math.round(radius * Math.cos(Math.PI / 4))

    //Prepare context
    this.prepareContext(context, canvasTranslate)

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
    this.restoreContext(context, canvasTranslate)
  }
}
