import Markup from './markup.js'
import {markupTypes} from '../../constants/markup.js'

/**
 * Label markup
 */
export default class MarkupLabel extends Markup {

  //Type
  type = markupTypes.LABEL

  /**
   * Get grid erase radius
   */
  getGridEraseRadius() {
    return this.getRadius() * 0.8
  }

  /**
   * Get text
   */
  getText() {
    return this.text || ''
  }

  /**
   * Determine font size
   */
  determineFontSize(text, radius) {
    const len = String(text).length
    if (len === 1) {
      return Math.round(radius * 1.5)
    }
    else if (len === 2) {
      return Math.round(radius * 1.2)
    }
    return radius
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
    const text = this.getText()

    //Get theme variables
    const font = this.getFont()
    const fontSize = this.determineFontSize(text, radius)
    const canvasTranslate = theme.canvasTranslate()

    //Prepare context
    this.prepareContext(context, canvasTranslate)

    //Configure context
    context.fillStyle = color
    context.textBaseline = 'middle'
    context.textAlign = 'center'
    context.font = `${fontSize}px ${font}`

    //Draw element
    context.beginPath()
    context.fillText(String(text), absX, absY, 2 * radius)

    //Restore context
    this.restoreContext(context, canvasTranslate)
  }
}
